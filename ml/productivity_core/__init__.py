"""
AI Productivity Maximizer - Core Module

Production-ready regression models and scheduling algorithms for intelligent student productivity management.
Includes task prioritization, dynamic break scheduling, and AI-based timetable generation.

Version: 2.0
Author: AI Productivity Team
"""

from .models import ProductivityPredictor, ModelConfig
from .prioritizer import TaskPrioritizer
from .break_optimizer import BreakOptimizer
from .scheduler import IntelligentScheduler
from .utils import create_student_profile, validate_features, format_schedule

__version__ = "2.0"
__all__ = [
    "ProductivityPredictor",
    "ModelConfig",
    "TaskPrioritizer",
    "BreakOptimizer",
    "IntelligentScheduler",
    "create_student_profile",
    "validate_features",
    "format_schedule",
]
