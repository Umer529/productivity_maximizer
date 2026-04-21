# Integration Guide: Productivity Core with Backend

This document explains how to integrate the ML-powered `productivity_core` Python package with the existing Node.js Express backend.

## Overview

The backend currently uses **heuristic-based scheduling** in `aiSchedulerService.js`. We'll enhance it by integrating **ML predictions** from `productivity_core` for:

1. **Task Prioritization** - Replace `computeUrgencyScore()` with ML predictions
2. **Study Hours Estimation** - Use predicted required hours instead of heuristics
3. **Break Interval Optimization** - Dynamically adjust Pomodoro intervals
4. **Schedule Generation** - Enhance `generateStudySchedule()` with ML inputs

---

## Architecture Options

### Option A: Python Subprocess (Simple, Recommended for Testing)

**Pros:**
- Easy to implement
- No separate deployment
- Direct Python execution

**Cons:**
- Subprocess overhead
- Not ideal for high frequency calls
- Cold start latency

```javascript
// backend/src/services/mlScheduler.js
const { spawn } = require('child_process');
const path = require('path');

function callPythonPredictor(studentFeatures, taskData) {
    return new Promise((resolve, reject) => {
        const pythonScript = path.join(__dirname, '../../python/predictor.py');
        const python = spawn('python', [pythonScript]);
        
        let output = '';
        
        python.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        python.on('close', (code) => {
            if (code === 0) {
                resolve(JSON.parse(output));
            } else {
                reject(new Error(`Python process exited with code ${code}`));
            }
        });
        
        python.stdin.write(JSON.stringify({
            features: studentFeatures,
            taskData: taskData
        }));
        python.stdin.end();
    });
}
```

### Option B: REST API (Microservice, Production)

**Pros:**
- Scalable
- Can be deployed separately
- Better performance with caching
- Language independent

**Cons:**
- Requires separate deployment
- More infrastructure
- Network overhead

```bash
# Start Python Flask server
python backend/python/ml_server.py --port 5000

# Backend calls via HTTP
POST http://localhost:5000/predict
Content-Type: application/json

{
  "student_features": [...],
  "method": "all"
}
```

### Option C: Node.js Native (Complex, Not Recommended)

- Would require ONNX model conversion or Node.js ML library
- Higher complexity
- Good for final production if Python dependency is a constraint

---

## Implementation Plan

### Step 1: Create Python Wrapper Script

Create `backend/python/predictor.py`:

```python
#!/usr/bin/env python3
"""
ML Prediction wrapper for backend integration.
Reads JSON input, makes predictions, outputs JSON.
"""

import sys
import json
import numpy as np
from pathlib import Path

# Add productivity_core to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from productivity_core import (
    ProductivityPredictor,
    TaskPrioritizer,
    BreakOptimizer
)

def predict_for_student(student_features, tasks=None, method='all'):
    """
    Make predictions for a student.
    
    Args:
        student_features: List of 19 features
        tasks: Optional list of task dicts for prioritization
        method: 'productivity' | 'hours' | 'breaks' | 'all'
    
    Returns:
        Dict with predictions
    """
    features = np.array(student_features)
    predictor = ProductivityPredictor(
        models_dir="artifacts"  # Relative to project root
    )
    
    results = {}
    
    if method in ['productivity', 'all']:
        results['productivity_score'] = {
            'value': float(predictor.predict_productivity_score(features)),
            'confidence': float(predictor.predict_productivity_score(features, return_confidence=True)[1])
        }
    
    if method in ['hours', 'all']:
        hours, conf = predictor.predict_required_hours(features, return_confidence=True)
        results['required_hours'] = {
            'value': float(hours),
            'confidence': float(conf)
        }
    
    if method in ['breaks', 'all']:
        breaks, conf = predictor.predict_optimal_break_interval(features, return_confidence=True)
        results['break_interval'] = {
            'value': float(breaks),
            'confidence': float(conf)
        }
    
    if method == 'all' and tasks:
        prioritizer = TaskPrioritizer(predictor)
        prioritized = prioritizer.prioritize_tasks(tasks, features)
        results['prioritized_tasks'] = [
            {
                'name': t['name'],
                'priority_score': float(t['priority_score']),
                'estimated_completion_time': float(
                    prioritizer.estimate_completion_time(t, features)
                )
            }
            for t in prioritized
        ]
    
    return results

def main():
    try:
        # Read JSON from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Extract parameters
        features = input_data.get('features', [])
        tasks = input_data.get('tasks', [])
        method = input_data.get('method', 'all')
        
        # Make predictions
        results = predict_for_student(features, tasks, method)
        
        # Output JSON
        print(json.dumps(results))
        sys.exit(0)
        
    except Exception as e:
        error_result = {'error': str(e)}
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
```

