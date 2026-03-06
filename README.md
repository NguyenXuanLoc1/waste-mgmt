# ♻️ WasteMgmt — MVP Mobile Application

A full-stack waste management and reporting system with three user roles:
**Citizen**, **Garbage Collector**, and **Admin**.

---

## Project Structure

```
waste-mgmt/
├── backend/                  # Node.js + Express API
│   ├── models/
│   │   ├── User.js
│   │   ├── WasteReport.js
│   │   └── CollectionRecord.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── citizen.js
│   │   ├── collector.js
│   │   └── admin.js
│   ├── middleware/
│   │   ├── auth.js           # JWT middleware
│   │   └── upload.js         # Multer file upload
│   ├── uploads/              # Local photo storage (auto-created)
│   ├── .env
│   ├── package.json
│   └── server.js
│
└── mobile-app/               # React Native (Expo)
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.js
    │   ├── services/
    │   │   └── api.js         # Axios API client
    │   ├── components/
    │   │   └── UI.js          # Shared UI components
    │   └── screens/
    │       ├── auth/
    │       │   ├── LoginScreen.js
    │       │   └── RegisterScreen.js
    │       ├── citizen/
    │       │   ├── CitizenDashboard.js
    │       │   ├── SubmitReportScreen.js
    │       │   └── MyReportsScreen.js
    │       ├── collector/
    │       │   └── CollectorDashboard.js
    │       └── admin/
    │           ├── AdminDashboard.js
    │           ├── AdminReports.js
    │           └── AdminCitizens.js
    ├── App.js
    ├── app.json
    └── package.json
```

---

## Prerequisites

- **Node.js** v18+ — https://nodejs.org
- **MongoDB** running locally — https://www.mongodb.com/try/download/community
- **Expo CLI** — `npm install -g expo-cli`
- **Expo Go app** on your phone (iOS or Android) — from App Store / Play Store

---

## 🚀 Setup & Run

### Step 1 — Start MongoDB

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Ubuntu/Linux
sudo systemctl start mongod

# Windows — start via MongoDB Compass or Services panel
```

### Step 2 — Backend

```bash
cd waste-mgmt/backend
npm install
```

Create `uploads/` directory:
```bash
mkdir -p uploads
```

Start the server:
```bash
npm run dev
# or: npm start
```

You should see:
```
✅ MongoDB connected
🚀 Server running on port 5000
```

### Step 3 — Seed Demo Users

Once the backend is running, seed admin & collector accounts by calling:

```bash
curl -X POST http://localhost:5000/api/auth/seed
```

Or open it in the browser: `http://localhost:5000/api/auth/seed` (POST).

**Demo credentials:**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@waste.com | admin123 |
| Collector | collector@waste.com | collector123 |
| Citizen | Register yourself via the app | — |

### Step 4 — Configure Mobile App IP

> ⚠️ **Critical:** The mobile app must reach your backend over your local network.

Find your machine's local IP:
- **macOS:** `ifconfig | grep "inet "` → look for `192.168.x.x`
- **Windows:** `ipconfig` → look for IPv4 Address
- **Linux:** `ip addr show` → look for `192.168.x.x`

Then edit `mobile-app/src/services/api.js`:

```js
// Change this line:
export const BASE_URL = 'http://192.168.1.100:5000/api';
//                                ^^^^^^^^^^^
//                         Replace with your actual IP
```

### Step 5 — Mobile App

```bash
cd waste-mgmt/mobile-app
npm install
npx expo start
```

- A QR code will appear in the terminal
- Scan it with **Expo Go** on your phone
- Both devices must be on the **same Wi-Fi network**

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register as citizen |
| POST | `/api/auth/login` | Login (all roles) |
| POST | `/api/auth/seed` | Create demo admin + collector |

### Citizen (requires citizen JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/citizen/report` | Submit waste report (multipart/form-data) |
| GET | `/api/citizen/my-reports` | Get my report history |
| GET | `/api/citizen/my-score` | Get score, fee, and stats |

### Collector (requires collector JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/collector/reports` | Get pending/verified reports |
| POST | `/api/collector/verify-report` | Mark report as verified |
| POST | `/api/collector/submit-weight` | Submit weights + complete report |

### Admin (requires admin JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/all-reports` | List all reports with filters |
| GET | `/api/admin/dashboard-stats` | Aggregated stats |
| POST | `/api/admin/analyze-report` | Run mock AI analysis |
| POST | `/api/admin/approve-report` | Approve report (+10 citizen pts) |
| POST | `/api/admin/reject-report` | Reject report (-20 citizen pts) |
| POST | `/api/admin/adjust-score` | Manually adjust citizen score |
| GET | `/api/admin/citizens` | List all citizens |
| POST | `/api/admin/calculate-fee` | Calculate citizen fee |

---

## Scoring & Fee Logic

### Score Events
| Event | Points |
|-------|--------|
| Report approved by admin | +10 |
| Report collected by collector | +5 |
| Report rejected (fake/invalid) | -20 |
| Manual admin adjustment | ± custom |

### Fee Calculation
```
Base rates:
  Organic:    $1.00 / kg
  Recyclable: $0.50 / kg
  Hazardous:  $3.00 / kg

Discount (for high scorers):
  Every 10 pts above 100 = 2% discount (max 30%)

Final Fee = Base Fee × (1 - discount)
```

### Mock AI Analysis
The AI module (at `/api/admin/analyze-report`) simulates:
- Random waste category detection
- 60–100% confidence score
- 15% chance of flagging a report as fake
- Category mismatch detection

---

## Features by Role

### 🏘️ Citizen
- Register / Login
- Submit waste reports with camera or gallery photo
- Auto-capture GPS location
- Select waste category (organic / recyclable / hazardous / other)
- View behavior score with visual meter
- View total collection fee
- Track report history and status

### 🚛 Collector
- Login with provided credentials
- See all pending/verified reports
- Verify a pending report
- Enter organic, recyclable, and hazardous weights
- Mark report as completed (triggers fee + citizen scoring)

### 🛡️ Admin
- Overview dashboard with live stats
- View all reports with status filters
- Run mock AI analysis on any report
- Approve reports (rewards citizen +10 pts)
- Reject reports with reason (penalises citizen -20 pts)
- Adjust citizen scores manually
- Calculate detailed waste collection fees

---

## Extending the MVP

| Feature | How to add |
|---------|-----------|
| Real AI analysis | Replace `mockAiAnalysis()` in `admin.js` with OpenAI Vision API call |
| Push notifications | Add FCM token to User model; use `firebase-admin` to push to collectors |
| Maps view | Add `react-native-maps` to the collector screen |
| Cloud photo storage | Replace Multer with AWS S3 using `@aws-sdk/client-s3` |
| Monthly fee billing | Add a cron job using `node-cron` to auto-calculate at month end |
