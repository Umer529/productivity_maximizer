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
    BreakOptimizer,
    IntelligentScheduler,
    create_student_profile,
    validate_features
)

def predict_for_student(student_features, tasks=None, method='all', models_dir='artifacts'):
    """
    Make predictions for a student.
    
    Args:
        student_features: List of 19 features
        tasks: Optional list of task dicts for prioritization
        method: 'productivity' | 'hours' | 'breaks' | 'all' | 'schedule'
        models_dir: Path to model artifacts directory
    
    Returns:
        Dict with predictions
    """
    try:
        features = np.array(student_features, dtype=float)
        
        # Validate features
        if not validate_features(features):
            return {
                'error': 'Invalid features: expected 19 numeric values',
                'received_count': len(features) if hasattr(features, '__len__') else 0
            }
        
        predictor = ProductivityPredictor(models_dir=models_dir)
        
        results = {}
        
        if method in ['productivity', 'all', 'schedule']:
            prod_score, prod_conf = predictor.predict_productivity_score(features, return_confidence=True)
            results['productivity_score'] = {
                'value': float(prod_score),
                'confidence': float(prod_conf)
            }
        
        if method in ['hours', 'all', 'schedule']:
            hours, hours_conf = predictor.predict_required_hours(features, return_confidence=True)
            results['required_hours'] = {
                'value': float(hours),
                'confidence': float(hours_conf)
            }
        
        if method in ['breaks', 'all', 'schedule']:
            breaks, breaks_conf = predictor.predict_optimal_break_interval(features, return_confidence=True)
            results['break_interval'] = {
                'value': float(breaks),
                'confidence': float(breaks_conf)
            }
        
        if method in ['schedule', 'all'] and tasks:
            # Generate AI-optimized schedule
            prioritizer = TaskPrioritizer(predictor)
            prioritized_tasks = prioritizer.prioritize_tasks(tasks, features)
            
            scheduler = IntelligentScheduler(predictor)
            
            # Create user profile
            user_profile = create_student_profile(
                name='Student',
                features=features,
                available_hours=results.get('required_hours', {}).get('value', 8.0)
            )
            
            # Generate daily schedule
            schedule = scheduler.generate_daily_schedule(
                user_profile=user_profile,
                tasks=prioritized_tasks,
                study_start_time='08:00',
                study_end_time='22:00'
            )
            
            results['schedule'] = schedule
            results['prioritized_tasks'] = [
                {
                    'name': t['name'],
                    'priority_score': float(t.get('priority_score', 50)),
                    'difficulty': t.get('difficulty', 3),
                    'estimated_hours': float(t.get('estimated_hours', 2))
                }
                for t in prioritized_tasks
            ]
        
        elif method == 'all' and tasks:
            # Just prioritize tasks without full schedule
            prioritizer = TaskPrioritizer(predictor)
            prioritized = prioritizer.prioritize_tasks(tasks, features)
            results['prioritized_tasks'] = [
                {
                    'name': t['name'],
                    'priority_score': float(t.get('priority_score', 50)),
                    'estimated_completion_time': float(
                        prioritizer.estimate_completion_time(t, features)
                    )
                }
                for t in prioritized
            ]
        
        return results
        
    except FileNotFoundError as e:
        return {'error': f'Model file not found: {str(e)}'}
    except Exception as e:
        return {'error': f'Prediction failed: {str(e)}'}

def main():
    try:
        # Read JSON from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Extract parameters
        features = input_data.get('features', [])
        tasks = input_data.get('tasks', [])
        method = input_data.get('method', 'all')
        models_dir = input_data.get('models_dir', 'artifacts')
        
        # Make predictions
        results = predict_for_student(features, tasks, method, models_dir)
        
        # Output JSON
        print(json.dumps(results))
        sys.exit(0)
        
    except json.JSONDecodeError as e:
        error_result = {'error': f'Invalid JSON input: {str(e)}'}
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        error_result = {'error': str(e)}
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
