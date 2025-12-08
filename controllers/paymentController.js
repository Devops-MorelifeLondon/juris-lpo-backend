const Stripe = require("stripe");
const ServiceOrder = require("../models/ServiceOrder");

const stripe = Stripe(process.env.STRIPE_SECRET);

/**********************************************
 * CREATE PAYMENT INTENT (Custom UI)
 **********************************************/
exports.createPaymentIntent = async (req, res) => {
    try {
        // 1. Receive the 'address' object sent from your Frontend
        const { serviceName, price, plan, stripePriceId, address } = req.body;
        
        // 2. Security: Get the User ID/Name from the logged-in user (from middleware)
        const userId = req.user._id; 
        const userRole = req.user.role;
        
        // Construct a customer name (Required for India Export)
        const customerName = req.user.role === 'attorney' 
            ? req.user.fullName 
            : `${req.user.firstName} ${req.user.lastName}`;

        // 3. Validation: Ensure address exists before asking Stripe
        if (!address || !address.line1 || !address.city || !address.country) {
            return res.status(400).json({ 
                error: "Billing address (Line1, City, Country) is required for international payments." 
            });
        }

        const amount = Number(price.replace("$", "").replace(",", "")) * 100;

        // 4. Create local DB record
        const order = await ServiceOrder.create({
            userId,
            userRole,
            serviceName,
            price: amount / 100,
            plan,
            stripePriceId,
            billingDetails: address, // Save address in your DB too
            status: "pending"
        });

        // 5. Create Stripe Intent (THE CRITICAL FIX IS HERE)
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: "usd",
            automatic_payment_methods: { enabled: true },
            
            // --- MANDATORY FOR INDIA EXPORTS ---
            description: `Export: ${serviceName} - ${plan}`,
            shipping: {
                name: customerName, // Must match a real person's name
                address: {
                    line1: address.line1,
                    line2: address.line2 || "",
                    city: address.city,
                    state: address.state || "",
                    postal_code: address.postal_code,
                    country: address.country, // Must be ISO code (e.g. 'US', 'GB')
                }
            },
            // -----------------------------------

            metadata: {
                orderId: order._id.toString(),
                userId: userId.toString(),
                serviceName
            },
        });

        order.stripePaymentIntentId = paymentIntent.id;
        await order.save();

        return res.json({
            clientSecret: paymentIntent.client_secret,
            orderId: order._id
        });

    } catch (error) {
        console.error("PaymentIntent error:", error);
        res.status(500).json({ error: error.message });
    }
};

/**********************************************
 * CHECKOUT SESSION (Stripe Hosted)
 **********************************************/
exports.createCheckoutSession = async (req, res) => {
    try {
        const { serviceName, plan, stripePriceId } = req.body;
        const userId = req.user._id;
        const userRole = req.user.role;

        const order = await ServiceOrder.create({
            userId,
            userRole,
            serviceName,
            plan,
            stripePriceId
        });

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            
            // --- CRITICAL FIX FOR INDIA EXPORTS ---
            billing_address_collection: "required", 
            // --------------------------------------
            
            customer_email: req.user.email,
            line_items: [
                {
                    price: stripePriceId,
                    quantity: 1
                }
            ],
            metadata: { 
                orderId: order._id.toString(),
                userId: userId.toString()
            },
            success_url: "http://localhost:5173/payment-success?session_id={CHECKOUT_SESSION_ID}",
            cancel_url: "http://localhost:5173/payment-cancel"
        });

        order.stripeSessionId = session.id;
        await order.save();

        return res.json({ url: session.url });
    } catch (err) {
        console.error("Checkout session error:", err);
        res.status(500).json({ error: "Checkout session failed" });
    }
};

/**********************************************
 * STRIPE WEBHOOK
 **********************************************/
exports.stripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const data = event.data.object;

    if (event.type === "payment_intent.succeeded") {
        await ServiceOrder.findOneAndUpdate(
            { stripePaymentIntentId: data.id },
            { status: "paid" }
        );
    }

    if (event.type === "checkout.session.completed") {
        await ServiceOrder.findOneAndUpdate(
            { stripeSessionId: data.id },
            { status: "paid" }
        );
    }

    res.json({ received: true });
};