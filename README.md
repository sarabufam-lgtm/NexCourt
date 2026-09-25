# 🏸 NexCourt — High-Concurrency Court Booking PWA

> **Modern, mobile-first Sports Facility & Court Booking Management System (PWA) with multi-admin concurrency, optimistic locking, and real-time synchronization.**

[![CI Pipeline](https://github.com/your-org/nexcourt/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/nexcourt/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Executive Overview

**NexCourt** is built for sports facilities, schools, and court complexes (specifically configured for **Al Nahda Boys School Sports Complex, UAE**). It enables multi-admin shifts to manage Badminton, Basketball, Cricket, and Pickleball bookings without collisions or double-booking race conditions.

### 🛡️ Critical Gaps Resolved
1. **Race Condition Immunity:** 5-minute atomic database holds (`status_id = 5`) combined with optimistic locking (`version = version + 1`) during confirmation.
2. **Dual-Token Security & RBAC:** Short-lived JWT (15 min) + httpOnly Refresh Token (7 days) with token rotation and replay-attack family invalidation.
3. **Offline-First PWA:** Service worker caching, IndexedDB (`idb`) read-only calendar explorer, and an offline action queue with automatic conflict reconciliation on reconnect.
4. **Instant Real-Time Sync:** Socket.IO rooms partitioned by date (`date:YYYY-MM-DD`). Slots pulse yellow with holding admin initials upon lock, and turn green/confirmed on completion.
5. **Recurring Series Engine:** Parent-child booking architecture (`bookingType = 'long_term'`) with dynamic calendar expansion and automated clash evaluation.

---

## 🏗️ Architecture & Monorepo Layout

```
NexCourt/
├── .github/workflows/ci.yml     # Automated lint, build, & type-check on push
├── railway.toml                 # Cloud SaaS configuration for Railway.app
├── package.json                 # Monorepo orchestration (npm workspaces)
├── server/                      # Backend API & WebSocket Server
│   ├── prisma/
│   │   ├── schema.prisma        # PostgreSQL models with multi-tenant facility scope
│   │   └── seed.ts              # Court types, pricing, & super_admin seeder
│   ├── src/
│   │   ├── config/              # Validated environment configuration (Zod)
│   │   ├── controllers/         # Auth, Booking, and Court HTTP handlers
│   │   ├── services/            # Concurrency & Recurring business engines
│   │   ├── middlewares/         # JWT verification, RBAC permissions, Error handling
│   │   ├── sockets/             # Socket.IO manager with date-partitioned rooms
│   │   └── index.ts             # Express + WebSocket HTTP server
│   └── Dockerfile               # Production multi-stage Docker image
└── client/                      # Frontend PWA (React 18 + Vite + TypeScript)
    ├── public/
    │   └── manifest.json        # PWA manifest for standalone mobile installation
    ├── src/
    │   ├── api/                 # Axios client with auto-refresh interceptor
    │   ├── components/          # CourtGrid, SlotLockModal, RecurringBookingModal, ConflictModal
    │   ├── hooks/               # useAuth, useRealtimeSync, useOfflineSync
    │   ├── lib/                 # IndexedDB storage (idb) & Socket.IO client
    │   └── pages/               # DashboardPage, LoginPage
    └── vite.config.ts           # Vite + PWA plugin with Workbox caching
```

---

## 🚀 Quickstart: Local Development

### Prerequisites
- **Node.js**: `v20.x` or `v24.x` (LTS recommended)
- **PostgreSQL**: `v15+` running locally or via Docker

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/nexcourt.git
cd nexcourt
npm install
```

### 2. Configure Environment Variables
Copy template configs:
```bash
cp .env.example .env
cp .env.example server/.env
```

### 3. Setup Database Schema & Seed Data
```bash
# Push Prisma schema to PostgreSQL
npm run prisma:migrate

# Seed courts, facilities, pricing, and default admin
npm run prisma:seed
```

Default credentials seeded:
- **Email:** `admin@alnahda.ae`
- **Password:** `Admin@123456`

### 4. Start Full-Stack Dev Servers
```bash
# Runs both Backend (port 5000) and Frontend (port 5173) concurrently
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## ☁️ Deployment Guide (GitHub to Cloud SaaS)

### A. Publish to GitHub
```bash
git add .
git commit -m "feat: initial NexCourt PWA scaffolding with real-time concurrency"
git branch -M main
git remote add origin https://github.com/<your-username>/nexcourt.git
git push -u origin main
```

### B. Deploy Backend to Railway.app
1. Go to [Railway.app](https://railway.app) and create a **New Project**.
2. Select **Provision PostgreSQL**.
3. Select **Deploy from GitHub repo** and point to your repository.
4. Set the Root Directory to `/` or `/server`.
5. Add the environment variables:
   - `DATABASE_URL`: Set to Railway's PostgreSQL connection string (`${{Postgres.DATABASE_URL}}`)
   - `JWT_SECRET`: Random 32+ character string
   - `JWT_REFRESH_SECRET`: Random 32+ character string
   - `COOKIE_SECRET`: Random 32+ character string
   - `FRONTEND_URL`: Your production frontend URL (e.g. `https://nexcourt.vercel.app`)
   - `NODE_ENV`: `production`

### C. Deploy Frontend to Vercel
1. Go to [Vercel](https://vercel.com) and click **Add New Project**.
2. Import your GitHub repository.
3. Set the **Root Directory** to `client`.
4. Configure Build Settings:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add Environment Variables:
   - `VITE_API_URL`: Your Railway backend API URL (e.g. `https://nexcourt-api.up.railway.app/api`)
   - `VITE_WS_URL`: Your Railway backend WebSocket URL (e.g. `https://nexcourt-api.up.railway.app`)
6. Click **Deploy**.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
