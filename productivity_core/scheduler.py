"""
Intelligent Schedule Generator

Combines all ML models and optimization techniques to generate
AI-powered daily and weekly study schedules.

Key features:
- ML-based task prioritization
- Intelligent break scheduling
- Prayer break integration
- Dynamic time allocation
- Workload distribution
"""

import numpy as np
from datetime import datetime, timedelta, time
from typing import Dict, List, Optional, Tuple
from .models import ProductivityPredictor
from .prioritizer import TaskPrioritizer
from .break_optimizer import BreakOptimizer


class IntelligentScheduler:
    """
    Generates AI-optimized study schedules using regression models.
    """

    def __init__(
        self,
        predictor: Optional[ProductivityPredictor] = None,
        prioritizer: Optional[TaskPrioritizer] = None,
        break_optimizer: Optional[BreakOptimizer] = None
    ):
        """
        Initialize scheduler with components.

        Args:
            predictor: ProductivityPredictor instance
            prioritizer: TaskPrioritizer instance
            break_optimizer: BreakOptimizer instance
        """
        self.predictor = predictor or ProductivityPredictor()
        self.prioritizer = prioritizer or TaskPrioritizer(self.predictor)
        self.break_optimizer = break_optimizer or BreakOptimizer(self.predictor)

    def generate_daily_schedule(
        self,
        user_profile: Dict,
        tasks: List[Dict],
        target_date: Optional[datetime] = None,
        study_start_time: str = "08:00",
        study_end_time: str = "22:00"
    ) -> Dict:
        """
        Generate optimized daily study schedule.

        Args:
            user_profile: Student profile dictionary with keys:
                - features (np.ndarray): ML feature vector
                - name (str): Student name
                - available_hours (float): Total hours available for study
            tasks: List of tasks for the day with keys:
                - name (str): Task name
                - deadline (datetime or str): YYYY-MM-DD
                - difficulty (int): 1-5
                - estimated_hours (float): Estimated time needed
            target_date: Date to generate schedule for (defaults to today)
            study_start_time: Study window start (HH:MM format)
            study_end_time: Study window end (HH:MM format)

        Returns:
            Daily schedule dictionary with:
            - date: Target date
            - student_name: Student name
            - schedule: List of time slots
            - analytics: Summary statistics
        """
        if target_date is None:
            target_date = datetime.now()

        if isinstance(target_date, str):
            target_date = datetime.strptime(target_date, '%Y-%m-%d')

        # Get student predictions
        student_features = user_profile['features']
        productivity_score = self.predictor.predict_productivity_score(student_features)
        required_hours = self.predictor.predict_required_hours(student_features)
        optimal_break_interval = self.predictor.predict_optimal_break_interval(student_features)

        # Prioritize tasks
        prioritized_tasks = self.prioritizer.prioritize_tasks(
            tasks, student_features, target_date
        )

        # Get break configuration
        break_config = self.break_optimizer.calculate_break_intervals(
            student_features,
            int(np.mean([t.get('difficulty', 3) for t in prioritized_tasks]))
        )

        # Get prayer times
        prayer_breaks = self.break_optimizer.suggest_namaz_break_slots(
            study_start_time, study_end_time, include_all_prayers=False
        )

        # Generate time slots
        schedule_slots = self._allocate_time_slots(
            prioritized_tasks,
            study_start_time,
            study_end_time,
            break_config,
            prayer_breaks,
            user_profile.get('available_hours', 8)
        )

        # Build schedule dictionary
        schedule_dict = {
            'date': target_date.strftime('%Y-%m-%d'),
            'student_name': user_profile.get('name', 'Student'),
            'student_productivity': productivity_score,
            'recommended_study_hours': required_hours,
            'schedule_slots': schedule_slots,
            'analytics': {
                'total_tasks': len(tasks),
                'prioritized_tasks': len(prioritized_tasks),
                'total_study_time': self._calculate_total_study_time(schedule_slots),
                'break_count': sum(1 for s in schedule_slots if s.get('type') in ['short_break', 'long_break']),
                'prayer_breaks': len(prayer_breaks),
                'productivity_level': self._categorize_productivity(productivity_score),
            }
        }

        return schedule_dict

    def generate_weekly_schedule(
        self,
        user_profile: Dict,
        tasks: List[Dict],
        start_date: Optional[datetime] = None,
        study_start_time: str = "08:00",
        study_end_time: str = "22:00"
    ) -> Dict:
        """
        Generate optimized 7-day study schedule.

        Args:
            user_profile: Student profile dictionary
            tasks: List of all tasks for the week
            start_date: Start date for the week (Monday, defaults to this week)
            study_start_time: Study window start (HH:MM format)
            study_end_time: Study window end (HH:MM format)

        Returns:
            Weekly schedule dictionary
        """
        if start_date is None:
            start_date = datetime.now()
            # Move to Monday
            start_date -= timedelta(days=start_date.weekday())

        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, '%Y-%m-%d')

        # Generate daily schedules
        week_schedule = {
            'week_start': start_date.strftime('%Y-%m-%d'),
            'week_end': (start_date + timedelta(days=6)).strftime('%Y-%m-%d'),
            'daily_schedules': [],
            'weekly_analytics': {}
        }

        # Get tasks for each day (simple distribution - could be more sophisticated)
        tasks_per_day = self._distribute_tasks_weekly(tasks, 7)

        for day_offset in range(7):
            current_date = start_date + timedelta(days=day_offset)
            day_tasks = tasks_per_day.get(day_offset, [])

            # Generate daily schedule
            daily_schedule = self.generate_daily_schedule(
                user_profile,
                day_tasks,
                current_date,
                study_start_time,
                study_end_time
            )

            week_schedule['daily_schedules'].append(daily_schedule)

        # Compute weekly analytics
        week_schedule['weekly_analytics'] = self._compute_weekly_analytics(
            week_schedule['daily_schedules']
        )

        return week_schedule

    def _allocate_time_slots(
        self,
        tasks: List[Dict],
        start_time: str,
        end_time: str,
        break_config: Dict,
        prayer_breaks: List[Dict],
        available_hours: float
    ) -> List[Dict]:
        """
        Allocate tasks to time slots with breaks and prayers.

        Args:
            tasks: Prioritized task list
            start_time: Study start time (HH:MM)
            end_time: Study end time (HH:MM)
            break_config: Break configuration
            prayer_breaks: Prayer break suggestions
            available_hours: Total available study hours

        Returns:
            List of scheduled time slots
        """
        schedule = []
        current_time = datetime.strptime(start_time, "%H:%M").time()
        end_time_obj = datetime.strptime(end_time, "%H:%M").time()

        # Convert to minutes for easier calculation
        current_minutes = current_time.hour * 60 + current_time.minute
        end_minutes = end_time_obj.hour * 60 + end_time_obj.minute
        available_minutes = end_minutes - current_minutes
        available_study_minutes = int(available_hours * 60)

        session_count = 0

        for task in tasks:
            if current_minutes >= end_minutes:
                break

            # Estimate time for this task
            task_duration = min(
                int(task.get('estimated_hours', 1) * 60),
                available_study_minutes - 30  # Leave buffer
            )

            # Check if we have time
            if current_minutes + task_duration > end_minutes:
                task_duration = end_minutes - current_minutes - 10

            if task_duration > 0:
                # Add task slot
                start_h = current_minutes // 60
                start_m = current_minutes % 60
                schedule.append({
                    'type': 'study',
                    'task': task['name'],
                    'priority': task.get('priority_score', 50),
                    'difficulty': task.get('difficulty', 3),
                    'start_time': f"{start_h:02d}:{start_m:02d}",
                    'duration': task_duration,
                    'activity': 'focused_study'
                })

                current_minutes += task_duration
                session_count += 1
                available_study_minutes -= task_duration

                # Add break if needed
                if session_count % break_config['session_interval'] == 0:
                    break_duration = break_config['long_break']
                else:
                    break_duration = break_config['short_break']

                if current_minutes + break_duration <= end_minutes:
                    start_h = current_minutes // 60
                    start_m = current_minutes % 60
                    schedule.append({
                        'type': 'break',
                        'task': f"Break ({break_duration} min)",
                        'start_time': f"{start_h:02d}:{start_m:02d}",
                        'duration': break_duration,
                        'activity': 'rest'
                    })
                    current_minutes += break_duration

        # Insert prayer breaks (simplified logic)
        for prayer in prayer_breaks:
            schedule.append({
                'type': 'prayer_break',
                'task': prayer['prayer_name'],
                'prayer': prayer['prayer_name'],
                'duration': prayer['duration'],
                'activity': 'namaz'
            })

        return sorted(schedule, key=lambda x: x.get('start_time', '00:00'))

    def _distribute_tasks_weekly(
        self,
        tasks: List[Dict],
        num_days: int = 7
    ) -> Dict[int, List[Dict]]:
        """
        Distribute tasks across week based on deadlines and priority.

        Args:
            tasks: List of tasks
            num_days: Number of days to distribute across

        Returns:
            Dictionary mapping day index to tasks for that day
        """
        distribution = {i: [] for i in range(num_days)}

        # Sort by deadline and priority
        sorted_tasks = sorted(
            tasks,
            key=lambda t: (
                datetime.strptime(t['deadline'], '%Y-%m-%d')
                if isinstance(t['deadline'], str)
                else t['deadline'],
                -t.get('priority_score', 50)
            )
        )

        # Distribute tasks
        for i, task in enumerate(sorted_tasks):
            day_index = i % num_days
            distribution[day_index].append(task)

        return distribution

    def _calculate_total_study_time(self, schedule_slots: List[Dict]) -> int:
        """Calculate total study time (excluding breaks) in minutes."""
        study_time = sum(
            slot.get('duration', 0)
            for slot in schedule_slots
            if slot.get('type') == 'study'
        )
        return study_time

    def _compute_weekly_analytics(self, daily_schedules: List[Dict]) -> Dict:
        """Compute analytics for weekly schedule."""
        total_study_time = sum(
            s.get('analytics', {}).get('total_study_time', 0)
            for s in daily_schedules
        )

        return {
            'week_total_study_hours': total_study_time / 60,
            'days_scheduled': len(daily_schedules),
            'avg_daily_study_hours': (total_study_time / 60) / len(daily_schedules) if daily_schedules else 0,
            'total_breaks': sum(
                s.get('analytics', {}).get('break_count', 0)
                for s in daily_schedules
            ),
            'total_prayer_slots': sum(
                s.get('analytics', {}).get('prayer_breaks', 0)
                for s in daily_schedules
            ),
        }

    @staticmethod
    def _categorize_productivity(score: float) -> str:
        """Categorize productivity score."""
        if score >= 80:
            return "Excellent"
        elif score >= 60:
            return "Good"
        elif score >= 40:
            return "Average"
        elif score >= 20:
            return "Below Average"
        else:
            return "Needs Support"
