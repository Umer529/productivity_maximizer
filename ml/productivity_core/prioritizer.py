"""
AI-Enhanced Task Prioritization

Uses regression models to intelligently prioritize student tasks based on:
- Deadline urgency
- Task complexity
- Estimated study time (from ML predictions)
- Student productivity level
"""

import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from .models import ProductivityPredictor


class TaskPrioritizer:
    """
    Intelligent task prioritization using ML predictions.
    """

    def __init__(self, predictor: Optional[ProductivityPredictor] = None):
        """
        Initialize task prioritizer.

        Args:
            predictor: ProductivityPredictor instance (created if None)
        """
        self.predictor = predictor or ProductivityPredictor()

        # Weighting factors for priority calculation
        self.weights = {
            'urgency': 0.40,      # 40% - deadline proximity
            'complexity': 0.30,   # 30% - task difficulty
            'effort': 0.20,       # 20% - estimated time required
            'productivity': 0.10  # 10% - student's current productivity level
        }

    def compute_priority_score(
        self,
        task: Dict,
        student_features: np.ndarray,
        reference_date: Optional[datetime] = None
    ) -> float:
        """
        Compute overall priority score for a task (0-100).

        Args:
            task: Task dictionary with keys:
                - deadline (str or datetime): YYYY-MM-DD format or datetime
                - difficulty (int): 1-5 scale
                - estimated_hours (float): estimated hours needed
            student_features: Student feature array for ML prediction
            reference_date: Reference date for urgency calculation (defaults to today)

        Returns:
            Priority score (0-100)

        Raises:
            ValueError: If task format is invalid
        """
        if reference_date is None:
            reference_date = datetime.now()

        # Parse deadline
        if isinstance(task['deadline'], str):
            deadline = datetime.strptime(task['deadline'], '%Y-%m-%d')
        else:
            deadline = task['deadline']

        # 1. URGENCY SCORE (0-40)
        days_until_deadline = (deadline - reference_date).days
        if days_until_deadline < 0:
            urgency = 40  # Overdue
        elif days_until_deadline == 0:
            urgency = 40  # Due today
        else:
            # Inverse: more urgent as deadline approaches
            urgency = (40 / (days_until_deadline + 1)) * min(days_until_deadline, 10)
            urgency = min(urgency, 40)

        # 2. COMPLEXITY SCORE (0-30)
        difficulty = task.get('difficulty', 3)  # Default to medium
        complexity = (difficulty / 5.0) * 30

        # 3. EFFORT ESTIMATION (0-20)
        # Higher effort = higher priority (more urgent to schedule)
        estimated_hours = task.get('estimated_hours', 2)
        effort = (estimated_hours / 15.0) * 20  # 15 hours as max
        effort = min(effort, 20)

        # 4. STUDENT PRODUCTIVITY FACTOR (0-10)
        # Lower productivity = lower priority boost (more basic tasks first)
        # Higher productivity = can handle complex tasks
        try:
            student_prod_features = student_features.reshape(1, -1) if student_features.ndim == 1 else student_features
            productivity = self.predictor.predict_productivity_score(student_prod_features)
            productivity_factor = (productivity / 100.0) * 10
        except Exception as e:
            print(f"Warning: Could not predict productivity: {e}")
            productivity_factor = 5  # Default to neutral

        # Calculate weighted priority
        priority_score = (
            self.weights['urgency'] * urgency +
            self.weights['complexity'] * complexity +
            self.weights['effort'] * effort +
            self.weights['productivity'] * productivity_factor
        )

        return float(np.clip(priority_score, 0, 100))

    def prioritize_tasks(
        self,
        tasks: List[Dict],
        student_features: np.ndarray,
        reference_date: Optional[datetime] = None
    ) -> List[Dict]:
        """
        Sort tasks by priority score.

        Args:
            tasks: List of task dictionaries
            student_features: Student feature array for ML prediction
            reference_date: Reference date for urgency calculation

        Returns:
            Tasks sorted by priority (highest first)
        """
        if not tasks:
            return []

        # Compute priority for each task
        tasks_with_priority = []
        for task in tasks:
            priority = self.compute_priority_score(
                task, student_features, reference_date
            )
            task_copy = dict(task)
            task_copy['priority_score'] = priority
            tasks_with_priority.append(task_copy)

        # Sort by priority (descending), then by deadline as tiebreaker
        tasks_with_priority.sort(
            key=lambda t: (
                -t['priority_score'],
                datetime.strptime(t['deadline'], '%Y-%m-%d')
                if isinstance(t['deadline'], str)
                else t['deadline']
            )
        )

        return tasks_with_priority

    def estimate_completion_time(
        self,
        task: Dict,
        student_features: np.ndarray
    ) -> float:
        """
        Estimate time needed to complete a task using ML predictions.

        Args:
            task: Task dictionary
            student_features: Student feature array

        Returns:
            Estimated completion time in hours
        """
        try:
            student_prod_features = student_features.reshape(1, -1) if student_features.ndim == 1 else student_features
            student_required_hours = self.predictor.predict_required_hours(student_prod_features)

            # Adjust base estimate by task difficulty and student capacity
            base_estimate = task.get('estimated_hours', 2)
            difficulty = task.get('difficulty', 3) / 3.0  # Normalize around 1.0

            # If student needs more study hours, they're less efficient
            efficiency_factor = 8.0 / max(student_required_hours, 2)  # 8 hours is baseline
            adjusted_estimate = base_estimate * difficulty / efficiency_factor

            return float(adjusted_estimate)
        except Exception as e:
            print(f"Warning: Could not estimate completion time: {e}")
            return float(task.get('estimated_hours', 2))

    def get_priority_summary(
        self,
        tasks: List[Dict],
        student_features: np.ndarray,
        top_n: int = 5
    ) -> Dict:
        """
        Get summary of top priority tasks.

        Args:
            tasks: List of task dictionaries
            student_features: Student feature array
            top_n: Number of top tasks to return

        Returns:
            Dictionary with prioritized tasks and insights
        """
        prioritized = self.prioritize_tasks(tasks, student_features)

        return {
            'total_tasks': len(tasks),
            'top_tasks': prioritized[:top_n],
            'total_estimated_hours': sum(
                self.estimate_completion_time(t, student_features)
                for t in prioritized
            ),
            'high_urgency_count': sum(1 for t in prioritized if t['priority_score'] >= 70),
            'medium_urgency_count': sum(1 for t in prioritized if 40 <= t['priority_score'] < 70),
            'low_urgency_count': sum(1 for t in prioritized if t['priority_score'] < 40),
        }
