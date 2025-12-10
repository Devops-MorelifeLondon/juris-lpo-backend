const express = require('express');
const router = express.Router();
const timeEntryController = require('../controllers/timeEntryController');

// Import your middleware
// Make sure the path points to where you saved the code you pasted
const { protect } = require('../middleware/auth'); 

// Apply protection to all routes in this file
router.use(protect);

// Routes
router.get('/', timeEntryController.getTimeLogs);
router.get('/export', timeEntryController.exportToExcel); // Move export above :id routes to avoid collision
router.post('/start', timeEntryController.startTimer);
router.put('/:id/stop', timeEntryController.stopTimer);
router.put('/:id', timeEntryController.updateEntry);
router.delete('/:id', timeEntryController.deleteEntry);

module.exports = router;