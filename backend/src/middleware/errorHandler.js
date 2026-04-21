const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message || 'Server Error';

  // SQLite unique constraint
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.code === 'SQLITE_CONSTRAINT') {
    statusCode = 400;
    message = 'Duplicate value — that record already exists';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Not authorized, token invalid';
  }

  res.status(statusCode).json({ success: false, message });
};

module.exports = errorHandler;
