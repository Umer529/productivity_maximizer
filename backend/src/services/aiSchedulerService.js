/**
 * AI Scheduler Service
 * Generates optimized study schedules using heuristic-based AI logic.
 */

const NAMAZ_TIMES = [
  { name: 'Fajr', time: '05:30' },
  { name: 'Dhuhr', time: '13:00' },
  { name: 'Asr', time: '16:00' },
  { name: 'Maghrib', time: '19:00' },
  { name: 'Isha', time: '21:00' },
];

/**
 * Number of days before a deadline at which urgency starts increasing linearly.
 * At this many days out, urgency contribution from deadline proximity is 0.
 * Closer than this window, urgency increases proportionally.
 */
const URGENCY_DAYS_WINDOW = 10;

/** Convert "HH:MM" string to total minutes from midnight */
const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

/** Convert total minutes from midnight to "HH:MM" string */
const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Compute urgency score (0–100) for a task.
 * Higher score = more urgent.
 */
const computeUrgencyScore = (task) => {
  if (!task.deadline) return 0;

  const now = new Date();
  const daysUntil = (new Date(task.deadline) - now) / (1000 * 60 * 60 * 24);

  if (daysUntil < 0) return 100; // overdue
  // Clamp: when daysUntil > URGENCY_DAYS_WINDOW the subtraction goes negative,
  // so Math.max(0, …) keeps urgency at 0 for tasks with distant deadlines.
  const daysFactor = Math.max(0, URGENCY_DAYS_WINDOW - daysUntil);
  return Math.min(100, daysFactor * (task.difficulty || 3));
};

/**
 * Sort tasks by urgency score descending.
 */
const prioritizeTasks = (tasks) => {
  return [...tasks].sort(
    (a, b) => computeUrgencyScore(b) - computeUrgencyScore(a)
  );
};

/**
 * Generate a daily study schedule.
 * @param {Object} user - User preferences document
 * @param {Array}  tasks - Array of pending Task documents
 * @param {Date}   date  - The day to schedule for
 * @returns {Array} schedule slots
 */
const generateStudySchedule = (user, tasks, date) => {
  const focusDuration = user.focusDuration || 25;
  const breakDuration = user.breakDuration || 5;
  const longBreakDuration = user.longBreakDuration || 15;
  const longBreakAfter = user.longBreakAfter || 4;
  const namazEnabled = user.namazBreaksEnabled !== false;

  const studyStart = timeToMinutes(user.studyStartTime || '08:00');
  const studyEnd = timeToMinutes(user.studyEndTime || '22:00');

  // Build set of prayer-block minutes (each prayer occupies 15 min)
  const prayerBlocks = namazEnabled
    ? NAMAZ_TIMES.map((p) => ({
        start: timeToMinutes(p.time),
        end: timeToMinutes(p.time) + 15,
        name: p.name,
      }))
    : [];

  const isBlockedByPrayer = (start, duration) => {
    const end = start + duration;
    return prayerBlocks.find((p) => start < p.end && end > p.start);
  };

  const sortedTasks = prioritizeTasks(
    tasks.filter((t) => t.status !== 'completed')
  );

  const schedule = [];
  let cursor = studyStart;
  let sessionCount = 0;
  let taskIndex = 0;
  const hasTasks = sortedTasks.length > 0;

  while (cursor + focusDuration <= studyEnd) {
    // Insert prayer break if this slot overlaps a prayer time
    const prayerConflict = isBlockedByPrayer(cursor, focusDuration);
    if (prayerConflict) {
      // Add the prayer slot first
      schedule.push({
        time: minutesToTime(prayerConflict.start),
        task: `${prayerConflict.name} Prayer`,
        type: 'prayer',
        duration: +(15 / 60).toFixed(2),
      });
      cursor = prayerConflict.end;
      continue;
    }

    // Determine which task to work on
    const currentTask = hasTasks ? sortedTasks[taskIndex % sortedTasks.length] : null;

    if (currentTask) {
      schedule.push({
        time: minutesToTime(cursor),
        task: currentTask.title,
        type: 'study',
        duration: +(focusDuration / 60).toFixed(2),
        course: currentTask.course || undefined,
        taskId: String(currentTask._id),
      });
    } else {
      schedule.push({
        time: minutesToTime(cursor),
        task: 'Free Study / Review',
        type: 'study',
        duration: +(focusDuration / 60).toFixed(2),
      });
    }

    cursor += focusDuration;
    sessionCount++;
    taskIndex++;

    // After every `longBreakAfter` sessions insert a long break, else short break
    if (cursor >= studyEnd) break;

    if (sessionCount % longBreakAfter === 0) {
      schedule.push({
        time: minutesToTime(cursor),
        task: 'Long Break',
        type: 'break',
        duration: +(longBreakDuration / 60).toFixed(2),
      });
      cursor += longBreakDuration;
    } else {
      schedule.push({
        time: minutesToTime(cursor),
        task: 'Short Break',
        type: 'break',
        duration: +(breakDuration / 60).toFixed(2),
      });
      cursor += breakDuration;
    }
  }

  // Add standalone prayer slots that fall inside study window but weren't inserted yet
  if (namazEnabled) {
    prayerBlocks.forEach((p, idx) => {
      const prayerName = NAMAZ_TIMES[idx].name;
      if (
        p.start >= studyStart &&
        p.start < studyEnd &&
        !schedule.find((s) => s.type === 'prayer' && s.task.includes(prayerName))
      ) {
        schedule.push({
          time: minutesToTime(p.start),
          task: `${prayerName} Prayer`,
          type: 'prayer',
          duration: +(15 / 60).toFixed(2),
        });
      }
    });
  }

  // Sort final schedule by time
  schedule.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  return schedule;
};

