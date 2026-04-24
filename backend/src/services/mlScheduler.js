/**
 * ML Scheduler Service
 * Integrates with Python ML models via subprocess for AI-driven scheduling.
 */

const { spawn } = require('child_process');
const path = require('path');

class MLScheduler {
  constructor() {
    this.pythonScript = path.join(__dirname, '../../python/predictor.py');
    this.modelsDir = path.join(__dirname, '../../../artifacts');
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

    // Prioritize tasks before sending to ML
    const prioritizedTasks = this._prioritizeTasks(tasks);

    // Format tasks for ML
    const mlTasks = prioritizedTasks.map(t => ({
      name: t.title,
      deadline: t.deadline,
      difficulty: t.difficulty || 3,
      estimated_hours: (t.estimatedDuration || 120) / 60, // Convert to hours
      priority_score: t._priorityScore || 0.5,
      urgency: t._urgency || 'medium'
    }));

    // Get schedule from ML — pass user study window and prayer preferences
    const result = await this._callPythonPredictor(features, mlTasks, 'schedule', {
      study_start_time:      user.studyStartTime        || '08:00',
      study_end_time:        user.studyEndTime          || '22:00',
      namaz_breaks_enabled:  user.namazBreaksEnabled !== false,
      selected_namaz_prayers: user.selectedNamazPrayers || [],
    });
    
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
   * Prioritize tasks based on deadline urgency, difficulty, and user productivity
   */
  _prioritizeTasks(tasks) {
    const now = new Date();
    
    return tasks.map(task => {
      const deadline = new Date(task.deadline);
      const daysUntilDeadline = Math.max(0, (deadline - now) / (1000 * 60 * 60 * 24));
      
      // Calculate urgency score (0-1, higher = more urgent)
      let urgencyScore = 0;
      if (daysUntilDeadline <= 1) urgencyScore = 1.0;
      else if (daysUntilDeadline <= 3) urgencyScore = 0.8;
      else if (daysUntilDeadline <= 7) urgencyScore = 0.6;
      else if (daysUntilDeadline <= 14) urgencyScore = 0.4;
      else urgencyScore = 0.2;
      
      // Calculate priority score combining urgency, difficulty, and type
      const difficultyWeight = (task.difficulty || 3) / 5;
      const typeWeight = this._getTypePriorityWeight(task.type);
      
      const priorityScore = (urgencyScore * 0.5) + (difficultyWeight * 0.3) + (typeWeight * 0.2);
      
      // Determine urgency label
      let urgency = 'low';
      if (urgencyScore >= 0.8) urgency = 'critical';
      else if (urgencyScore >= 0.6) urgency = 'high';
      else if (urgencyScore >= 0.4) urgency = 'medium';
      
      return {
        ...task,
        _priorityScore: priorityScore,
        _urgency: urgency,
        _daysUntilDeadline: daysUntilDeadline
      };
    }).sort((a, b) => b._priorityScore - a._priorityScore); // Sort by priority (highest first)
  }

  /**
   * Get priority weight based on task type
   */
  _getTypePriorityWeight(type) {
    const weights = {
      'final': 1.0,
      'midterm': 0.9,
      'quiz': 0.7,
      'assignment': 0.6,
      'project': 0.8,
      'other': 0.4
    };
    return weights[type] || 0.5;
  }

  /**
   * Generate AI-optimized weekly schedule
   */
  async generateWeeklySchedule(user, tasks) {
    const features = this._extractStudentFeatures(user);
    const prioritizedTasks = this._prioritizeTasks(tasks);
    const mlTasks = prioritizedTasks.map(t => ({
      name: t.title,
      deadline: t.deadline,
      difficulty: t.difficulty || 3,
      estimated_hours: (t.estimatedDuration || 120) / 60,
      priority_score: t._priorityScore || 0.5,
      urgency: t._urgency || 'medium'
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
    const result = await this._callPythonPredictor(features, null, 'all');

    if (result.error) {
      throw new Error(result.error);
    }

    // Calculate burnout risk
    const burnoutRisk = this._calculateBurnoutRisk(user, features);

    return {
      productivity_score: result.productivity_score,
      required_hours: result.required_hours,
      break_interval: result.break_interval,
      burnout_risk: burnoutRisk
    };
  }

  /**
   * Calculate burnout risk based on user metrics
   */
  _calculateBurnoutRisk(user, features) {
    // Stress factor (feature 15) - higher is worse
    const stressFactor = features[15] || 30;

    // Mental health rating (feature 12) - lower is worse
    const mentalHealth = features[12] || 7;

    // Study hours per day (feature 2) - excessive study increases risk
    const studyHours = features[2] || 6;

    // Sleep hours (feature 7) - less sleep increases risk
    const sleepHours = features[7] || 7;

    // Streak - long streaks without breaks can indicate burnout risk
    const streak = user.streak || 0;

    // Calculate risk score (0-100)
    let riskScore = 0;

    // Stress contribution (0-40 points)
    riskScore += (stressFactor / 100) * 40;

    // Mental health contribution (0-25 points, inverted)
    riskScore += ((10 - mentalHealth) / 10) * 25;

    // Study hours contribution (0-15 points, excessive is >8 hours)
    if (studyHours > 10) riskScore += 15;
    else if (studyHours > 8) riskScore += 10;
    else if (studyHours > 6) riskScore += 5;

    // Sleep contribution (0-10 points, less than 6 hours is bad)
    if (sleepHours < 5) riskScore += 10;
    else if (sleepHours < 6) riskScore += 7;
    else if (sleepHours < 7) riskScore += 4;

    // Streak contribution (0-10 points, very long streaks may need rest)
    if (streak > 30) riskScore += 10;
    else if (streak > 21) riskScore += 7;
    else if (streak > 14) riskScore += 4;

    // Determine risk level
    let riskLevel = 'low';
    if (riskScore >= 70) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 30) riskLevel = 'moderate';

    return {
      score: Math.round(riskScore),
      level: riskLevel,
      factors: {
        stress: Math.round((stressFactor / 100) * 40),
        mentalHealth: Math.round(((10 - mentalHealth) / 10) * 25),
        studyLoad: studyHours > 8 ? 10 : Math.round((studyHours / 8) * 10),
        sleep: sleepHours < 6 ? 10 : Math.round(((7 - sleepHours) / 7) * 10),
      }
    };
  }

  /**
   * Call Python predictor subprocess
   */
  _callPythonPredictor(features, tasks, method, extra = {}) {
    return new Promise((resolve, reject) => {
      // Try multiple ways to invoke Python
      let pythonCmd = 'python3';
      let pythonArgs = [this.pythonScript];
      
      // Fallback for Windows systems
      const isWindows = process.platform === 'win32';
      if (isWindows) {
        pythonCmd = 'python';
      }
      
      const python = spawn(pythonCmd, pythonArgs, {
        cwd: path.dirname(this.pythonScript),
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let error = '';
      let timedOut = false;
      
      python.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      python.on('close', (code) => {
        if (timedOut) return;
        
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            if (result.error) {
              reject(new Error(`ML Prediction Error: ${result.error}`));
            } else {
              resolve(result);
            }
          } catch (e) {
            reject(new Error(`Invalid JSON from predictor: ${output}`));
          }
        } else {
          reject(new Error(
            `Predictor failed with code ${code}: ${error || output}`
          ));
        }
      });
      
      python.on('error', (err) => {
        if (timedOut) return;
        reject(new Error(
          `Failed to spawn Python process: ${err.message}. Make sure Python is installed and in PATH.`
        ));
      });
      
      // Send input
      const inputData = {
        features: features,
        tasks: tasks || [],
        method: method,
        models_dir: this.modelsDir,
        ...extra,
      };
      
      try {
        python.stdin.write(JSON.stringify(inputData));
        python.stdin.end();
      } catch (err) {
        reject(new Error(`Failed to write to Python process: ${err.message}`));
      }
      
      // Timeout after 30 seconds
      const timeout = setTimeout(() => {
        timedOut = true;
        python.kill();
        reject(new Error('Python predictor timeout (>30s). Models may be too large or Python process is hanging.'));
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
      user.attendancePercentage || 95,                   // 6: attendance_percentage
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
