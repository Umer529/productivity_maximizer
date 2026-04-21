const Course = require('../models/Course');

// GET /api/v1/courses
exports.getCourses = (req, res, next) => {
  try {
    const courses = Course.find({ userId: req.user.id });
    res.status(200).json({ success: true, count: courses.length, data: courses });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/courses
exports.createCourse = (req, res, next) => {
  try {
    const { name, code, color, instructor, creditHours } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Course name is required' });
    if (!code) return res.status(400).json({ success: false, message: 'Course code is required' });
    const course = Course.create({ userId: req.user.id, name, code, color, instructor, creditHours });
    res.status(201).json({ success: true, data: course });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ success: false, message: 'Course code already exists' });
    }
    next(err);
  }
};

// PUT /api/v1/courses/:id
exports.updateCourse = (req, res, next) => {
  try {
    const { name, code, color, instructor, creditHours } = req.body;
    const course = Course.update(req.params.id, req.user.id, { name, code, color, instructor, creditHours });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.status(200).json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/courses/:id
exports.deleteCourse = (req, res, next) => {
  try {
    const deleted = Course.delete(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Course not found' });
    res.status(200).json({ success: true, message: 'Course deleted' });
  } catch (err) {
    next(err);
  }
};
