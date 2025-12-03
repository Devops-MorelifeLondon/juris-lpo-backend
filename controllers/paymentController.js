const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const Attorney = require('../models/Attorney');
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');

// 1. One-Time Payment Intent (Custom Services)
exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, serviceName, attorneyId } = req.body;

    // Create the PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents
      currency: 'usd',
      metadata: {
        attorneyId,
        serviceName,
        type: 'one_time_service'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
};

// 2. Create Subscription (Recurring Plans)
exports.createSubscription = async (req, res) => {
  try {
    const { priceId, attorneyId } = req.body;
    
    // Find the attorney to get/create Stripe Customer ID
    const attorney = await Attorney.findById(attorneyId);
    if (!attorney) return res.status(404).json({ error: 'Attorney not found' });

    let customerId = attorney.stripeCustomerId;

    // Create Stripe Customer if not exists
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: attorney.email,
        name: attorney.fullName,
        metadata: {
          attorneyId: attorney._id.toString()
        }
      });
      customerId = customer.id;
      
      // Save customer ID to Attorney model
      attorney.stripeCustomerId = customerId;
      await attorney.save();
    }

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        attorneyId: attorneyId,
        type: 'subscription_creation'
      }
    });

    res.status(200).json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: error.message });
  }
};

// 3. Webhook Handler (Updates DB based on Stripe events)
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody, // Ensure your express app preserves raw body for this route
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle specific events
  switch (event.type) {
    // A) One-time payment succeeded
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;

    // B) Subscription invoice paid (Recurring)
    case 'invoice.payment_succeeded':
      await handleInvoiceSuccess(event.data.object);
      break;

    // C) Subscription updated/deleted
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionUpdate(event.data.object);
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

// --- Helper Functions for Webhook ---

async function handlePaymentSuccess(paymentIntent) {
  // Only handle if it's a one-time service (metadata check)
  if (paymentIntent.metadata.type === 'one_time_service') {
    await Transaction.create({
      attorney: paymentIntent.metadata.attorneyId,
      stripePaymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'succeeded',
      paymentMethod: {
        // You'd typically fetch the PaymentMethod object to get brand/last4
        // simplified here for brevity
        brand: 'card', 
        last4: 'xxxx' 
      },
      type: 'one_time_service',
      description: paymentIntent.metadata.serviceName,
      billingDetails: {
        email: paymentIntent.receipt_email
      },
      receiptUrl: paymentIntent.charges.data[0]?.receipt_url
    });
  }
}

async function handleInvoiceSuccess(invoice) {
  // This handles recurring subscription payments
  if (invoice.subscription) {
     const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
     
     // 1. Create Transaction Record
     await Transaction.create({
      attorney: subscription.metadata.attorneyId,
      subscription: await getSubscriptionIdByStripeId(invoice.subscription),
      stripePaymentIntentId: invoice.payment_intent,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'succeeded',
      type: 'subscription_cycle',
      description: `Subscription Renewal - ${new Date().toLocaleDateString()}`,
      receiptUrl: invoice.hosted_invoice_url
    });

    // 2. Update Subscription Model Dates
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: invoice.subscription },
      {
        status: 'active',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      }
    );
  }
}

async function handleSubscriptionUpdate(stripeSub) {
    const statusMap = {
        'active': 'active',
        'past_due': 'past_due',
        'canceled': 'canceled',
        'unpaid': 'unpaid'
    };

    await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: stripeSub.id },
        { 
            status: statusMap[stripeSub.status] || 'incomplete',
            canceledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null
        },
        { upsert: true } // Create if doesn't exist (sync safety)
    );
}

// Helper to resolve MongoID from StripeSubID
async function getSubscriptionIdByStripeId(stripeSubId) {
    const sub = await Subscription.findOne({ stripeSubscriptionId: stripeSubId });
    return sub ? sub._id : null;
}

// 4. Get Transaction History
exports.getTransactions = async (req, res) => {
    try {
        const { attorneyId } = req.params;
        const transactions = await Transaction.find({ attorney: attorneyId })
            .sort({ createdAt: -1 })
            .limit(20);
            
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};