# FocusFlow AI

An AI-powered productivity platform for students — combines a Pomodoro focus timer, ML-optimized daily scheduling, task management, and performance analytics in a single React Native mobile app backed by a Node.js API and Python ML models.

---

## Features

| Area | Highlights |
|------|-----------|
| **Focus Sessions** | Pomodoro-style timer with ambient sound, pause/resume, session history |
| **Task Management** | Deadline calendar picker, priority scoring, live progress tracking, focus sprint integration |
| **AI Schedule** | ML-optimized daily timetable — starts from current time, accounts for task remaining work, Namaz prayer blocks, and custom breaks |
| **Analytics** | Focus hours, streak, completion rate, burnout risk, peak-productivity insights |
| **ML Personalization** | Three scikit-learn regression models trained on 19 student lifestyle features to predict productivity score, required study hours, and optimal break intervals |

---

## Project Structure

```
focusflow-ai/
├── frontend/               React Native (Expo) mobile app
│   └── src/
│       ├── screens/        HomeScreen, FocusScreen, TaskDetailScreen, SchedulerScreen, …
│       ├── components/     CalendarPicker
│       ├── services/       API service layer (auth, tasks, schedule, analytics, …)
│       ├── contexts/       AuthContext, AppDataContext
│       ├── lib/            apiClient, theme, connectivityChecker
│       └── navigation/     AppNavigator (stack + bottom tabs)
│
├── backend/                Node.js + Express REST API
│   └── src/
│       ├── controllers/    authController, taskController, scheduleController, …
│       ├── models/         User, Task, FocusSession, Course (SQLite via better-sqlite3)
│       ├── routes/         /auth, /tasks, /focus-sessions, /schedule, /analytics, /ml
│       ├── middleware/     JWT auth, error handler, input validation
│       └── services/       aiSchedulerService, mlScheduler (Node→Python bridge)
│   └── python/             predictor.py — stdin/stdout JSON bridge to Python ML
│
├── ml/                     Python ML module
│   ├── productivity_core/  Inference package (models.py, scheduler.py, prioritizer.py, …)
│   ├── models/             Trained .pkl artifacts + model_metadata.json
│   ├── training/           Jupyter notebooks used to train the models
│   ├── data/               student_habits_performance.csv (training dataset)
│   └── scripts/            Utility scripts (example usage, model creation)
│
├── docs/                   Additional documentation, reports, and setup guides
├── README.md               ← you are here
└── .env.example            Root-level environment reference
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Python | ≥ 3.9 |
| Expo CLI | installed via `npm install -g expo-cli` (or use `npx expo`) |
| Expo Go app | for running on a physical device |

---

## Quick Start

### 1 — Clone & install

```bash
git clone <repo-url>
cd focusflow-ai

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install

# Python ML
pip install -r requirements.txt
```

### 2 — Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — set JWT_SECRET to a long random string

# Frontend (for local web/emulator dev — no edit needed)
cp frontend/.env.example frontend/.env.local
```

### 3 — Run

Open **two terminals**:

```bash
# Terminal 1 — Backend API (port 5000)
cd backend
npm run dev

# Terminal 2 — Expo dev server
cd frontend
npm start
```

Then:
- **Web**: press `w` in the Expo terminal
- **Android emulator**: press `a`
- **iOS simulator** (macOS): press `i`
- **Physical device**: scan the QR code with the Expo Go app

> **Physical device note**: The frontend auto-detects the backend IP from the Expo dev-server host using `expo-constants`, so no manual IP configuration is required on the same Wi-Fi network.

---

## Backend API Reference

Base URL: `http://localhost:5000/api/v1`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/me` | Get current user profile |
| PUT | `/auth/profile` | Update preferences & ML features |
| GET | `/tasks` | List tasks |
| POST | `/tasks` | Create task |
| PUT | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Delete task |
| POST | `/focus-sessions/start` | Start a focus session |
| PUT | `/focus-sessions/:id/end` | End a focus session |
| GET | `/focus-sessions/active` | Get active session |
| GET | `/schedule` | Get AI-generated daily schedule |
| POST | `/schedule/regenerate` | Regenerate schedule |
| GET | `/schedule/weekly` | Get 7-day schedule |
| GET | `/analytics/overview` | Productivity overview |
| GET | `/analytics/insights` | AI-generated insights |
| POST | `/ml/predict` | Run ML predictions |

---

## ML Module

The ML pipeline uses three scikit-learn regression models trained on student lifestyle data:

| Model | Input | Output |
|-------|-------|--------|
| `productivity_score_model.pkl` | 19 lifestyle features | Productivity score (0–100) |
| `required_hours_model.pkl` | 19 lifestyle features | Recommended daily study hours |
| `break_interval_model.pkl` | 19 lifestyle features | Optimal break interval (minutes) |

**Integration flow**: `mlScheduler.js` → spawns `backend/python/predictor.py` via subprocess → imports `ml/productivity_core` → loads `.pkl` files from `ml/models/` → returns JSON predictions.

To retrain: open `ml/training/Productivity_Regression_Model.ipynb` and run all cells.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile frontend | React Native 0.79, Expo 53, TypeScript |
| Navigation | React Navigation 7 (stack + bottom tabs) |
| State management | React Context + AsyncStorage |
| Backend API | Node.js 18, Express 4, SQLite (better-sqlite3) |
| Authentication | JWT (jsonwebtoken + bcryptjs) |
| ML models | Python 3, scikit-learn, NumPy, pandas |
| Security | Helmet.js, express-rate-limit, CORS |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `5000` |
| `HOST` | Bind address | `0.0.0.0` |
| `DB_PATH` | SQLite database path | `./data/focusflow.db` |
| `JWT_SECRET` | Secret for JWT signing | *(required — set a strong random value)* |
| `JWT_EXPIRE` | Token expiry | `7d` |
| `NODE_ENV` | `development` or `production` | `development` |
| `FRONTEND_URL` | Allowed CORS origin in production | `http://localhost:8080` |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend base URL (web / override for native) |

---

## Additional Documentation

See the [`docs/`](docs/) folder for:
- `QUICK_START.md` — condensed setup in under 5 minutes
- `USER_MANUAL.md` — full end-user guide for daily app usage
- `TROUBLESHOOTING.md` — common issues and fixes
- `INTEGRATION_GUIDE.md` — ML backend integration details
- `NETWORK_CONFIG.md` — multi-device / cross-platform network setup
- `SETUP_GUIDE.md` — detailed installation walkthrough
