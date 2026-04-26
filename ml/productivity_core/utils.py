"""
Utility Functions for Productivity Core

Helper functions for:
- Student profile creation
- Feature validation
- Schedule formatting
- Data processing
"""

import numpy as np
from typing import Dict, List, Optional
from datetime import datetime


def create_student_profile(
    name: str,
    features: np.ndarray,
    available_hours: float = 8.0,
    **kwargs
) -> Dict:
    """
    Create a student profile dictionary for scheduling.

    Args:
        name: Student name
        features: ML feature array (must match 19 features from model training)
        available_hours: Total hours available for study per day
        **kwargs: Additional profile attributes

    Returns:
        Student profile dictionary

    Raises:
        ValueError: If features have wrong shape
    """
    if isinstance(features, list):
        features = np.array(features)

    if features.ndim == 2:
        features = features.reshape(-1)

    # Expected number of features from trained models
    expected_features = 19

    if len(features) != expected_features:
        raise ValueError(
            f"Expected {expected_features} features, got {len(features)}"
        )

    profile = {
        'name': name,
        'features': features,
        'available_hours': float(available_hours),
        'created_at': datetime.now().isoformat(),
        **kwargs
    }

    return profile


def validate_features(features: np.ndarray, expected_count: int = 19) -> bool:
    """
    Validate that features have correct shape and type.

    Args:
        features: Feature array to validate
        expected_count: Expected number of features

    Returns:
        True if valid, False otherwise
    """
    if not isinstance(features, np.ndarray):
        return False

    if features.ndim > 2:
        return False

    if features.ndim == 2 and features.shape[0] != 1:
        return False

    feature_count = features.shape[0] if features.ndim == 1 else features.shape[1]

    if feature_count != expected_count:
        return False

    return True


def format_schedule(schedule_dict: Dict, output_format: str = 'text') -> str:
    """
    Format schedule dictionary for display.

    Args:
        schedule_dict: Schedule dictionary from generate_daily_schedule()
        output_format: 'text', 'html', or 'json'

    Returns:
        Formatted schedule string
    """
    if output_format == 'json':
        import json
        return json.dumps(schedule_dict, indent=2)

    elif output_format == 'html':
        return _format_schedule_html(schedule_dict)

    else:  # text
        return _format_schedule_text(schedule_dict)


def _format_schedule_text(schedule_dict: Dict) -> str:
    """Format schedule as plain text."""
    output = []
    output.append("=" * 70)
    output.append(f"STUDY SCHEDULE - {schedule_dict['date']}")
    output.append(f"Student: {schedule_dict['student_name']}")
    output.append("=" * 70)

    output.append(f"\nPRODUCTIVITY ANALYSIS:")
    output.append(f"  Current Productivity Level: {schedule_dict['student_productivity']:.1f}/100")
    output.append(f"  Recommended Daily Study: {schedule_dict['recommended_study_hours']:.1f} hours")
    output.append(f"  Productivity Category: {schedule_dict['analytics']['productivity_level']}")

    output.append(f"\nSCHEDULE ({len(schedule_dict['schedule_slots'])} time slots):")
    output.append("-" * 70)

    for slot in schedule_dict['schedule_slots']:
        slot_type = slot.get('type', 'study').upper()
        task = slot.get('task', 'N/A')
        duration = slot.get('duration', 0)
        time_str = slot.get('start_time', 'TBD')

        status_icon = {
            'study': '📚',
            'break': '☕',
            'prayer_break': '🕌',
            'long_break': '🏃'
        }.get(slot.get('type'), '⏱️')

        output.append(
            f"  {status_icon} [{time_str}] {slot_type:15} | {task:30} ({duration} min)"
        )

    output.append("\nSUMMARY:")
    output.append(f"  Total Tasks: {schedule_dict['analytics']['total_tasks']}")
    output.append(f"  Scheduled Tasks: {schedule_dict['analytics']['prioritized_tasks']}")
    output.append(f"  Total Study Time: {schedule_dict['analytics']['total_study_time']} minutes")
    output.append(f"  Breaks Scheduled: {schedule_dict['analytics']['break_count']}")
    output.append(f"  Prayer Breaks: {schedule_dict['analytics']['prayer_breaks']}")
    output.append("=" * 70)

    return "\n".join(output)


