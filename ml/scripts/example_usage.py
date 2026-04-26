"""
Example Usage of Productivity Core Package

Demonstrates how to:
1. Load trained models
2. Create student profile
3. Generate AI-optimized schedules
4. Analyze productivity predictions
"""

import numpy as np
from datetime import datetime, timedelta
from productivity_core import (
    ProductivityPredictor,
    TaskPrioritizer,
    BreakOptimizer,
    IntelligentScheduler,
    create_student_profile,
    format_schedule,
)


def main():
    print("=" * 70)
    print("AI PRODUCTIVITY MAXIMIZER - EXAMPLE USAGE")
    print("=" * 70)

    # ========== SETUP ==========
    print("\n1. INITIALIZING MODELS...")
    print("-" * 70)

    try:
        predictor = ProductivityPredictor(models_dir="artifacts")
        print("✓ Models loaded successfully")
    except Exception as e:
        print(f"✗ Error loading models: {e}")
        print("  Make sure you've run the Jupyter notebook to generate model artifacts")
        return

    # ========== CREATE STUDENT PROFILE ==========
    print("\n2. CREATING STUDENT PROFILE...")
    print("-" * 70)

    # Example feature vector (19 features from training)
    student_features = np.array([
        20,           # age
        1,            # gender (encoded)
        6.0,          # study_hours_per_day
        2.0,          # social_media_hours
        1.5,          # netflix_hours
        0,            # part_time_job (encoded)
        95.0,         # attendance_percentage
        7.5,          # sleep_hours
        1,            # diet_quality (encoded)
        4,            # exercise_frequency
        1,            # parental_education_level (encoded)
        2,            # internet_quality (encoded)
        8,            # mental_health_rating
        1,            # extracurricular_participation (encoded)
        0.68,         # productivity_index (derived)
        2.5,          # stress_factor (derived)
        0.71,         # engagement_score (derived)
        12.0,         # time_efficiency (derived)
        0.78           # life_balance_score (derived)
    ])

    student_profile = create_student_profile(
        name="Ahmed Ali",
        features=student_features,
        available_hours=8.0
    )

    print(f"✓ Profile created for: {student_profile['name']}")
    print(f"  Available study hours: {student_profile['available_hours']}/day")

    # ========== MAKE PREDICTIONS ==========
    print("\n3. MAKING ML PREDICTIONS...")
    print("-" * 70)

    predictions = predictor.predict_all(student_features)

    print(f"Productivity Score: {predictions['productivity_score']['value']:.1f}/100")
    print(f"  Confidence: {predictions['productivity_score']['confidence']:.2%}")

    print(f"\nRecommended Study Hours: {predictions['required_hours']['value']:.1f} hours/day")
    print(f"  Confidence: {predictions['required_hours']['confidence']:.2%}")

    print(f"\nOptimal Break Interval: {predictions['break_interval']['value']:.0f} minutes")
    print(f"  Confidence: {predictions['break_interval']['confidence']:.2%}")

    # ========== TASK PRIORITIZATION ==========
    print("\n4. TASK PRIORITIZATION...")
    print("-" * 70)

    # Sample tasks
    sample_tasks = [
        {
            'name': 'AI Assignment',
            'deadline': (datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d'),
            'difficulty': 5,
            'estimated_hours': 4
        },
        {
            'name': 'Database Quiz Prep',
            'deadline': (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'),
            'difficulty': 3,
            'estimated_hours': 2
        },
        {
            'name': 'Operating Systems Midterm Prep',
            'deadline': (datetime.now() + timedelta(days=5)).strftime('%Y-%m-%d'),
            'difficulty': 4,
            'estimated_hours': 5
        },
        {
            'name': 'Math Final Preparation',
            'deadline': (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d'),
            'difficulty': 5,
            'estimated_hours': 6
        },
    ]

    prioritizer = TaskPrioritizer(predictor)
    prioritized_tasks = prioritizer.prioritize_tasks(sample_tasks, student_features)

    print(f"Prioritized {len(prioritized_tasks)} tasks:\n")
    for i, task in enumerate(prioritized_tasks, 1):
        print(f"  {i}. {task['name']}")
        print(f"     Priority Score: {task['priority_score']:.1f}/100")
        print(f"     Estimated Time: {prioritizer.estimate_completion_time(task, student_features):.1f} hours")
        print()

    # ========== BREAK OPTIMIZATION ==========
    print("\n5. BREAK OPTIMIZATION...")
    print("-" * 70)

    break_optimizer = BreakOptimizer(predictor)
    break_config = break_optimizer.calculate_break_intervals(student_features, task_difficulty=4)

    print(f"Short Break Duration: {break_config['short_break']} minutes")
    print(f"Long Break Duration: {break_config['long_break']} minutes")
    print(f"Session Interval: {break_config['session_interval']} sessions before long break")

    prayer_breaks = break_optimizer.suggest_namaz_break_slots("08:00", "22:00")
    print(f"\nPrayer Breaks Suggested: {len(prayer_breaks)}")
    for prayer in prayer_breaks:
        print(f"  • {prayer['prayer_name']:10} at {prayer['time']} (15 min)")

    # ========== SCHEDULE GENERATION ==========
    print("\n6. GENERATING DAILY SCHEDULE...")
    print("-" * 70)

    scheduler = IntelligentScheduler(predictor, prioritizer, break_optimizer)

    target_date = datetime.now() + timedelta(days=1)
    daily_schedule = scheduler.generate_daily_schedule(
        user_profile=student_profile,
        tasks=sample_tasks,
        target_date=target_date,
        study_start_time="08:00",
        study_end_time="22:00"
    )

    # Print formatted schedule
    schedule_text = format_schedule(daily_schedule, output_format='text')
    print(schedule_text)

    # ========== WEEKLY SCHEDULE ==========
    print("\n7. GENERATING WEEKLY SCHEDULE...")
    print("-" * 70)

    # Expand tasks for the week
    weekly_tasks = sample_tasks * 2  # Duplicate tasks for demonstration

    weekly_schedule = scheduler.generate_weekly_schedule(
        user_profile=student_profile,
        tasks=weekly_tasks,
        start_date=target_date
    )

    print(f"Weekly Schedule Generated:")
    print(f"  Week: {weekly_schedule['week_start']} to {weekly_schedule['week_end']}")
    print(f"\nWeekly Analytics:")
    for key, value in weekly_schedule['weekly_analytics'].items():
        if isinstance(value, float):
            print(f"  {key}: {value:.1f}")
        else:
            print(f"  {key}: {value}")

    print("\n" + "=" * 70)
    print("EXAMPLE COMPLETED SUCCESSFULLY!")
    print("=" * 70)
    print("\nNext Steps:")
    print("  1. Export schedules to JSON/CSV for integration")
    print("  2. Integrate with backend API for real-time scheduling")
    print("  3. Track student progress and refine predictions")
    print("  4. Implement UI to display schedules to students")


if __name__ == "__main__":
    main()
