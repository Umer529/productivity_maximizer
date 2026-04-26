# FocusFlow AI - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Python 3.8+
- Git

### Quick Setup (5 minutes)

#### 1. Backend
```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:5000
```

#### 2. Frontend
```bash
cd frontend
npm install
npm start
# Scan QR code with Expo Go app
```

#### 3. Verify ML Integration
```bash
# Models are automatically loaded from artifacts/
# Check: backend/python/predictor.py exists ✅
# Check: artifacts/ directory has .pkl files ✅
```

---

## 📊 What You Can Do

### User Management
- **Register**: POST `/api/v1/auth/register` → Get JWT token
- **Login**: POST `/api/v1/auth/login` → Authenticate
- **Profile**: GET/PUT `/api/v1/profile` → Manage settings
- **ML Features**: GET/PUT `/api/v1/profile/ml-features` → Update learning profile

### Task Management
- **Create Task**: POST `/api/v1/tasks` → Add assignment with deadline & difficulty
- **View Tasks**: GET `/api/v1/tasks` → See all pending tasks
- **Update Task**: PUT `/api/v1/tasks/:id` → Edit or mark as completed
- **Delete Task**: DELETE `/api/v1/tasks/:id` → Remove task
- **Get Stats**: GET `/api/v1/tasks/stats` → Task completion rate

### AI Scheduling
- **Get Today's Schedule**: GET `/api/v1/schedule?date=2026-04-25` → ML-optimized timetable
- **Get Weekly Schedule**: GET `/api/v1/schedule/weekly` → Week plan
- **Regenerate**: POST `/api/v1/schedule/regenerate` → Recalculate with new data

### Focus Sessions (Pomodoro)
- **Start**: POST `/api/v1/focus-sessions/start` → Begin timer
- **End**: PUT `/api/v1/focus-sessions/:id/end` → Complete session
- **Current**: GET `/api/v1/focus-sessions/active` → Get running session
- **History**: GET `/api/v1/focus-sessions` → Session logs

### Analytics
- **Overview**: GET `/api/v1/analytics/overview` → Productivity score, weekly hours, ML predictions
- **Insights**: GET `/api/v1/analytics/insights` → AI recommendations & warnings
- **History**: GET `/api/v1/analytics/history?days=14` → Study trends

---

## 🎯 Core Features

### 1. AI-Powered Schedule
- **Smart Prioritization**: ML ranks tasks by urgency + difficulty + predictions
- **Break Optimization**: Calculates ideal break duration based on your profile
- **Prayer Breaks**: Integrates Namaz times automatically
- **No Overload**: Respects your sleep time and available hours

**How it works**:
1. You add tasks with deadlines and difficulty levels
2. System extracts your 19 ML features (age, sleep patterns, stress level, etc.)
3. ML models predict:
   - Your productivity level (0-100)
   - Daily study hours needed (2-15)
   - Optimal break interval (15-45 min)
4. Smart scheduler creates your personalized timetable

### 2. Task Management
- Create tasks with:
  - Title, description, deadline
  - Type (assignment/quiz/midterm/final/project/other)
  - Difficulty (1-5 scale)
  - Course/subject
  - Estimated duration
- Auto-calculated priority based on deadline + difficulty
- Track progress (0-100%)
- Mark as completed/overdue

### 3. Pomodoro Focus Mode
- Configurable session duration (default 25 min)
- Automatic break suggestions
- Track completed sessions
- Calculates your productivity index
- Maintains daily streak

### 4. Analytics Dashboard
- Weekly study hours breakdown
- Subject distribution pie chart
- Task completion rate
- Focus score (% successful sessions)
- **ML Insights**:
  - Burnout risk (0-100) with factors
  - Productivity prediction
  - Recommended study hours
  - Personalized tips and warnings

### 5. Profile & Preferences
- GPA goal, study hours target, sleep schedule
- Pomodoro settings (duration, breaks, long break interval)
- Prayer break preferences
- **19 ML features** (collected over time):
  - Demographics: Age, gender
  - Habits: Sleep, exercise, diet, social media usage
  - Education: Parental education level, internet quality
  - Health: Mental health rating
  - Activities: Extracurricular participation

---

## 📱 Frontend Usage

### HomeScreen (Dashboard)
- Shows AI productivity score (ML-powered)
- Weekly study hours chart
- Pending tasks count
- Daily focus time
- AI suggestion of the day
- Quick action buttons

### TaskInputScreen
- Create new task
- ML analyzes task difficulty
- Get priority score instantly
- Set deadline with date picker

### SchedulerScreen  
- View today's ML-generated schedule
- Visual timeline with tasks and breaks
- Tap to regenerate if tasks changed
- Switch between daily/weekly view

### FocusScreen
- Timer for current session
- Start/pause/resume controls
- Task being worked on
- Session summary on completion
- Session saved to analytics

### AnalyticsScreen
- Weekly study hours chart
- Subject distribution breakdown
- Burnout risk gauge
- AI insights as recommendation cards
- Study history graph

### ProfileSettingsScreen
- Edit all preferences
- Update ML features
- Change study times
- Prayer break settings
- Password change

---

## 🧠 How ML Works

### The Three Prediction Models

**1. Productivity Score Model**
- Input: Your 19 features (age, sleep, stress, etc.)
- Output: How productive you are today (0-100)
- Use: Colors your dashboard, influences priority

