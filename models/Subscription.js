const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    attorney: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attorney',
      required: true,
      unique: true, // One active subscription record per attorney usually suffices
    },
    stripeSubscriptionId: {
      type: String,
      required: true,
      unique: true,
    },
    stripeCustomerId: {
      type: String,
      required: true,
    },
    planType: {
      type: String,
      enum: ['Basic', 'Professional', 'Enterprise'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid'],
      default: 'incomplete',
    },
    // TIME: Managing the billing cycle
    currentPeriodStart: {
      type: Date,
      required: true,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    canceledAt: {
      type: Date,
    },
    // ENROLLMENTS: Specific features or limits included in this plan
    enrollments: {
        // e.g. ["Family Law Bundle", "Estate Planning Module"]
        services: [{
            type: String
        }], 
        // Usage tracking (e.g. 40 hours/mo as seen in your frontend)
        limits: {
            maxHoursPerMonth: { type: Number, default: 0 },
            hoursUsedThisMonth: { type: Number, default: 0 },
            maxConsultations: { type: Number, default: 0 },
        }
    },
    autoRenew: {
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup by stripe ID or status
subscriptionSchema.index({ stripeSubscriptionId: 1 });
subscriptionSchema.index({ status: 1 });

// Helper to check if subscription is valid (Active or Trialing)
subscriptionSchema.methods.isActive = function() {
    return ['active', 'trialing'].includes(this.status);
};

module.exports = mongoose.model('Subscription', subscriptionSchema);