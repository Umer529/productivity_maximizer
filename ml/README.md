# ML Module — FocusFlow AI

This directory contains the Python machine learning components of FocusFlow AI.

## Structure

```
ml/
├── productivity_core/      Python inference package (imported by backend)
│   ├── __init__.py
│   ├── models.py           ProductivityPredictor — loads and runs .pkl models
│   ├── scheduler.py        IntelligentScheduler — generates daily timetables
│   ├── prioritizer.py      TaskPrioritizer — urgency-weighted task ordering
│   ├── break_optimizer.py  BreakOptimizer — optimal break interval calculation
│   └── utils.py            Feature validation, student profile helpers
│
├── models/                 Trained scikit-learn model artifacts
│   ├── productivity_score_model.pkl
│   ├── required_hours_model.pkl
│   ├── break_interval_model.pkl
│   └── model_metadata.json
│
├── training/               Model training notebooks
│   ├── Productivity_Regression_Model.ipynb   Main training notebook
│   └── BCS-D-21.ipynb                        Exploratory data analysis
│
├── data/                   Training dataset
│   └── student_habits_performance.csv        19-feature student lifestyle data
│
└── scripts/                Utility scripts
    ├── example_usage.py    Demonstrates the productivity_core API
    └── create_placeholder_models.py  Creates dummy models for dev/testing
```

## Models

Three regression models are trained on `data/student_habits_performance.csv`:

| Model file | Target | Algorithm |
|-----------|--------|-----------|
| `productivity_score_model.pkl` | Productivity score (0–100) | Random Forest Regressor |
| `required_hours_model.pkl` | Recommended study hours/day | Random Forest Regressor |
| `break_interval_model.pkl` | Optimal break interval (min) | Random Forest Regressor |

**Input features (19):** age, gender, social media hours, Netflix hours, part-time job, attendance %, sleep hours, diet quality, exercise frequency, parental education, internet quality, mental health rating, extra-curricular participation, productivity index, stress factor, engagement score, time efficiency, life balance score, CGPA target.

## Backend Integration

The Node.js backend calls `backend/python/predictor.py` as a subprocess, passing a JSON payload on stdin and reading JSON results on stdout.

```
mlScheduler.js → spawns predictor.py → imports productivity_core → loads ml/models/*.pkl → returns predictions
```

## Retraining

1. Open `training/Productivity_Regression_Model.ipynb`
2. Run all cells
3. The notebook saves updated `.pkl` files to `models/`
4. Restart the backend server to load the new models

## Dependencies

```bash
pip install -r ../requirements.txt
# scikit-learn>=1.3.0, numpy>=1.24.0, pandas>=2.0.0, joblib>=1.3.0
```
