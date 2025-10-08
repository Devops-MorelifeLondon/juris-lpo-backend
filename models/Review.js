// models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  attorney: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attorney',
    required: true
  },
  paralegal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paralegal',
    required: true
  },
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  ratings: {
    overall: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    quality: {
      type: Number,
      min: 1,
      max: 5
    },
    timeliness: {
      type: Number,
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    professionalism: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  feedback: {
    type: String,
    required: true
  },
  strengths: [String],
  improvements: [String],
  wouldRecommend: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  paralegalResponse: {
    text: String,
    respondedAt: Date
  }
}, {
  timestamps: true
});

// Indexes
reviewSchema.index({ paralegal: 1, createdAt: -1 });
reviewSchema.index({ attorney: 1, case: 1 });

module.exports = mongoose.model('Review', reviewSchema);