def _format_schedule_html(schedule_dict: Dict) -> str:
    """Format schedule as HTML."""
    html = []
    html.append("<html><head><title>Study Schedule</title></head><body>")
    html.append("<style>")
    html.append("  table { border-collapse: collapse; width: 100%; }")
    html.append("  th, td { border: 1px solid black; padding: 8px; text-align: left; }")
    html.append("  th { background-color: #4CAF50; color: white; }")
    html.append("  tr:nth-child(even) { background-color: #f2f2f2; }")
    html.append("</style>")

    html.append(f"<h1>Study Schedule - {schedule_dict['date']}</h1>")
    html.append(f"<h2>Student: {schedule_dict['student_name']}</h2>")

    html.append("<h3>Productivity Analysis</h3>")
    html.append("<ul>")
    html.append(f"  <li>Productivity Level: {schedule_dict['student_productivity']:.1f}/100</li>")
    html.append(f"  <li>Recommended Study: {schedule_dict['recommended_study_hours']:.1f} hours/day</li>")
    html.append(f"  <li>Category: {schedule_dict['analytics']['productivity_level']}</li>")
    html.append("</ul>")

    html.append("<h3>Schedule</h3>")
    html.append("<table>")
    html.append("<tr><th>Time</th><th>Type</th><th>Task</th><th>Duration</th></tr>")

    for slot in schedule_dict['schedule_slots']:
        html.append("<tr>")
        html.append(f"  <td>{slot.get('start_time', 'TBD')}</td>")
        html.append(f"  <td>{slot.get('type', 'study').upper()}</td>")
        html.append(f"  <td>{slot.get('task', 'N/A')}</td>")
        html.append(f"  <td>{slot.get('duration', 0)} min</td>")
        html.append("</tr>")

    html.append("</table>")
    html.append("</body></html>")

    return "\n".join(html)


def parse_task_from_user_input(task_input: Dict) -> Dict:
    """
    Parse and validate task input from user.

    Args:
        task_input: Dictionary with task information

    Returns:
        Validated task dictionary

    Raises:
        ValueError: If required fields are missing
    """
    required_fields = ['name', 'deadline', 'difficulty']

    for field in required_fields:
        if field not in task_input:
            raise ValueError(f"Missing required field: {field}")

    # Validate deadline format
    if isinstance(task_input['deadline'], str):
        try:
            datetime.strptime(task_input['deadline'], '%Y-%m-%d')
        except ValueError:
            raise ValueError(f"Invalid deadline format: {task_input['deadline']} (use YYYY-MM-DD)")

    # Validate difficulty
    difficulty = int(task_input['difficulty'])
    if difficulty < 1 or difficulty > 5:
        raise ValueError(f"Difficulty must be 1-5, got {difficulty}")

    return {
        'name': str(task_input['name']),
        'deadline': task_input['deadline'],
        'difficulty': difficulty,
        'estimated_hours': float(task_input.get('estimated_hours', 2)),
        'description': str(task_input.get('description', '')),
    }


def calculate_workload_balance(
    daily_schedules: List[Dict]
) -> Dict:
    """
    Calculate workload balance across a week.

    Args:
        daily_schedules: List of daily schedule dictionaries

    Returns:
        Workload balance analysis
    """
    study_times = [
        s.get('analytics', {}).get('total_study_time', 0) / 60
        for s in daily_schedules
    ]

    return {
        'total_study_hours': sum(study_times),
        'avg_daily_hours': np.mean(study_times) if study_times else 0,
        'max_daily_hours': max(study_times) if study_times else 0,
        'min_daily_hours': min(study_times) if study_times else 0,
        'std_deviation': float(np.std(study_times)) if study_times else 0,
        'balance_score': 100 - (float(np.std(study_times)) * 10) if study_times else 0,  # Higher is more balanced
    }


def export_schedule_to_file(
    schedule_dict: Dict,
    filepath: str,
    format: str = 'json'
):
    """
    Export schedule to file.

    Args:
        schedule_dict: Schedule dictionary
        filepath: Path to save file
        format: 'json', 'txt', or 'csv'
    """
    import json
    import csv

    if format == 'json':
        with open(filepath, 'w') as f:
            json.dump(schedule_dict, f, indent=2)

    elif format == 'txt':
        with open(filepath, 'w') as f:
            f.write(format_schedule(schedule_dict, output_format='text'))

    elif format == 'csv':
        with open(filepath, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Time', 'Task', 'Type', 'Duration (min)'])
            for slot in schedule_dict.get('schedule_slots', []):
                writer.writerow([
                    slot.get('start_time', ''),
                    slot.get('task', ''),
                    slot.get('type', ''),
                    slot.get('duration', '')
                ])
