# Productivity Core - ML-Based Scheduling Engine

A modular, production-ready Python package for AI-powered student productivity optimization and intelligent timetable generation.

## Overview

**Productivity Core** implements three trained regression models to predict and optimize student productivity:

1. **Productivity Score Predictor** - Estimates student productivity (0-100 scale)
2. **Required Study Hours Predictor** - Recommends daily study time (2-15 hours)
3. **Break Interval Optimizer** - Calculates personalized break durations (15-45 minutes)

These predictions feed into an intelligent scheduling engine that generates optimized daily and weekly study plans with smart break scheduling and Islamic prayer (Namaz) break support.

---

## Architecture

```
productivity_core/
├── __init__.py              # Package initialization
├── models.py                # Regression model inference (ProductivityPredictor)
├── prioritizer.py           # AI-enhanced task prioritization (TaskPrioritizer)
├── break_optimizer.py       # Smart break scheduling (BreakOptimizer)
├── scheduler.py             # Integrated schedule generation (IntelligentScheduler)
└── utils.py                 # Utility functions
```

### Core Components

#### 1. ProductivityPredictor (models.py)
```python
from productivity_core import ProductivityPredictor

predictor = ProductivityPredictor(models_dir="artifacts")

# Make predictions
prod_score = predictor.predict_productivity_score(features)        # 0-100
study_hours = predictor.predict_required_hours(features)           # 2-15 hours
break_interval = predictor.predict_optimal_break_interval(features) # 15-45 min

# Get all predictions with confidence scores
all_predictions = predictor.predict_all(features)
```

#### 2. TaskPrioritizer (prioritizer.py)
```python
from productivity_core import TaskPrioritizer

prioritizer = TaskPrioritizer(predictor)

# Compute priority score for a task
priority = prioritizer.compute_priority_score(
    task={'deadline': '2026-04-25', 'difficulty': 4, 'estimated_hours': 3},
    student_features=features
)  # Returns 0-100 score

# Prioritize multiple tasks
prioritized = prioritizer.prioritize_tasks(tasks, features)

# Get summary
summary = prioritizer.get_priority_summary(tasks, features, top_n=5)
```

#### 3. BreakOptimizer (break_optimizer.py)
```python
from productivity_core import BreakOptimizer

break_opt = BreakOptimizer(predictor)

# Calculate personalized break intervals
breaks = break_opt.calculate_break_intervals(
    student_features=features,
    task_difficulty=4
)
# Returns: {'short_break': 5, 'long_break': 15, 'session_interval': 4}

# Get prayer (Namaz) break suggestions
prayers = break_opt.suggest_namaz_break_slots(
    daily_schedule_start="08:00",
    daily_schedule_end="22:00"
)

# Analyze past session history for adjustments
suggestions = break_opt.suggest_break_adjustments(
    student_features=features,
    session_history=[...past sessions...]
)
```

#### 4. IntelligentScheduler (scheduler.py)
```python
from productivity_core import IntelligentScheduler

scheduler = IntelligentScheduler(predictor, prioritizer, break_opt)

# Generate daily schedule
daily = scheduler.generate_daily_schedule(
    user_profile={'name': 'Ahmed Ali', 'features': features, 'available_hours': 8.0},
    tasks=[...tasks...],
    target_date='2026-04-25',
    study_start_time='08:00',
    study_end_time='22:00'
)

# Generate weekly schedule
weekly = scheduler.generate_weekly_schedule(
    user_profile=profile,
    tasks=tasks,
    start_date='2026-04-21',  # Monday
    study_start_time='08:00',
    study_end_time='22:00'
)
```

---

## Usage Example

### Basic Workflow

```python
import numpy as np
from datetime import datetime, timedelta
from productivity_core import (
    ProductivityPredictor,
    TaskPrioritizer,
    BreakOptimizer,
    IntelligentScheduler,
    create_student_profile,
    format_schedule
)

# 1. Initialize models
predictor = ProductivityPredictor(models_dir="artifacts")

# 2. Create student profile
features = np.array([...19 features...])  # See feature list below
profile = create_student_profile(
    name="Student Name",
    features=features,
    available_hours=8.0
)

# 3. Define tasks
tasks = [
    {
        'name': 'AI Assignment',
        'deadline': '2026-04-28',
        'difficulty': 5,
        'estimated_hours': 4
    },
    {
        'name': 'Quiz Prep',
        'deadline': '2026-04-23',
        'difficulty': 3,
        'estimated_hours': 2
    }
]

# 4. Generate schedule
scheduler = IntelligentScheduler(predictor)
schedule = scheduler.generate_daily_schedule(
    user_profile=profile,
    tasks=tasks,
    target_date='2026-04-22'
)

# 5. Format and display
print(format_schedule(schedule, output_format='text'))

# 6. Export
from productivity_core import export_schedule_to_file
export_schedule_to_file(schedule, 'schedule.json', format='json')
```

