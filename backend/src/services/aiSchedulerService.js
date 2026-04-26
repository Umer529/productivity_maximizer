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
  const focusDuration    = user.focusDuration    || 25;
  const breakDuration    = user.breakDuration    || 5;
  const longBreakDuration = user.longBreakDuration || 15;
  const longBreakAfter   = user.longBreakAfter   || 4;
  const namazEnabled     = user.namazBreaksEnabled !== false;

  const studyStart = timeToMinutes(user.studyStartTime || '08:00');
  const studyEnd   = timeToMinutes(user.studyEndTime   || '22:00');

  // For today: advance cursor to current time (rounded up to nearest 5 min)
  const now = new Date();
  const schedDate = date instanceof Date ? date : new Date(date);
  const isTodaySchedule =
    schedDate.getFullYear() === now.getFullYear() &&
    schedDate.getMonth()    === now.getMonth()    &&
    schedDate.getDate()     === now.getDate();

  const nowMins = isTodaySchedule
    ? Math.ceil((now.getHours() * 60 + now.getMinutes()) / 5) * 5
    : studyStart;
  let cursor = Math.max(studyStart, nowMins);

  // ── Build all fixed blocks (prayers + custom breaks), sorted by start ────────
  const fixedBlocks = [];

  if (namazEnabled) {
    const selectedPrayers = user.selectedNamazPrayers || [];
    NAMAZ_TIMES.forEach((p) => {
      if (selectedPrayers.length > 0 && !selectedPrayers.includes(p.name)) return;
      const pStart = timeToMinutes(p.time);
      if (pStart >= studyStart && pStart < studyEnd) {
        fixedBlocks.push({ start: pStart, end: pStart + 15, name: `${p.name} Prayer`, type: 'prayer' });
      }
    });
  }

  (user.customBreaks || []).forEach((b) => {
    const bStart = timeToMinutes(b.startTime || '12:00');
    const bDur   = Math.max(5, b.duration || 15);
    if (bStart >= studyStart && bStart < studyEnd) {
      fixedBlocks.push({ start: bStart, end: bStart + bDur, name: b.name || 'Break', type: 'custom' });
    }
  });

  fixedBlocks.sort((a, b) => a.start - b.start);

  // ── Build study slot queue: expand tasks into sprint-sized chunks ─────────────
  // Sprint duration = min(remaining work, user's focusDuration) — not just focusDuration
  const sortedTasks = prioritizeTasks(tasks.filter((t) => t.status !== 'completed'));
  const studySlots = [];

  for (const task of sortedTasks) {
    const remaining = Math.max(
      0,
      (task.estimatedDuration || focusDuration) - (task.actualDuration || 0),
    );
    let filled = 0;
    while (filled < remaining) {
      const chunk = Math.min(focusDuration, remaining - filled);
      if (chunk < 5) break;
      studySlots.push({ task, duration: chunk });
      filled += chunk;
    }
  }

  // ── Main scheduling loop ────────────────────────────────────────────────────
  const schedule = [];
  let sessionCount = 0;
  let slotIdx  = 0;
  let blockIdx = 0;

  const advanceBlocks = () => {
    while (blockIdx < fixedBlocks.length && fixedBlocks[blockIdx].end <= cursor) {
      blockIdx++;
    }
  };

  advanceBlocks();

  while (cursor < studyEnd) {
    advanceBlocks();

    const nextBlock = blockIdx < fixedBlocks.length ? fixedBlocks[blockIdx] : null;

    // If cursor is inside a fixed block: insert it and skip past
    if (nextBlock && cursor >= nextBlock.start) {
      schedule.push({
        time:     minutesToTime(nextBlock.start),
        task:     nextBlock.name,
        type:     nextBlock.type,
        duration: +((nextBlock.end - nextBlock.start) / 60).toFixed(2),
      });
      cursor   = nextBlock.end;
      blockIdx++;
      continue;
    }

    // How far can we go before the next fixed block (or study end)?
    const horizon   = nextBlock ? Math.min(nextBlock.start, studyEnd) : studyEnd;
    const timeAvail = horizon - cursor;

    if (timeAvail < 5) {
      cursor = horizon; // skip tiny gap
      continue;
    }

    // Determine study slot duration
    const currentSlot  = slotIdx < studySlots.length ? studySlots[slotIdx] : null;
    const wantDuration = currentSlot ? currentSlot.duration : focusDuration;
    const actualDur    = Math.min(wantDuration, timeAvail);

    // Push study slot
    if (currentSlot) {
      schedule.push({
        time:     minutesToTime(cursor),
        task:     currentSlot.task.title,
        type:     'study',
        duration: +(actualDur / 60).toFixed(2),
        course:   currentSlot.task.course || undefined,
        taskId:   String(currentSlot.task._id),
      });
      slotIdx++;
      // Re-queue the unfinished portion if a fixed block trimmed this slot
      if (actualDur < currentSlot.duration) {
        studySlots.splice(slotIdx, 0, {
          task:     currentSlot.task,
          duration: currentSlot.duration - actualDur,
        });
      }
    } else {
      schedule.push({
        time:     minutesToTime(cursor),
        task:     'Free Study / Review',
        type:     'study',
        duration: +(actualDur / 60).toFixed(2),
      });
    }

    cursor += actualDur;
    sessionCount++;
    if (cursor >= studyEnd) break;

    // Recheck blocks after cursor advance
    advanceBlocks();
    const blockAfterStudy = blockIdx < fixedBlocks.length ? fixedBlocks[blockIdx] : null;

    // Skip regular break if a fixed block starts here
    if (blockAfterStudy && blockAfterStudy.start <= cursor) continue;

    // Insert break (long every `longBreakAfter` sessions, else short)
    const isLong       = sessionCount % longBreakAfter === 0;
    const desiredBreak = isLong ? longBreakDuration : breakDuration;
    const breakHorizon = blockAfterStudy ? Math.min(blockAfterStudy.start, studyEnd) : studyEnd;
    const actualBreak  = Math.min(desiredBreak, breakHorizon - cursor);

    if (actualBreak >= 3) {
      schedule.push({
        time:     minutesToTime(cursor),
        task:     isLong ? 'Long Break' : 'Short Break',
        type:     'break',
        duration: +(actualBreak / 60).toFixed(2),
      });
      cursor += actualBreak;
    }
  }

  // ── Ensure all fixed blocks are present in the final schedule ───────────────
  fixedBlocks.forEach((block) => {
    const blockTime = minutesToTime(block.start);
    if (!schedule.some((s) => s.time === blockTime && s.type === block.type)) {
      schedule.push({
        time:     blockTime,
        task:     block.name,
        type:     block.type,
        duration: +((block.end - block.start) / 60).toFixed(2),
      });
    }
  });

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
