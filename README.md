# FocusFlow AI

AI-powered productivity app for students — Pomodoro timer, AI schedule generation, task management, and focus analytics.

## Project Structure

```
focusflow-ai/
├── frontend/   # React Native (Expo) mobile app
└── backend/    # Node.js + Express + SQLite API
```

---

## Backend Setup

### Prerequisites
- Node.js ≥ 18
- npm

### Install & Run

```bash
cd backend
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env: set JWT_SECRET to a strong secret

# Start development server
npm run dev

# Start production server
npm start
```

The API will run on `http://localhost:5000`.

### Environment Variables (`.env`)

| Variable       | Description                          | Default                     |
|----------------|--------------------------------------|-----------------------------|
| `PORT`         | Server port                          | `5000`                      |
| `DB_PATH`      | SQLite database file path            | `./data/focusflow.db`       |
| `JWT_SECRET`   | Secret key for JWT signing           | *(required)*                |
| `JWT_EXPIRE`   | Token expiry duration                | `7d`                        |
| `NODE_ENV`     | Environment (`development`/`production`) | `development`           |
| `FRONTEND_URL` | Allowed CORS origin                  | `http://localhost:8080`     |

### API Endpoints

| Method | Path                              | Description                |
|--------|-----------------------------------|----------------------------|
| POST   | `/api/v1/auth/register`           | Register user              |
| POST   | `/api/v1/auth/login`              | Login                      |
| GET    | `/api/v1/auth/me`                 | Get current user           |
| GET    | `/api/v1/tasks`                   | List tasks                 |
| POST   | `/api/v1/tasks`                   | Create task                |
| PUT    | `/api/v1/tasks/:id`               | Update task                |
| DELETE | `/api/v1/tasks/:id`               | Delete task                |
| POST   | `/api/v1/focus-sessions/start`    | Start focus session        |
| PUT    | `/api/v1/focus-sessions/:id/end`  | End focus session          |
| GET    | `/api/v1/focus-sessions/active`   | Get active session         |
| GET    | `/api/v1/analytics/overview`      | Analytics overview         |
| GET    | `/api/v1/analytics/insights`      | AI insights                |
| GET    | `/api/v1/schedule`                | Get daily schedule         |
| POST   | `/api/v1/schedule/regenerate`     | Regenerate AI schedule     |

---

## Frontend Setup (React Native / Expo)

### Prerequisites
- Node.js ≥ 18
- npm
- [Expo Go](https://expo.dev/go) app on your phone **or** an Android/iOS emulator

### Install & Run

```bash
cd frontend
npm install
npm start
```

This opens the Expo dev server. Then:
- **Physical device**: Scan the QR code with the Expo Go app
- **Android emulator**: Press `a` in the terminal
- **iOS simulator**: Press `i` in the terminal (macOS only)

### Configure Backend URL

Edit `frontend/src/lib/apiClient.ts` and set `BASE_URL` to point to your running backend:

```ts
// Expo Go on the same machine as backend:
const BASE_URL = 'http://localhost:5000/api/v1';

// Android emulator → backend on your machine:
const BASE_URL = 'http://10.0.2.2:5000/api/v1';

// Physical device on same WiFi:
const BASE_URL = 'http://192.168.x.x:5000/api/v1';
```

---

## Running Both Together

```bash
# Terminal 1 – Backend
cd backend && npm run dev

# Terminal 2 – Frontend
cd frontend && npm start
```

---

## Tech Stack

| Layer    | Technology                                |
|----------|-------------------------------------------|
| Frontend | React Native, Expo, React Navigation      |
| Backend  | Node.js, Express, SQLite (better-sqlite3) |
| Auth     | JWT (jsonwebtoken + bcryptjs)             |
| Storage  | AsyncStorage (token), SQLite (data)       |