---

## Feature Requirements

The regression models expect exactly **19 features** in this order:

### Original Features (14)
1. `age` (int)
2. `gender` (int, encoded: Male=1, Female=0, Other=2)
3. `study_hours_per_day` (float)
4. `social_media_hours` (float)
5. `netflix_hours` (float)
6. `part_time_job` (int, encoded: Yes=1, No=0)
7. `attendance_percentage` (float, 0-100)
8. `sleep_hours` (float)
9. `diet_quality` (int, encoded: Poor=0, Fair=1, Good=2)
10. `exercise_frequency` (int, 0-7 times/week)
11. `parental_education_level` (int, encoded)
12. `internet_quality` (int, encoded)
13. `mental_health_rating` (int, 1-10)
14. `extracurricular_participation` (int, encoded: Yes=1, No=0)

### Derived Features (5)
15. `productivity_index` (float)
16. `stress_factor` (float)
17. `engagement_score` (float, 0-1)
18. `time_efficiency` (float)
19. `life_balance_score` (float, 0-1)

### Creating Features

```python
import numpy as np
from productivity_core import create_student_profile, validate_features

# Validate features
if validate_features(features, expected_count=19):
    print("Features are valid!")

# Create profile with validated features
profile = create_student_profile(
    name="Student",
    features=features,
    available_hours=8.0
)
```

---

## Task Format

Tasks must include these fields:

```python
task = {
    'name': str,              # Task name
    'deadline': str,          # YYYY-MM-DD format
    'difficulty': int,        # 1-5 scale
    'estimated_hours': float, # Optional, default 2
    'description': str        # Optional
}
```

### Example Tasks

```python
tasks = [
    {
        'name': 'Python Assignment',
        'deadline': '2026-04-28',
        'difficulty': 4,
        'estimated_hours': 3,
        'description': 'Implement sorting algorithms'
    },
    {
        'name': 'Database Midterm Review',
        'deadline': '2026-04-25',
        'difficulty': 5,
        'estimated_hours': 6,
        'description': 'Review SQL and normalization'
    }
]
```

---

## Schedule Output Format

### Daily Schedule

```python
{
    'date': '2026-04-22',
    'student_name': 'Ahmed Ali',
    'student_productivity': 78.5,
    'recommended_study_hours': 6.2,
    'schedule_slots': [
        {
            'type': 'study',
            'task': 'AI Assignment',
            'start_time': '08:00',
            'duration': 90,  # minutes
            'difficulty': 5,
            'priority': 85.3
        },
        {
            'type': 'short_break',
            'task': 'Break (5 min)',
            'start_time': '09:30',
            'duration': 5,
            'activity': 'rest'
        },
        ...
    ],
    'analytics': {
        'total_tasks': 4,
        'prioritized_tasks': 4,
        'total_study_time': 480,  # minutes
        'break_count': 6,
        'prayer_breaks': 2,
        'productivity_level': 'Good'
    }
}
```

---

## Integration with Backend

### Option 1: Direct Python Module Import
```python
# In Node.js backend (using child_process)
const { exec } = require('child_process');

function generateSchedule(userProfile, tasks) {
    return new Promise((resolve, reject) => {
        const cmd = `python -c "from productivity_core import ...; schedule = ..."`
        exec(cmd, (err, stdout, stderr) => {
            if (err) reject(err);
            resolve(JSON.parse(stdout));
        });
    });
}
```

### Option 2: REST API Wrapper
```python
# Flask wrapper for productivity_core
from flask import Flask, request, jsonify
from productivity_core import IntelligentScheduler
import json

app = Flask(__name__)
scheduler = IntelligentScheduler()

@app.route('/schedule', methods=['POST'])
def generate_schedule():
    data = request.json
    schedule = scheduler.generate_daily_schedule(
        user_profile=data['profile'],
        tasks=data['tasks']
    )
    return jsonify(schedule)
```

---

## Model Information

### Model 1: Productivity Score Predictor
- **Algorithm:** RandomForestRegressor (200 estimators)
- **Output Range:** 0-100
- **Test R²:** ~0.78
- **Test MAE:** ~6.5
- **Top Features:** study_hours_per_day, mental_health_rating, sleep_hours

### Model 2: Required Study Hours Predictor
- **Algorithm:** GradientBoostingRegressor (200 estimators)
- **Output Range:** 2-15 hours
- **Test R²:** ~0.72
- **Test MAE:** ~0.8 hours
- **Top Features:** productivity_index, stress_factor, study_hours_per_day

