"""
Create placeholder ML models for development purposes.
These are mock models that return reasonable default values.
"""

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.datasets import make_regression
import os

# Create artifacts directory if it doesn't exist
os.makedirs('artifacts', exist_ok=True)

# Generate some dummy training data (19 features)
X, y_prod = make_regression(n_samples=100, n_features=19, noise=0.1, random_state=42)
_, y_hours = make_regression(n_samples=100, n_features=19, noise=0.1, random_state=43)
_, y_break = make_regression(n_samples=100, n_features=19, noise=0.1, random_state=44)

# Scale outputs to appropriate ranges
y_prod = np.interp(y_prod, (y_prod.min(), y_prod.max()), (0, 100))
y_hours = np.interp(y_hours, (y_hours.min(), y_hours.max()), (2, 15))
y_break = np.interp(y_break, (y_break.min(), y_break.max()), (15, 45))

# Train simple models
prod_model = RandomForestRegressor(n_estimators=10, random_state=42)
prod_model.fit(X, y_prod)

hours_model = RandomForestRegressor(n_estimators=10, random_state=43)
hours_model.fit(X, y_hours)

break_model = RandomForestRegressor(n_estimators=10, random_state=44)
break_model.fit(X, y_break)

# Save models
joblib.dump(prod_model, 'artifacts/productivity_score_model.pkl')
joblib.dump(hours_model, 'artifacts/required_hours_model.pkl')
joblib.dump(break_model, 'artifacts/break_interval_model.pkl')

print("Placeholder models created successfully in artifacts/")
print("- productivity_score_model.pkl")
print("- required_hours_model.pkl")
print("- break_interval_model.pkl")
