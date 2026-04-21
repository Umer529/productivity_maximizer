"""
Regression Models for Productivity Prediction

Provides inference interfaces for three trained models:
1. ProductivityScoreModel - Predicts student productivity (0-100)
2. RequiredHoursModel - Predicts required daily study hours (2-15)
3. BreakIntervalModel - Optimizes break intervals (15-45 min)
"""

import joblib
import numpy as np
import json
import os
from typing import Dict, List, Optional, Tuple


class ModelConfig:
    """Configuration and metadata for trained models."""

    def __init__(self, metadata_path: str = "artifacts/model_metadata.json"):
        """
        Initialize model configuration.

        Args:
            metadata_path: Path to model metadata JSON file
        """
        self.metadata_path = metadata_path
        self.metadata = {}
        self.models_dir = os.path.dirname(metadata_path)
        self.feature_names = []
        self.feature_ranges = {}

        if os.path.exists(metadata_path):
            self._load_metadata()

    def _load_metadata(self):
        """Load metadata from JSON file."""
        try:
            with open(self.metadata_path, 'r') as f:
                self.metadata = json.load(f)
            self.feature_names = self.metadata.get('features', [])
            self.feature_ranges = self.metadata.get('feature_ranges', {})
        except Exception as e:
            print(f"Warning: Could not load metadata: {e}")

    def get_feature_names(self) -> List[str]:
        """Get list of expected feature names."""
        return self.feature_names

    def get_feature_range(self, feature: str) -> Optional[Dict]:
        """Get min/max range for a feature."""
        return self.feature_ranges.get(feature)

    def get_model_metrics(self, model_name: str) -> Dict:
        """Get evaluation metrics for a model."""
        models_data = self.metadata.get('models', {})
        if model_name in models_data:
            model_data = models_data[model_name]
            return {
                'r2': model_data.get('test_r2'),
                'mae': model_data.get('test_mae'),
                'top_features': model_data.get('top_features', [])
            }
        return {}


class ProductivityPredictor:
    """
    Unified interface for loading and using trained regression models.
    """

    def __init__(self, models_dir: str = "artifacts"):
        """
        Initialize model predictor.

        Args:
            models_dir: Directory containing model files and metadata
        """
        self.models_dir = models_dir
        self.config = ModelConfig(os.path.join(models_dir, "model_metadata.json"))

        # Model paths
        self.model_paths = {
            'productivity_score': os.path.join(models_dir, 'productivity_score_model.pkl'),
            'required_hours': os.path.join(models_dir, 'required_hours_model.pkl'),
            'break_interval': os.path.join(models_dir, 'break_interval_model.pkl'),
        }

        # Lazy loading - models loaded on first use
        self._models = {
            'productivity_score': None,
            'required_hours': None,
            'break_interval': None,
        }

    def _load_model(self, model_name: str):
        """Load a model on demand."""
        if model_name not in self._models:
            raise ValueError(f"Unknown model: {model_name}")

        if self._models[model_name] is None:
            model_path = self.model_paths[model_name]
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model file not found: {model_path}")

            self._models[model_name] = joblib.load(model_path)

        return self._models[model_name]

    def predict_productivity_score(
        self,
        features: np.ndarray,
        return_confidence: bool = False
    ) -> float:
        """
        Predict student productivity score (0-100).

        Args:
            features: Feature array matching model training features
            return_confidence: If True, return (score, confidence)

        Returns:
            Productivity score (0-100) or tuple (score, confidence)

        Raises:
            ValueError: If features have wrong shape
        """
        model = self._load_model('productivity_score')

        # Validate features
        if features.ndim == 1:
            features = features.reshape(1, -1)

        if features.shape[1] != len(self.config.get_feature_names()):
            raise ValueError(
                f"Expected {len(self.config.get_feature_names())} features, "
                f"got {features.shape[1]}"
            )

        # Predict
        prediction = float(model.predict(features)[0])
        prediction = np.clip(prediction, 0, 100)  # Ensure within range

        if return_confidence:
            # For random forest, we can estimate confidence from tree variance
            predictions_all = np.array([tree.predict(features) for tree in model.estimators_])
            confidence = 1.0 - (np.std(predictions_all) / 100)
            confidence = np.clip(confidence, 0, 1)
            return prediction, confidence

        return prediction

    def predict_required_hours(
        self,
        features: np.ndarray,
        return_confidence: bool = False
    ) -> float:
        """
        Predict required daily study hours (2-15).

        Args:
            features: Feature array matching model training features
            return_confidence: If True, return (hours, confidence)

        Returns:
            Required study hours or tuple (hours, confidence)
        """
        model = self._load_model('required_hours')

        if features.ndim == 1:
            features = features.reshape(1, -1)

        if features.shape[1] != len(self.config.get_feature_names()):
            raise ValueError(
                f"Expected {len(self.config.get_feature_names())} features, "
                f"got {features.shape[1]}"
            )

        prediction = float(model.predict(features)[0])
        prediction = np.clip(prediction, 2, 15)  # Ensure within range

        if return_confidence:
            predictions_all = np.array([tree.predict(features) for tree in model.estimators_])
            confidence = 1.0 - (np.std(predictions_all) / 15)
            confidence = np.clip(confidence, 0, 1)
            return prediction, confidence

        return prediction

    def predict_optimal_break_interval(
        self,
        features: np.ndarray,
        return_confidence: bool = False
    ) -> float:
        """
        Predict optimal break interval in minutes (15-45).

        Args:
            features: Feature array matching model training features
            return_confidence: If True, return (minutes, confidence)

        Returns:
            Break interval in minutes or tuple (minutes, confidence)
        """
        model = self._load_model('break_interval')

        if features.ndim == 1:
            features = features.reshape(1, -1)

        if features.shape[1] != len(self.config.get_feature_names()):
            raise ValueError(
                f"Expected {len(self.config.get_feature_names())} features, "
                f"got {features.shape[1]}"
            )

        prediction = float(model.predict(features)[0])
        prediction = np.clip(prediction, 15, 45)  # Ensure within range

        if return_confidence:
            predictions_all = np.array([tree.predict(features) for tree in model.estimators_])
            confidence = 1.0 - (np.std(predictions_all) / 45)
            confidence = np.clip(confidence, 0, 1)
            return prediction, confidence

        return prediction

    def predict_all(
        self,
        features: np.ndarray
    ) -> Dict[str, float]:
        """
        Get all three predictions for a student profile.

        Args:
            features: Feature array matching model training features

        Returns:
            Dictionary with all predictions and confidences
        """
        prod_score, prod_conf = self.predict_productivity_score(features, return_confidence=True)
        hours, hours_conf = self.predict_required_hours(features, return_confidence=True)
        breaks, breaks_conf = self.predict_optimal_break_interval(features, return_confidence=True)

        return {
            'productivity_score': {
                'value': prod_score,
                'confidence': prod_conf,
                'range': [0, 100],
                'unit': 'score'
            },
            'required_hours': {
                'value': hours,
                'confidence': hours_conf,
                'range': [2, 15],
                'unit': 'hours/day'
            },
            'break_interval': {
                'value': breaks,
                'confidence': breaks_conf,
                'range': [15, 45],
                'unit': 'minutes'
            }
        }

    def get_model_info(self, model_name: str) -> Dict:
        """Get detailed information about a model."""
        return self.config.get_model_metrics(model_name)