### Step 2: Create Enhanced AI Scheduler Service

Modify `backend/src/services/aiSchedulerService.js`:

```javascript
// NEW: ML-based scheduler
const MLScheduler = require('./mlScheduler');

// Existing code...

/**
 * ENHANCED: Uses ML predictions instead of heuristics
 */
async function generateStudyScheduleV2(user, tasks, date) {
    try {
        // Get user features from database (or compute from user data)
        const studentFeatures = await extractStudentFeatures(user);
        
        // Get ML predictions
        const predictions = await MLScheduler.predictStudent(
            studentFeatures,
            tasks
        );
        
        // Use predictions to enhance schedule
        const enhancedTasks = tasks.map(task => ({
            ...task,
            priority_score: predictions.prioritized_tasks
                .find(t => t.name === task.title)
                ?.priority_score || 50,
            estimated_hours: predictions.prioritized_tasks
                .find(t => t.name === task.title)
                ?.estimated_completion_time || task.estimatedDuration
        }));
        
        // Use ML predictions for break intervals
        const breakIntervals = {
            short_break: 5,  // Default
            long_break: 15,
            session_interval: 4
        };
        
        if (predictions.break_interval) {
            breakIntervals.short_break = Math.ceil(
                predictions.break_interval.value / 4
            );
            breakIntervals.long_break = Math.ceil(
                predictions.break_interval.value
            );
        }
        
        // Generate schedule with ML-enhanced configuration
        return generateOptimizedSchedule(
            user,
            enhancedTasks,
            date,
            breakIntervals,
            predictions.productivity_score?.value || 50
        );
        
    } catch (error) {
        console.error('ML Schedule generation failed:', error);
        // Fallback to original heuristic method
        return generateStudySchedule(user, tasks, date);
    }
}

/**
 * Extract student features from user data for ML prediction
 */
async function extractStudentFeatures(user) {
    // Map database user object to 19 ML features
    // This depends on your data structure
    
    return [
        user.age,
        encodeGender(user.gender),
        user.studyHoursPerDay || 0,
        user.socialMediaHours || 0,
        user.netflixHours || 0,
        user.hasPartTimeJob ? 1 : 0,
        user.attendancePercentage || 0,
        user.sleepHours || 8,
        encodeDietQuality(user.dietQuality),
        user.exerciseFrequency || 0,
        encodeEducationLevel(user.parentalEducationLevel),
        encodeInternetQuality(user.internetQuality),
        user.mentalHealthRating || 5,
        user.extraCurricularParticipation ? 1 : 0,
        // Derived features (compute or approximate)
        computeProductivityIndex(user),
        computeStressFactor(user),
        computeEngagementScore(user),
        computeTimeEfficiency(user),
        computeLifeBalanceScore(user)
    ];
}

// Helper encoders
function encodeGender(gender) {
    const map = { 'Male': 1, 'Female': 0, 'Other': 2 };
    return map[gender] || 0;
}

function encodeDietQuality(quality) {
    const map = { 'Poor': 0, 'Fair': 1, 'Good': 2 };
    return map[quality] || 1;
}

// ... other encoder functions ...
```

### Step 3: Create ML Scheduler Module

Create `backend/src/services/mlScheduler.js`:

