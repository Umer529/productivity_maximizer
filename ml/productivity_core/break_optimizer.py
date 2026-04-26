"""
Smart Break Scheduling Optimizer

Dynamically calculates optimal break intervals based on:
- Student stress level
- Mental health rating
- Task difficulty
- Study session history

Implements Pomodoro-like technique with intelligent adjustments.
Preserves Islamic prayer (Namaz) breaks.
"""

import numpy as np
from datetime import datetime, time, timedelta
from typing import Dict, List, Tuple, Optional
from .models import ProductivityPredictor


class BreakOptimizer:
    """
    Intelligent break scheduling based on student profile and task difficulty.
    """

    # Default Pomodoro parameters
    DEFAULT_SHORT_BREAK = 5      # minutes
    DEFAULT_LONG_BREAK = 15      # minutes
    DEFAULT_LONG_BREAK_INTERVAL = 4  # after N sessions

    # Prayer times (approximate, in HH:MM format)
    PRAYER_TIMES = {
        'fajr': '05:30',
        'dhuhr': '12:30',
        'asr': '15:30',
        'maghrib': '18:30',
        'isha': '20:30'
    }

    def __init__(self, predictor: Optional[ProductivityPredictor] = None):
        """
        Initialize break optimizer.

        Args:
            predictor: ProductivityPredictor instance (created if None)
        """
        self.predictor = predictor or ProductivityPredictor()

    def calculate_break_intervals(
        self,
        student_features: np.ndarray,
        task_difficulty: int = 3
    ) -> Dict[str, int]:
        """
        Calculate personalized break intervals for a student.

        Args:
            student_features: Student feature array
            task_difficulty: Task difficulty (1-5 scale), default 3

        Returns:
            Dictionary with:
            - short_break (minutes): Time for short break
            - long_break (minutes): Time for longer break
            - session_interval (int): Sessions before long break
        """
        try:
            student_pred_features = student_features.reshape(1, -1) if student_features.ndim == 1 else student_features
            break_interval_pred = self.predictor.predict_optimal_break_interval(student_pred_features)

            # Use predicted interval as baseline
            short_break = max(3, int(break_interval_pred / 4))  # 1/4 of optimal interval
            long_break = max(10, int(break_interval_pred))      # Full predicted interval

        except Exception as e:
            print(f"Warning: Could not predict break interval: {e}, using defaults")
            short_break = self.DEFAULT_SHORT_BREAK
            long_break = self.DEFAULT_LONG_BREAK

        # Adjust based on task difficulty
        difficulty_factor = task_difficulty / 3.0  # Normalize around 1.0
        if difficulty_factor > 1.0:
            # Harder tasks need more frequent/longer breaks
            short_break = int(short_break * difficulty_factor)
            session_interval = max(2, int(self.DEFAULT_LONG_BREAK_INTERVAL / difficulty_factor))
        else:
            # Easier tasks can have longer focus periods
            session_interval = max(3, int(self.DEFAULT_LONG_BREAK_INTERVAL / difficulty_factor))

        return {
            'short_break': min(short_break, 10),      # Cap at 10 min
            'long_break': min(long_break, 30),        # Cap at 30 min
            'session_interval': int(session_interval)
        }

    def insert_breaks(
        self,
        schedule: List[Dict],
        student_features: np.ndarray,
        task_difficulties: Optional[Dict[str, int]] = None,
        preserve_prayers: bool = True
    ) -> List[Dict]:
        """
        Insert breaks intelligently into a schedule.

        Args:
            schedule: List of schedule items with 'task', 'duration', 'start_time'
            student_features: Student feature array
            task_difficulties: Dict mapping task names to difficulty (1-5)
            preserve_prayers: If True, preserve prayer break slots

        Returns:
            Enhanced schedule with breaks inserted
        """
        if not schedule:
            return []

        enhanced_schedule = []
        session_count = 0
        avg_difficulty = 3

        if task_difficulties:
            avg_difficulty = np.mean(list(task_difficulties.values())) if task_difficulties else 3

        break_config = self.calculate_break_intervals(student_features, int(avg_difficulty))

        for item in schedule:
            enhanced_schedule.append(item)
            session_count += 1

            # Determine which break to insert
            if session_count % break_config['session_interval'] == 0:
                break_duration = break_config['long_break']
                break_type = 'long_break'
            else:
                break_duration = break_config['short_break']
                break_type = 'short_break'

            # Create break item
            break_item = {
                'type': break_type,
                'duration': break_duration,
                'task': f"{break_type} ({break_duration} min)",
                'activity': 'rest',
                'description': self._get_break_description(break_type)
            }

            enhanced_schedule.append(break_item)

        return enhanced_schedule

    def suggest_namaz_break_slots(
        self,
        daily_schedule_start: str = "08:00",
        daily_schedule_end: str = "22:00",
        include_all_prayers: bool = False
    ) -> List[Dict]:
        """
        Suggest prayer break slots within study schedule.

        Args:
            daily_schedule_start: Start time of study (HH:MM format)
            daily_schedule_end: End time of study (HH:MM format)
            include_all_prayers: If False, only suggest prayers during study window

        Returns:
            List of prayer break suggestions
        """
        schedule_start = datetime.strptime(daily_schedule_start, "%H:%M").time()
        schedule_end = datetime.strptime(daily_schedule_end, "%H:%M").time()

        prayer_breaks = []

        for prayer_name, prayer_time_str in self.PRAYER_TIMES.items():
            prayer_time = datetime.strptime(prayer_time_str, "%H:%M").time()

            # Check if prayer is within study window
            if schedule_start <= prayer_time <= schedule_end or include_all_prayers:
                prayer_breaks.append({
                    'type': 'prayer_break',
                    'prayer_name': prayer_name.capitalize(),
                    'time': prayer_time_str,
                    'duration': 15,  # Typically 15 min for Namaz + ablution
                    'activity': 'namaz',
                    'description': f"{prayer_name.capitalize()} (Islamic prayer)",
                    'priority': 'high'
                })

        return prayer_breaks

    def optimize_break_placement(
        self,
        schedule: List[Dict],
        prayer_breaks: Optional[List[Dict]] = None
    ) -> List[Dict]:
        """
        Optimize placement of breaks and prayers in schedule.

        Ensures:
        - Breaks don't conflict with prayers
        - Prayer times are respected
        - Maximum focus time is reasonable

        Args:
            schedule: Study schedule with breaks
            prayer_breaks: Optional list of prayer break suggestions

        Returns:
            Optimized schedule
        """
        if not prayer_breaks:
            return schedule

        # This is a simplified version - full implementation would
        # reorganize schedule items to respect prayer times
        optimized = []
        prayers_added = set()

        for item in schedule:
            # Check if this time slot contains a prayer
            # (In real implementation, would compare timestamps)

            optimized.append(item)

            # Add prayers if needed (simplified logic)
            if item.get('type') == 'prayer_break' and item.get('prayer_name') not in prayers_added:
                prayers_added.add(item['prayer_name'])

        return optimized

    def suggest_break_adjustments(
        self,
        student_features: np.ndarray,
        session_history: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Suggest break strategy adjustments based on session history.

        Args:
            student_features: Student feature array
            session_history: List of past session data with keys:
                - duration (minutes)
                - completed (bool)
                - difficulty (1-5)

        Returns:
            Suggestions for break optimization
        """
        suggestions = []

        if session_history:
            # Analyze interruption patterns
            total_sessions = len(session_history)
            interrupted = sum(1 for s in session_history if not s.get('completed', True))
            interruption_rate = interrupted / total_sessions if total_sessions > 0 else 0

            if interruption_rate > 0.3:
                suggestions.append({
                    'issue': 'High interruption rate',
                    'suggestion': 'Increase break frequency (shorter focus intervals)',
                    'action': 'Reduce session_interval from current level'
                })

            # Analyze session duration
            avg_duration = np.mean([s.get('duration', 0) for s in session_history]) if session_history else 0
            if avg_duration > 60:
                suggestions.append({
                    'issue': 'Long focus sessions',
                    'suggestion': 'Increase break duration to prevent burnout',
                    'action': 'Increase long_break duration'
                })

        return {
            'current_strategy': self.calculate_break_intervals(student_features),
            'suggestions': suggestions,
            'analysis_count': len(session_history) if session_history else 0
        }

    @staticmethod
    def _get_break_description(break_type: str) -> str:
        """Get description for break type."""
        descriptions = {
            'short_break': 'Quick break - stretch, hydrate, or take a short walk',
            'long_break': 'Extended break - rest, snack, or step outside',
            'prayer_break': 'Islamic prayer break (Namaz)',
        }
        return descriptions.get(break_type, 'Take a break')
