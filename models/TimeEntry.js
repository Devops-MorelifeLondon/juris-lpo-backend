const mongoose = require('mongoose');

const timeEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Paralegal' // Your existing User model
  },
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case', // Your existing Case model
    required: false
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task', // Your existing Task model
    required: false
  },
  description: {
    type: String,
    trim: true
  },
  // The moment the current timer started ticking. 
  // If null, the timer is not currently running.
  startTime: {
    type: Date,
    default: null
  },
  // The total accumulated time in SECONDS before the current start.
  // When you pause, we calculate (Now - startTime) + existing duration.
  duration: {
    type: Number,
    default: 0
  },
  isBillable: {
    type: Boolean,
    default: true
  },
  isRunning: {
    type: Boolean,
    default: false
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    default: null // Critical for the unbilled filter to work
  }
}, { timestamps: true });

// Virtual to get total duration including currently ticking time
timeEntrySchema.virtual('totalDuration').get(function() {
  if (this.isRunning && this.startTime) {
    const currentSession = (Date.now() - new Date(this.startTime).getTime()) / 1000;
    return this.duration + currentSession;
  }
  return this.duration;
});

module.exports = mongoose.model('TimeEntry', timeEntrySchema);