```javascript
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class MLScheduler {
    constructor() {
        this.pythonScript = path.join(
            __dirname,
            '../../python/predictor.py'
        );
        this.cache = new Map();  // Simple in-memory cache
        this.cacheTimeout = 300000;  // 5 minutes
    }
    
    /**
     * Predict student productivity and task priorities
     */
    async predictStudent(features, tasks = null) {
        // Create cache key
        const cacheKey = this._getCacheKey(features, tasks);
        
        // Check cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        // Call Python predictor
        const predictions = await this._callPythonPredictor(features, tasks);
        
        // Cache result
        this.cache.set(cacheKey, {
            data: predictions,
            timestamp: Date.now()
        });
        
        return predictions;
    }
    
    /**
     * Call Python predictor subprocess
     */
    _callPythonPredictor(features, tasks) {
        return new Promise((resolve, reject) => {
            const python = spawn('python', [this.pythonScript]);
            
            let output = '';
            let error = '';
            
            python.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            python.stderr.on('data', (data) => {
                error += data.toString();
            });
            
            python.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output);
                        resolve(result);
                    } catch (e) {
                        reject(new Error(`Invalid JSON from predictor: ${output}`));
                    }
                } else {
                    reject(new Error(
                        `Predictor failed (${code}): ${error}`
                    ));
                }
            });
            
            python.on('error', (err) => {
                reject(new Error(
                    `Failed to spawn Python process: ${err.message}`
                ));
            });
            
            // Send input
            const inputData = {
                features: features,
                tasks: tasks || [],
                method: 'all'
            };
            
            python.stdin.write(JSON.stringify(inputData));
            python.stdin.end();
            
            // Timeout after 30 seconds
            setTimeout(() => {
                python.kill();
                reject(new Error('Python predictor timeout'));
            }, 30000);
        });
    }
    
    /**
     * Get cache key for predictions
     */
    _getCacheKey(features, tasks) {
        const featureString = JSON.stringify(features);
        const taskString = JSON.stringify(tasks || []);
        return `${featureString}|${taskString}`;
    }
    
    /**
     * Clear cache (call periodically or on demand)
     */
    clearCache() {
        this.cache.clear();
    }
}

module.exports = new MLScheduler();
```

### Step 4: Update Route Handler

Modify `backend/src/controllers/scheduleController.js`:

```javascript
const aiSchedulerService = require('../services/aiSchedulerService');

/**
 * NEW: GET /api/v1/schedule/ml-optimized
 * Generate ML-optimized schedule
 */
exports.getMLOptimizedSchedule = async (req, res) => {
    try {
        const { date } = req.query;
        const user = req.user;  // From auth middleware
        
        // Get user's tasks
        const tasks = await Task.find({
            userId: user._id,
            status: ['pending', 'in_progress']
        });
        
        // Generate ML-based schedule
        const schedule = await aiSchedulerService.generateStudyScheduleV2(
            user,
            tasks,
            date || new Date()
        );
        
        res.json({
            success: true,
            data: schedule,
            method: 'ml-optimized'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * NEW: POST /api/v1/schedule/task-priority-analysis
 * Get ML-based priority scores for tasks
 */
exports.getTaskPriorityAnalysis = async (req, res) => {
    try {
        const { taskIds } = req.body;
        const user = req.user;
        
        // Get tasks
        const tasks = await Task.find({
            _id: { $in: taskIds },
            userId: user._id
        });
        
        // Get ML predictions
        const studentFeatures = await aiSchedulerService
            .extractStudentFeatures(user);
        const priorities = await aiSchedulerService
            .getPrioritizedTasks(studentFeatures, tasks);
        
        res.json({
            success: true,
            data: priorities
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
```

### Step 5: Add Routes

Add to `backend/src/routes/scheduleRoutes.js`:

```javascript
const scheduleController = require('../controllers/scheduleController');
const authMiddleware = require('../middleware/auth');

router.get(
    '/ml-optimized',
    authMiddleware,
    scheduleController.getMLOptimizedSchedule
);

router.post(
    '/task-priority-analysis',
    authMiddleware,
    scheduleController.getTaskPriorityAnalysis
);

module.exports = router;
```

---

## Deployment Considerations

### Development
```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: ML Service (if using REST API option)
cd python
python ml_server.py

# Terminal 3: Frontend
cd frontend
npm start
```

