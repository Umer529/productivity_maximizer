/**
 * ML Scheduler Service
 * Integrates with Python ML models via subprocess for AI-driven scheduling.
 */

const { spawn } = require('child_process');
const path = require('path');

class MLScheduler {
  constructor() {
    this.pythonScript = path.join(__dirname, '../../python/predictor.py');
    this.modelsDir = path.join(__dirname, '../../artifacts');
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
  }

  /**
   * Predict student productivity and task priorities
   */
  async predictStudent(features, tasks = null, method = 'all') {
    const cacheKey = this._getCacheKey(features, tasks, method);
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }
    
    // Call Python predictor
    const predictions = await this._callPythonPredictor(features, tasks, method);
    
    // Cache result
    this.cache.set(cacheKey, {
      data: predictions,
      timestamp: Date.now()
    });
    
    return predictions;
  }

  /**
   * Generate AI-optimized daily schedule
   */
  async generateDailySchedule(user, tasks, date = null) {
    // Extract student features from user data
    const features = this._extractStudentFeatures(user);
    
    // Format tasks for ML
    const mlTasks = tasks.map(t => ({
      name: t.title,
      deadline: t.deadline,
      difficulty: t.difficulty || 3,
      estimated_hours: t.estimatedDuration || 2
    }));
    
    // Get schedule from ML
    const result = await this.predictStudent(features, mlTasks, 'schedule');
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    // Transform ML schedule to backend format
    const schedule = result.schedule;
    const slots = this._transformScheduleSlots(schedule.schedule_slots || []);
    
    return {
      date: schedule.date,
      student_name: schedule.student_name,
      student_productivity: schedule.student_productivity,
      recommended_study_hours: schedule.recommended_study_hours,
      slots,
      analytics: schedule.analytics,
      method: 'ml-optimized'
    };
  }

  /**
   * Generate AI-optimized weekly schedule
   */
  async generateWeeklySchedule(user, tasks) {
    const features = this._extractStudentFeatures(user);
    const mlTasks = tasks.map(t => ({
      name: t.title,
      deadline: t.deadline,
      difficulty: t.difficulty || 3,
      estimated_hours: t.estimatedDuration || 2
    }));
    
    // For weekly, we'll generate daily schedules for each day
    const week = [];
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      
      try {
        const dailySchedule = await this.generateDailySchedule(user, tasks, dayDate);
        week.push({
          date: dailySchedule.date,
          slots: dailySchedule.slots,
          analytics: dailySchedule.analytics
        });
      } catch (error) {
        console.error(`Failed to generate schedule for day ${i}:`, error);
        week.push({
          date: dayDate.toISOString().split('T')[0],
          slots: [],
          analytics: {}
        });
      }
    }
    
    return week;
  }

  /**
   * Get productivity predictions for a user
   */
  async getProductivityPredictions(user) {
    const features = this._extractStudentFeatures(user);
    const result = await this.predictStudent(features, null, 'all');
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return {
      productivity_score: result.productivity_score,
      required_hours: result.required_hours,
      break_interval: result.break_interval
    };
  }

  /**
   * Call Python predictor subprocess
   */
  _callPythonPredictor(features, tasks, method) {
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
        method: method,
        models_dir: this.modelsDir
      };
      
      python.stdin.write(JSON.stringify(inputData));
      python.stdin.end();
      
      // Timeout after 30 seconds
      const timeout = setTimeout(() => {
        python.kill();
        reject(new Error('Python predictor timeout'));
      }, 30000);
      
      python.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  /**
   * Extract student features from user data for ML prediction
   * Maps user database fields to 19 ML features
   */
  _extractStudentFeatures(user) {
    // Default/placeholder values for features not in current user model
    // These should be collected via onboarding/profile update
    
    return [
      user.age || 20,                                    // 0: age
      this._encodeGender(user.gender) || 1,             // 1: gender (0=F, 1=M, 2=Other)
      user.studyHoursPerDay || 6,                        // 2: study_hours_per_day
      user.socialMediaHours || 2,                        // 3: social_media_hours
      user.netflixHours || 1,                            // 4: netflix_hours
      user.hasPartTimeJob ? 1 : 0,                       // 5: has_part_time_job
      95,                                                 // 6: attendance_percentage (placeholder)
      user.sleepHours || 7,                              // 7: sleep_hours
      this._encodeDietQuality(user.dietQuality) || 1,   // 8: diet_quality
      user.exerciseFrequency || 3,                       // 9: exercise_frequency
      this._encodeEducationLevel(user.parentalEducationLevel) || 2, // 10: parental_education_level
      this._encodeInternetQuality(user.internetQuality) || 2,       // 11: internet_quality
      user.mentalHealthRating || 7,                      // 12: mental_health_rating
      user.extraCurricularParticipation ? 1 : 0,          // 13: extra_curricular_participation
      this._computeProductivityIndex(user),              // 14: productivity_index (derived)
      this._computeStressFactor(user),                   // 15: stress_factor (derived)
      this._computeEngagementScore(user),                // 16: engagement_score (derived)
      this._computeTimeEfficiency(user),                 // 17: time_efficiency (derived)
      this._computeLifeBalanceScore(user)                // 18: life_balance_score (derived)
    ];
  }

  /**
   * Transform ML schedule slots to backend format
   */
  _transformScheduleSlots(mlSlots) {
    return mlSlots.map(slot => {
      const typeMap = {
        'study': 'study',
        'break': 'break',
        'prayer_break': 'prayer',
        'long_break': 'break'
      };
      
      return {
        time: slot.start_time,
        task: slot.task,
        type: typeMap[slot.type] || slot.type,
        duration: slot.duration / 60, // Convert minutes to hours
        activity: slot.activity,
        priority: slot.priority,
        difficulty: slot.difficulty
      };
    });
  }

  /**
   * Helper encoding functions
   */
  _encodeGender(gender) {
    const map = { 'Male': 1, 'Female': 0, 'Other': 2 };
    return map[gender] || 1;
  }

  _encodeDietQuality(quality) {
    const map = { 'Poor': 0, 'Fair': 1, 'Good': 2 };
    return map[quality] || 1;
  }

  _encodeEducationLevel(level) {
    const map = { 'High School': 0, 'Bachelor': 1, 'Master': 2, 'PhD': 3 };
    return map[level] || 2;
  }

  _encodeInternetQuality(quality) {
    const map = { 'Poor': 0, 'Fair': 1, 'Good': 2 };
    return map[quality] || 2;
  }

  /**
   * Derived feature computation functions
   */
  _computeProductivityIndex(user) {
    // Simple heuristic based on study hours and streak
    const base = (user.studyHoursPerDay || 6) * 10;
    const streakBonus = (user.streak || 0) * 2;
    return Math.min(100, base + streakBonus);
  }

  _computeStressFactor(user) {
    // Estimate stress based on workload
    const pendingTasks = user.pendingTasks || 5;
    const studyLoad = (user.studyHoursPerDay || 6) / 8;
    return Math.min(100, (pendingTasks * 10) + (studyLoad * 30));
  }

  _computeEngagementScore(user) {
    // Based on streak and activity
    const streakScore = Math.min(50, (user.streak || 0) * 5);
    const activityScore = 30; // Placeholder
    return streakScore + activityScore;
  }

  _computeTimeEfficiency(user) {
    // Based on completed tasks vs time spent
    return 70; // Placeholder - should be computed from session data
  }

  _computeLifeBalanceScore(user) {
    // Balance between study, sleep, and leisure
    const sleepScore = (user.sleepHours || 7) >= 7 ? 30 : 20;
    const studyScore = (user.studyHoursPerDay || 6) <= 8 ? 40 : 30;
    return sleepScore + studyScore;
  }

  /**
   * Get cache key for predictions
   */
  _getCacheKey(features, tasks, method) {
    const featureString = JSON.stringify(features);
    const taskString = JSON.stringify(tasks || []);
    return `${featureString}|${taskString}|${method}`;
  }

  /**
   * Clear cache (call periodically or on demand)
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new MLScheduler();
