// models/Meeting.js
const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  meetLink: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'creatorType',
  },
  creatorType: {
    type: String,
    enum: ['Attorney', 'Paralegal'],
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'participantType',
    },
  ],
  participantType: {
    type: String,
    enum: ['Attorney', 'Paralegal'],
  },
}, { timestamps: true });

module.exports = mongoose.model('Meeting', meetingSchema);
