const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const axios   = require('axios');
const Fee     = require('../models/Fee');
const Payment = require('../models/Payment');
const { authenticate } = require('../middleware/auth');

const APP_ID     = process.env.ZALOPAY_APP_ID;
const KEY1       = process.env.ZALOPAY_KEY1;
const KEY2       = process.env.ZALOPAY_KEY2;
const CREATE_URL = 'https://sb-openapi.zalopay.vn/v2/create';
const QUERY_URL  = 'https://sb-openapi.zalopay.vn/v2/query';   // ← đúng cho app_id 2553

function yyMMdd_id(suffix) {
  const d  = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}_${suffix}`;
}

// ─────────────────────────────────────────────
// POST /api/payment/create
// ─────────────────────────────────────────────
router.post('/create', authenticate, async (req, res) => {
  try {
    const { reportId } = req.body;
    if (!reportId) return res.status(400).json({ message: 'reportId is required' });

    const fee = await Fee.findOne({ reportId, status: 'unpaid' });
    if (!fee) return res.status(404).json({ message: 'No unpaid fee found for this report' });

    const app_trans_id = yyMMdd_id(Date.now().toString().slice(-6));
    const app_time     = Date.now();
    const amount       = Math.round(fee.amountToPay * 25000);

    const embed_data = JSON.stringify({
      redirecturl: 'http://localhost:8081',
      reportId:    reportId.toString(),
    });
    const item = JSON.stringify([{
      itemid: 'wastefee', itename: 'Waste Collection Fee',
      itemprice: amount, itemquantity: 1,
    }]);

    const macRaw = [APP_ID, app_trans_id, fee.citizenId.toString(), amount, app_time, embed_data, item].join('|');
    const mac    = crypto.createHmac('sha256', KEY1).update(macRaw).digest('hex');

    const order = {
      app_id:      APP_ID,
      app_trans_id,
      app_user:    fee.citizenId.toString(),
      app_time,
      amount,
      item,
      description: `Phi thu gom rac ${app_trans_id}`,
      embed_data,
      callback_url: `${process.env.SERVER_URL}/api/payment/callback`,
      mac,
    };

    const { data: zpRes } = await axios.post(CREATE_URL, null, {
      params:  order,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    console.log('ZaloPay create response:', JSON.stringify(zpRes));

    if (zpRes.return_code !== 1) {
      return res.status(502).json({ message: 'ZaloPay error', detail: zpRes.return_message, sub: zpRes.sub_return_message });
    }

    await Payment.findOneAndUpdate(
      { reportId },
      { reportId, citizenId: fee.citizenId, transactionId: app_trans_id, amountPaid: amount, status: 'pending' },
      { upsert: true, new: true }
    );

    // Dùng order_url (qcgateway) cho web sandbox — KHÔNG dùng cashier_order_url (onelink)
    res.json({ order_url: zpRes.order_url, app_trans_id });
  } catch (err) {
    console.error('payment/create error:', err.message);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/payment/callback  ← ZaloPay server gọi
// ─────────────────────────────────────────────
router.post('/callback', async (req, res) => {
  console.log('=== CALLBACK HIT ===', req.body);
  try {
    const { data: dataStr, mac: receivedMac } = req.body;
    const expectedMac = crypto.createHmac('sha256', KEY2).update(dataStr).digest('hex');
    if (expectedMac !== receivedMac) {
      console.log('MAC mismatch');
      return res.json({ return_code: -1, return_message: 'MAC invalid' });
    }
    const parsed       = JSON.parse(dataStr);
    const embedData    = JSON.parse(parsed.embed_data);
    const { reportId } = embedData;
    await markPaid(reportId, String(parsed.zp_trans_id), parsed.amount);
    res.json({ return_code: 1, return_message: 'Success' });
  } catch (err) {
    console.error('callback error:', err);
    res.json({ return_code: 0, return_message: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/payment/check-status/:appTransId
// Frontend polling — query ZaloPay v2 đúng endpoint
// ─────────────────────────────────────────────
router.get('/check-status/:appTransId', authenticate, async (req, res) => {
  const { appTransId } = req.params;
  console.log(`🔍 check-status: ${appTransId}`);

  try {
    const payment = await Payment.findOne({ transactionId: appTransId });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    // Đã success trong DB → trả luôn
    if (payment.status === 'success') {
      return res.json({ success: true, paid: true });
    }

    // ── Query ZaloPay v2 — MAC format: app_id|app_trans_id|key1 ──────────
    const macRaw = `${APP_ID}|${appTransId}|${KEY1}`;
    const mac    = crypto.createHmac('sha256', KEY1).update(macRaw).digest('hex');

    const { data: zpData } = await axios.post(QUERY_URL, null, {
      params:  { app_id: APP_ID, app_trans_id: appTransId, mac },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    console.log(`ZaloPay query response for ${appTransId}:`, JSON.stringify(zpData));

    // return_code 1 = thành công
    if (zpData.return_code === 1) {
      const zpTransId = String(zpData.zp_trans_id || appTransId);
      await markPaid(payment.reportId.toString(), zpTransId, payment.amountPaid);
      return res.json({ success: true, paid: true });
    }

    // return_code 2 = thất bại, 3 = chờ xử lý
    res.json({ success: false, paid: false, return_code: zpData.return_code });
  } catch (err) {
    console.error('check-status error:', err.message);
    res.status(500).json({ success: false, paid: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// Helper: update fee + payment → paid
// ─────────────────────────────────────────────
async function markPaid(reportId, zp_trans_id, amountPaid) {
  if (!reportId) { console.log('markPaid: no reportId'); return; }

  const fee = await Fee.findOne({ reportId });
  if (!fee) { console.log('markPaid: fee not found for', reportId); return; }
  if (fee.status === 'paid') { console.log('markPaid: already paid'); return; }

  fee.status = 'paid';
  await fee.save();
  console.log('✅ fee.status = paid');

  await Payment.findOneAndUpdate(
    { reportId },
    {
      transactionId: zp_trans_id,
      ...(amountPaid && { amountPaid }),
      status:  'success',
      paidAt:  new Date(),
    },
    { upsert: true }
  );
  console.log('✅ payment.status = success — reportId:', reportId);
}

module.exports = router;