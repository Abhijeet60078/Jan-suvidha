# Jan Suvidha (जन सुविधा) — UP State Government Grievance & Complaint Redressal Portal

A full-stack MERN project. Citizens file complaints against any UP government
department (Police, Electricity, Water, Municipal, Health, PWD, Education,
Revenue, Transport) online instead of visiting an office in person. Every
complaint gets an automatic SLA deadline based on severity. If an officer
misses the deadline, an **accountability engine** automatically lowers their
performance rating, which in turn affects their salary-increment and
promotion eligibility — visible to admins on a leaderboard. The whole UI is
bilingual (Hindi / English) for rural and urban users.

## Tech Stack
- **Frontend:** React 18 (Vite), Tailwind CSS, react-i18next, react-router-dom, recharts, axios
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT auth, node-cron, socket.io
- **Roles:** citizen, officer, departmentHead, admin

## Project Structure
```
jan-suvidha/
├── backend/         Express API, MongoDB models, SLA cron job, accountability engine
└── frontend/        React app (Vite + Tailwind)
```

## 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env     # then edit .env: set MONGO_URI and JWT_SECRET
npm run seed              # seeds 9 UP departments + one default admin account
npm run dev                # starts API on http://localhost:5000
```



To add officers or department heads, log in as admin and call:
`POST /api/admin/staff` is not exposed — use `POST /api/auth/staff`
(admin-only, requires JWT) with `{ name, phone, password, role, department, district }`.

### OTP and evidence uploads

OTP login is available at `POST /api/auth/otp/request` with
`{ phone, purpose: "login" }`, followed by `POST /api/auth/otp/login` with
`{ phone, code }`. Phone verification and password reset use purposes
`verify_phone` and `reset_password`; the endpoints are
`POST /api/auth/otp/verify-phone` and `POST /api/auth/password/reset`.
In development, the OTP is logged and returned as `devCode`. Add the Twilio
variables from `.env.example` for real SMS delivery.

Complaint filing and officer resolution updates accept up to three JPG, PNG,
WEBP, MP4, WEBM, or PDF attachments (20 MB each). Existing uploads use
Cloudinary when configured and local `backend/uploads/complaints` otherwise.
Additional evidence can be added with `POST /api/complaints/:id/evidence`
using multipart field `attachments`; citizens can add evidence to their own
complaints and officers can add resolution proof to assigned complaints.

## 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev      # starts on http://localhost:5173, proxies /api to :5000
```

Open http://localhost:5173 — the language toggle (हिं / EN) is in the top nav.

## How the Accountability Engine works
- `backend/utils/accountabilityEngine.js` holds all rating rules.
- `backend/utils/slaCron.js` runs every 15 minutes, finds complaints past
  their `slaDeadline` that are still open, marks them `escalated`, and
  applies a rating penalty (bigger penalty for higher priority complaints).
- When an officer marks a complaint `resolved`, `evaluateResolution()`
  checks whether it was before or after the deadline and adjusts the
  rating accordingly (+1 on time, -5 late).
- Every rating change is written to the `PerformanceLog` collection for a
  full audit trail, viewable by admins per-officer.
- Thresholds: rating < 60 → salary increment blocked, < 50 → promotion
  blocked, < 40 → flagged `underReview`.

## Key API Routes
| Method | Route | Access |
|---|---|---|
| POST | /api/auth/register | Public (citizen signup) |
| POST | /api/auth/login | Public |
| POST | /api/auth/staff | Admin only |
| POST | /api/complaints | Citizen |
| GET | /api/complaints/mine | Citizen |
| GET | /api/complaints/track/:trackingId | Public |
| GET | /api/complaints/assigned | Officer |
| PATCH | /api/complaints/:id/status | Officer / dept head / admin |
| GET | /api/complaints/department | Dept head / admin |
| POST | /api/complaints/:id/assign | Dept head / admin |
| GET | /api/admin/overview | Admin / dept head |
| GET | /api/admin/officers/leaderboard | Admin / dept head |
| PATCH | /api/admin/officers/:id/rating | Admin |

## Notes for extending this project
- File uploads: `multer-storage-cloudinary` is included in package.json but
  not wired into a route yet — add a `POST /api/complaints/:id/evidence`
  route if you want real evidence upload.
- Real-time: `socket.io` is initialized in `server.js` (`app.get("io")`) but
  not yet emitting events — a natural next step is emitting a `status:update`
  event from `updateComplaintStatus` so citizen dashboards update live.
- SMS/Email OTP is described conceptually in the UI copy but not implemented;
  swap the plain password login for OTP via an SMS gateway (e.g. MSG91,
  Twilio) for a production-ready version.
- PDF FIR/receipt generation: `pdfkit` is included; add a route that streams
  a generated PDF from a complaint document.