/**
 * Generate schedule for the next 7 days.
 */
const generateWeeklySchedule = (user, tasks) => {
  const week = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    week.push({
      date: date.toISOString().split('T')[0],
      slots: generateStudySchedule(user, tasks, date),
    });
  }
  return week;
};

/**
 * Generate AI insights from user history and tasks.
 */
const getAIInsights = (user, focusSessions, tasks) => {
  const insights = [];

  // Peak productivity hour
  if (focusSessions && focusSessions.length > 0) {
    const hourCounts = {};
    focusSessions.forEach((s) => {
      if (s.startTime) {
        const h = new Date(s.startTime).getHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      }
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    if (peakHour) {
      insights.push({
        type: 'tip',
        text: `Your peak productivity hour is around ${peakHour[0]}:00. Schedule your hardest tasks then.`,
      });
    }
  }

  // Burnout risk: average daily study > 8 hours
  if (focusSessions && focusSessions.length > 0) {
    const totalMinutes = focusSessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0);
    const uniqueDays = new Set(focusSessions.map((s) => new Date(s.startTime).toDateString())).size;
    const avgHoursPerDay = totalMinutes / 60 / Math.max(uniqueDays, 1);
    if (avgHoursPerDay > 8) {
      insights.push({
        type: 'warning',
        text: `You're averaging ${avgHoursPerDay.toFixed(1)}h/day. Reduce intensity to avoid burnout.`,
      });
    }
  }

  // Task completion rate
  if (tasks && tasks.length > 0) {
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const rate = Math.round((completed / tasks.length) * 100);
    insights.push({
      type: 'prediction',
      text: `Task completion rate: ${rate}%. ${rate >= 70 ? 'Great momentum!' : 'Try breaking tasks into smaller steps.'}`,
    });
  }

  // Upcoming critical deadlines
  const critical = (tasks || []).filter((t) => {
    const days = (new Date(t.deadline) - new Date()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 3 && t.status !== 'completed';
  });
  if (critical.length > 0) {
    insights.push({
      type: 'warning',
      text: `${critical.length} task(s) due within 3 days: ${critical.map((t) => t.title).join(', ')}.`,
    });
  }

  return insights;
};

/**
 * Estimate effort for a task using heuristics.
 */
const estimateTaskEffort = (task) => {
  const baseHours = {
    assignment: 2,
    quiz: 1,
    midterm: 8,
    final: 15,
    project: 20,
    other: 2,
  };

  const base = baseHours[task.type] || 2;
  const difficultyMultiplier = 0.6 + (task.difficulty || 3) * 0.2;
  const estimatedHours = +(base * difficultyMultiplier).toFixed(1);

  const complexity =
    task.difficulty <= 2 ? 'easy' : task.difficulty <= 3 ? 'moderate' : 'hard';

  const urgency = computeUrgencyScore(task);
  const suggestedPriority =
    urgency >= 30 ? 'critical' : urgency >= 20 ? 'high' : urgency >= 10 ? 'medium' : 'low';

  return { estimatedHours, complexity, suggestedPriority };
};

module.exports = {
  computeUrgencyScore,
  prioritizeTasks,
  generateStudySchedule,
  generateWeeklySchedule,
  getAIInsights,
  estimateTaskEffort,
  
  /**
   * Enhanced schedule generation that uses ML predictions when available.
   * Falls back to heuristic-based generation if ML is unavailable.
   */
  async generateEnhancedSchedule(user, tasks, date, mlPredictions = null) {
    // If ML predictions are available, use them to enhance the schedule
    if (mlPredictions && mlPredictions.break_interval) {
      const enhancedUser = {
        ...user,
        breakDuration: Math.ceil(mlPredictions.break_interval.value / 4),
        longBreakDuration: Math.ceil(mlPredictions.break_interval.value),
        studyHoursPerDay: mlPredictions.required_hours?.value || user.studyHoursPerDay,
      };
      
      const enhancedTasks = tasks.map(task => {
        // If ML prioritization is available, update task priority
        if (mlPredictions.prioritized_tasks) {
          const mlTask = mlPredictions.prioritized_tasks.find(t => t.name === task.title);
          if (mlTask) {
            return {
              ...task,
              _mlPriority: mlTask.priority_score,
              _mlEstimatedHours: mlTask.completion_time || mlTask.estimated_hours,
            };
          }
        }
        return task;
      });
      
      // Sort tasks by ML priority if available
      if (mlPredictions.prioritized_tasks) {
        enhancedTasks.sort((a, b) => {
          const priorityA = a._mlPriority || 0;
          const priorityB = b._mlPriority || 0;
          return priorityB - priorityA;
        });
      }
      
      return generateStudySchedule(enhancedUser, enhancedTasks, date);
    }
    
    // Fall back to standard schedule generation
    return generateStudySchedule(user, tasks, date);
  },
  
  /**
   * Extract ML insights from predictions and user data.
   */
  extractMLInsights(mlPredictions, user, tasks) {
    const insights = [];
    
    if (!mlPredictions) return insights;
    
    // Productivity insight
    if (mlPredictions.productivity_score) {
      const score = mlPredictions.productivity_score.value;
      const confidence = mlPredictions.productivity_score.confidence;
      
      if (score >= 70) {
        insights.push({
          type: 'tip',
          text: `ML Prediction: You're at high productivity level (${score.toFixed(0)}/100). Tackle your hardest tasks now!`,
          source: 'ml'
        });
      } else if (score < 40) {
        insights.push({
          type: 'warning',
          text: `ML Prediction: Your productivity is lower than usual (${score.toFixed(0)}/100). Consider taking breaks and refreshing.`,
          source: 'ml'
        });
      }
    }
    
    // Study hours recommendation
    if (mlPredictions.required_hours) {
      const recommendedHours = mlPredictions.required_hours.value;
      const currentHours = user.studyHoursPerDay || 6;
      
      if (Math.abs(recommendedHours - currentHours) > 1) {
        insights.push({
          type: 'prediction',
          text: `ML Recommendation: Adjust study time to ${recommendedHours.toFixed(1)} hours/day for optimal productivity.`,
          source: 'ml'
        });
      }
    }
    
    // Break optimization
    if (mlPredictions.break_interval) {
      const optimalBreak = mlPredictions.break_interval.value;
      insights.push({
        type: 'tip',
        text: `ML Optimized: Your ideal focus session is ${optimalBreak.toFixed(0)} minutes with breaks in between.`,
        source: 'ml'
      });
    }
    
    // Task prioritization insights
    if (mlPredictions.prioritized_tasks && mlPredictions.prioritized_tasks.length > 0) {
      const topTask = mlPredictions.prioritized_tasks[0];
      insights.push({
        type: 'prediction',
        text: `ML Priority: Focus on "${topTask.name}" first (priority: ${topTask.priority_score.toFixed(0)}/100).`,
        source: 'ml'
      });
    }
    
    return insights;
  },
};
