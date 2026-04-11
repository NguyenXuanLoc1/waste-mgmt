require('dotenv').config();
console.log("GEMINI KEY:", process.env.GEMINI_API_KEY);
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const authRoutes = require('./routes/auth');
const citizenRoutes = require('./routes/citizen');
const collectorRoutes = require('./routes/collector');
const adminRoutes = require('./routes/admin');
const eventRoutes = require('./routes/event');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/citizen', citizenRoutes);
app.use('/api/collector', collectorRoutes);
app.use('/api/admin', adminRoutes);

// Đã gộp các route từ cả 2 nhánh (payment, fee, events)
app.use('/api/payment', require('./routes/payment'));
app.use('/api/fee', require('./routes/fee'));
app.use('/api/events', eventRoutes);

app.get('/', (req, res) => res.json({ message: 'Waste Management API running' }));

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(process.env.PORT, () =>
      console.log(`🚀 Server running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error('MongoDB error:', err));