### Production

#### Option 1: Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - ML_SERVICE_URL=http://ml-service:5000
    depends_on:
      - ml-service
  
  ml-service:
    build: ./backend/python
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=production
  
  db:
    image: sqlite
    volumes:
      - ./data:/data
```

#### Option 2: Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: productivity-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: productivity-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: ML_SERVICE_URL
          value: "http://ml-service:5000"
```

---

## Testing

### Unit Tests

```javascript
// test/mlScheduler.test.js
const { expect } = require('chai');
const MLScheduler = require('../src/services/mlScheduler');

describe('ML Scheduler', () => {
    it('should predict productivity score', async () => {
        const features = [20, 1, 6, 2, 1.5, 0, 95, 7.5, ...];
        const result = await MLScheduler.predictStudent(features);
        
        expect(result).to.have.property('productivity_score');
        expect(result.productivity_score.value).to.be.within(0, 100);
    });
    
    it('should prioritize tasks', async () => {
        const features = [...];
        const tasks = [
            { name: 'Task 1', deadline: '2026-04-25', difficulty: 5 },
            { name: 'Task 2', deadline: '2026-04-23', difficulty: 3 }
        ];
        
        const result = await MLScheduler.predictStudent(features, tasks);
        expect(result.prioritized_tasks).to.have.length(2);
        expect(result.prioritized_tasks[0].priority_score)
            .to.be.greaterThan(result.prioritized_tasks[1].priority_score);
    });
});
```

### Integration Tests

```javascript
// test/schedule.integration.test.js
describe('Schedule Generation', () => {
    it('should generate ML-optimized schedule', async () => {
        const user = { /* user object */ };
        const tasks = [ /* tasks array */ ];
        
        const schedule = await aiSchedulerService
            .generateStudyScheduleV2(user, tasks, new Date());
        
        expect(schedule).to.have.property('date');
        expect(schedule).to.have.property('schedule_slots');
        expect(schedule.schedule_slots.length).to.be.greaterThan(0);
    });
});
```

---

## Monitoring & Observability

### Add Logging

```javascript
// In mlScheduler.js
_callPythonPredictor(features, tasks) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const python = spawn('python', [this.pythonScript]);
        
        python.on('close', (code) => {
            const duration = Date.now() - startTime;
            console.log(`[ML] Prediction completed in ${duration}ms`);
            
            if (code !== 0) {
                console.error(`[ML] Predictor failed with code ${code}`);
            }
        });
        
        // ... rest of implementation
    });
}
```

### Add Metrics

```javascript
// Track prediction accuracy over time
const PredictionMetrics = {
    recordPrediction: (taskId, predicted, actual) => {
        const error = Math.abs(predicted - actual);
        // Store in database for analysis
    },
    
    getAccuracy: () => {
        // Calculate MAE, RMSE, etc.
    }
};
```

---

## Migration Path

### Phase 1 (Current)
- ✅ Deploy models and Python package
- ✅ Create wrapper scripts
- ✅ Add new API endpoints (V2)

### Phase 2
- Gradually route traffic to ML endpoints
- A/B test vs. heuristic method
- Collect accuracy metrics

### Phase 3
- Replace heuristic endpoints with ML-based
- Deprecate old scheduling logic
- Monitor predictions for drift

### Phase 4
- Retrain models with collected data
- Implement continuous improvement loop
- Add advanced features (peer comparisons, etc.)

---

## Troubleshooting

### Issue: Python Process Timeout
**Solution:** Increase timeout or optimize model loading
```javascript
setTimeout(() => {
    python.kill();
    reject(new Error('Timeout'));
}, 60000);  // Increase to 60 seconds
```

### Issue: Memory Leak with Model Caching
**Solution:** Implement cache eviction policy
```javascript
clearOldCacheEntries() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
        }
    }
}
```

### Issue: Python Dependency Management
**Solution:** Use virtual environment
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

---

## References

- [productivity_core README](./productivity_core/README.md)
- [Example Usage](./example_usage.py)
- [Jupyter Notebook](./Productivity_Regression_Model.ipynb)
