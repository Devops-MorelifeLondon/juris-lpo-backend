// models/TaskLog.js
const mongoose = require('mongoose');

const taskLogSchema = new mongoose.Schema({
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['Research', 'Drafting', 'Review', 'Filing', 'Meeting', 'Communication', 'Administrative', 'Other'],
        required: true
    },
    hoursSpent: {
        type: Number,
        required: true,
        min: 0
    },
    performedByModel: {
        type: String,
        enum: ['Attorney', 'Paralegal'],
        required: true
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Paralegal', // Or 'Attorney' if needed; adjust based on who logs work
        required: true
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

// Indexes for efficient querying
taskLogSchema.index({ task: 1, createdAt: -1 }); // Logs per task, newest first
taskLogSchema.index({ performedBy: 1, createdAt: -1 }); // User's work history
taskLogSchema.index({ type: 1, task: 1 }); // Filter by work type per task

module.exports = mongoose.model('TaskLog', taskLogSchema);