**2. Required Hours Model**
- Input: Your features + task difficulty
- Output: Hours you should study today (2-15)
- Use: Schedule allocates this much time for focused study

**3. Break Interval Model**
- Input: Your stress level, fatigue, current mood
- Output: Optimal break duration (15-45 minutes)
- Use: Pomodoro system suggests these intervals

### 19 ML Features (Auto-Extracted)

**Basic**:
- Age, gender, semester, GPA target

**Lifestyle**:
- Sleep hours, diet quality, exercise frequency
- Social media hours, Netflix hours, part-time job

**Academic**:
- Attendance %, parental education, internet quality

**Health/Wellness**:
- Mental health rating (1-10), stress level
- Engagement score, life balance score

**Derived** (calculated from behavior):
- Productivity index, time efficiency, engagement

---

## 🔄 Data Flow Example

```
User creates task "Math Assignment"
    ↓ Deadline: 2026-04-26, Difficulty: 4/5
    ↓
Backend receives via POST /api/v1/tasks
    ↓
Task saved to SQLite database
    ↓
Frontend navigates to Schedule view
    ↓
Backend GET /api/v1/schedule triggered
    ↓
System extracts user's 19 ML features
    ↓
ML models predict:
  - Productivity: 72/100
  - Required hours: 6.2
  - Break interval: 22 min
    ↓
Smart scheduler generates timetable:
  - 08:00-09:00: Math Assignment (focused study)
  - 09:00-09:05: Short break
  - 09:05-10:05: Database Quiz (next task)
  - 10:05-10:15: Longer break
  - [continues...]
  - Includes Namaz breaks, respects sleep (23:00-07:00)
    ↓
Frontend receives JSON schedule
    ↓
UI renders beautiful timeline view
    ↓
User clicks "Start Focus" button
    ↓
POST /api/v1/focus-sessions/start
    ↓
Timer starts counting down 25 minutes
    ↓
When complete, PUT /api/v1/focus-sessions/:id/end
    ↓
Session data saved (duration, completion, task)
    ↓
Analytics updated:
  - Total study minutes: +25
  - Task progress: +10%
  - Streak: +1 day
    ↓
Next visit to Analytics screen shows updated metrics
```

---

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | Check: `npm install` done, Node.js 18+, port 5000 free |
| ML timeouts | Python 3.8+ installed, `artifacts/` has model files |
| Frontend can't connect | Update `BASE_URL` in `frontend/src/lib/apiClient.ts` to your IP |
| Tasks not in schedule | Ensure deadline set, status != 'completed' |
| Focus session won't start | Check: task exists, valid planned duration |
| Analytics shows 0 hours | Complete at least one focus session first |

---

## 📚 API Examples

### Create a Task
```bash
curl -X POST http://localhost:5000/api/v1/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AI Assignment",
    "deadline": "2026-04-26",
    "difficulty": 4,
    "type": "assignment",
    "course": "AI 301",
    "estimatedDuration": 180
  }'
```

### Get Today's Schedule
```bash
curl -X GET "http://localhost:5000/api/v1/schedule?date=2026-04-25&method=ml" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Start a Focus Session
```bash
curl -X POST http://localhost:5000/api/v1/focus-sessions/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": 5,
    "plannedDuration": 25,
    "sessionType": "study"
  }'
```

### Get Analytics
```bash
curl -X GET http://localhost:5000/api/v1/analytics/overview \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎓 Key Concepts

### Urgency Score
- Calculated from: days until deadline × difficulty
- Higher = more urgent
- Auto-calculated, affects task priority

### Priority Levels
- **Critical**: Very urgent (< 1 day, hard task)
- **High**: Urgent (1-3 days, difficult)
- **Medium**: Moderate (3-7 days)
- **Low**: Distant deadline, easy task

### Focus Score
- % of completed focus sessions vs. started sessions
- Higher = better focus consistency
- Affects burnout risk calculation

### Burnout Risk
- Combines: stress, mental health, sleep, study load, streak
- Range: 0-100
- Levels: Low (<30), Moderate (30-50), High (50-70), Critical (70+)

### Productivity Index
- Starts at 50
- +5 per completed session
- -2 per interrupted session
- Affects ML predictions

---

## 💾 Database

All your data is stored locally in SQLite:
- Location: `backend/data/focusflow.db`
- Auto-created on first run
- Includes: users, tasks, sessions, courses
- Backed by foreign keys for integrity

---

## 🔐 Security

- Passwords: Hashed with bcryptjs (salt=10)
- Tokens: JWT, 7-day expiry
- Headers: CORS, rate limiting, helmet
- Input: Validated on all endpoints
- Database: Foreign key constraints enabled

---

## 📈 Next Steps

1. **Try It Out**:
   - Register an account
   - Add 3-5 tasks
   - Update your profile with ML features
   - Start a focus session

2. **Understand Your Data**:
   - Check Analytics after first session
   - Look at schedule to see ML priorities
   - Notice how difficulty affects positioning

3. **Customize**:
   - Update Pomodoro settings
   - Set prayer break preferences
   - Adjust study start/end times

4. **Track Progress**:
   - Maintain daily streak
   - Watch productivity index grow
   - Review weekly study trends

---

**FocusFlow AI** is ready to supercharge your productivity! 🚀

Start by creating your first task and let the AI handle the rest.
