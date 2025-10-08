exports.errorHandler = (err, req, res, next) => {
  console.error('🔥 Error:', err); // Add this line for debugging
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
};
