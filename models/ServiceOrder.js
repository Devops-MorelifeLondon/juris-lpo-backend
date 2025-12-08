const mongoose = require("mongoose");

const ServiceOrderSchema = new mongoose.Schema(
  {
    serviceName: { type: String, required: true },
    plan: { type: String, required: true },
    price: { type: Number, required: true },
    
    // ⬇ NEW FIELDS: Track who made the order
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true, 
      refPath: 'userRole' // This allows dynamic referencing to Attorney or Paralegal
    },
    userRole: { 
      type: String, 
      required: true, 
      enum: ['attorney', 'paralegal'] 
    },

    stripePriceId: { type: String },
    stripePaymentIntentId: { type: String },
    stripeSessionId: { type: String },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending"
    },
    customerEmail: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceOrder", ServiceOrderSchema);