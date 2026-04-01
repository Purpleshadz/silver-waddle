# SensorDash

A Node.js/Express web application for visualising sensor data from InfluxDB, with multi-organisation support, user management and Chart.js dashboards.

## Features

- **Multi-organisation** support — users belong to one or more organisations, switch between them in the navbar.
- **Role-based access** — `lead_admin` and `admin` roles.
- **Dashboards & Widgets** — create dashboards per organisation, add Chart.js line/bar widgets backed by live InfluxDB queries.
- **Admin panel** — manage users and organisations through the web UI.
- **CLI scripts** — bootstrap initial users without an existing account.

## Prerequisites

| Software | Version |
|---|---|
| Node.js | 18+ |
| MongoDB | 6+ |
| InfluxDB | 2.x |

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd silver-waddle
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description |
|---|---|
| `PORT` | HTTP port (default `3000`) |
| `MONGODB_URI` | MongoDB connection string |
| `SESSION_SECRET` | Long random string for session signing |
| `INFLUX_URL` | InfluxDB base URL (e.g. `http://localhost:8086`) |
| `INFLUX_TOKEN` | InfluxDB API token |
| `INFLUX_ORG` | InfluxDB organisation name |
| `INFLUX_BUCKET` | InfluxDB bucket containing sensor data |

### 3. Create the first lead admin

```bash
npm run create-lead-admin
```

You will be prompted for a username and password. This account has full access to user and organisation management.

### 4. (Optional) Create additional admin users

```bash
npm run create-admin
```

You must authenticate as an existing lead admin first.

## Running the application

```bash
# Production
npm start

# Development (auto-restart on changes — requires nodemon)
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser and log in.

## Project structure

```
.
├── app.js                  # Express application entry point
├── bin/
│   ├── create-lead-admin.js
│   └── create-admin.js
├── src/
│   ├── config/
│   │   ├── db.js           # Mongoose connection
│   │   └── influx.js       # InfluxDB client helpers
│   ├── middleware/
│   │   └── auth.js         # requireAuth / requireAdmin / requireLeadAdmin
│   ├── models/
│   │   ├── Dashboard.js
│   │   ├── Organization.js
│   │   └── User.js
│   └── routes/
│       ├── admin.js
│       ├── auth.js
│       ├── dashboard.js
│       └── data.js
├── views/
│   ├── layout.ejs
│   ├── login.ejs
│   ├── index.ejs
│   ├── error.ejs
│   ├── dashboard/
│   │   ├── list.ejs
│   │   ├── edit.ejs
│   │   └── widget-form.ejs
│   └── admin/
│       ├── index.ejs
│       ├── users.ejs
│       ├── user-form.ejs
│       └── orgs.ejs
└── public/                 # Static assets
```