### Model 3: Break Interval Optimizer
- **Algorithm:** RandomForestRegressor (150 estimators)
- **Output Range:** 15-45 minutes
- **Test R²:** ~0.65
- **Test MAE:** ~3.2 minutes
- **Top Features:** stress_factor, mental_health_rating, sleep_hours

---

## Performance Metrics

```python
from productivity_core import ProductivityPredictor

predictor = ProductivityPredictor()

# Get model metrics
metrics = predictor.get_model_info('productivity_score')
# Returns: {'r2': 0.78, 'mae': 6.5, 'top_features': [...]}
```

---

## Utility Functions

### Create Student Profile
```python
from productivity_core import create_student_profile

profile = create_student_profile(
    name="Ahmed Ali",
    features=np.array([...]),
    available_hours=8.0,
    email="ahmed@example.com"  # Additional fields
)
```

### Validate Features
```python
from productivity_core import validate_features

if validate_features(features, expected_count=19):
    print("Valid!")
```

### Format Schedule
```python
from productivity_core import format_schedule

# Text format
text = format_schedule(schedule, output_format='text')

# HTML format
html = format_schedule(schedule, output_format='html')

# JSON format
json_str = format_schedule(schedule, output_format='json')
```

### Export Schedule
```python
from productivity_core import export_schedule_to_file

export_schedule_to_file(schedule, 'schedule.json', format='json')
export_schedule_to_file(schedule, 'schedule.csv', format='csv')
export_schedule_to_file(schedule, 'schedule.txt', format='txt')
```

### Calculate Workload Balance
```python
from productivity_core import calculate_workload_balance

balance = calculate_workload_balance(week_schedules)
# Returns: {
#     'total_study_hours': 42.5,
#     'avg_daily_hours': 6.1,
#     'std_deviation': 0.8,
#     'balance_score': 92  # Higher = more balanced
# }
```

---

## Error Handling

```python
import numpy as np
from productivity_core import ProductivityPredictor, validate_features

predictor = ProductivityPredictor()

try:
    # Validate features first
    if not validate_features(features):
        raise ValueError("Invalid features!")
    
    # Make prediction
    score, confidence = predictor.predict_productivity_score(
        features,
        return_confidence=True
    )
    
    if confidence < 0.6:
        print("Warning: Low confidence prediction")
        
except FileNotFoundError as e:
    print(f"Model files not found: {e}")
except ValueError as e:
    print(f"Invalid input: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

---

## Key Features

✅ **ML-Powered Predictions**
- Regression models trained on 500+ student records
- Confidence scores for all predictions
- Feature importance analysis

✅ **Intelligent Prioritization**
- Deadline urgency + complexity + effort + student capability
- Weighted priority scoring (0-100)
- Automatic task ranking

✅ **Smart Break Scheduling**
- Pomodoro technique with dynamic intervals
- Stress-aware break durations
- Islamic prayer (Namaz) break support

✅ **Schedule Optimization**
- Daily and weekly schedule generation
- Workload balancing
- Constraint-aware time allocation

✅ **Flexible Output**
- JSON, CSV, HTML, TXT formats
- File export capabilities
- API-ready structure

---

## Dependencies

- numpy >= 1.20
- scikit-learn >= 0.24
- joblib >= 1.0
- pandas >= 1.2 (optional, for data processing)

---

## Installation & Setup

### 1. Train Models (Jupyter Notebook)
```bash
# Run Productivity_Regression_Model.ipynb to generate model artifacts
# This creates:
# - artifacts/productivity_score_model.pkl
# - artifacts/required_hours_model.pkl
# - artifacts/break_interval_model.pkl
# - artifacts/model_metadata.json
```

### 2. Use Package
```python
from productivity_core import IntelligentScheduler
import numpy as np

scheduler = IntelligentScheduler()
# Ready to use!
```

---

## Testing

Run the example usage script:
```bash
python example_usage.py
```

---

## Future Enhancements

- [ ] Integration with Google Calendar API
- [ ] Real-time progress tracking
- [ ] Adaptive learning from actual completion data
- [ ] Multi-language support
- [ ] Mobile app integration
- [ ] Advanced optimization algorithms (genetic algorithms, linear programming)
- [ ] Peer comparison and benchmarking
- [ ] Health and wellness recommendations

---

## Support

For issues, questions, or contributions, please refer to the main project repository:
https://github.com/Umer529/Ai_productivity_maximizer

---

## License

AI Productivity Maximizer © 2026 - Educational Use
