import Stripe from "stripe";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

export const stripeWebhooks = async (req, res) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers["stripe-signature"];

    let event;

    try {
        // Stripe requires raw body
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
        console.error("Webhook signature verification failed:", error.message);
        return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                const { transactionId, addId } = session.metadata;

                if (addId === "mygpt") {
                    const transaction = await Transaction.findOne({ _id: transactionId, isPaid: false });
                    if (!transaction) {
                        console.log("Transaction not found or already processed:", transactionId);
                        return res.json({ received: true, message: "Transaction already processed" });
                    }

                    // Update user credits
                    await User.updateOne(
                        { _id: transaction.userId },
                        { $inc: { credits: transaction.credits } }
                    );

                    // Mark transaction as paid
                    transaction.isPaid = true;
                    await transaction.save();

                    console.log(`Transaction ${transactionId} paid, credits added to user ${transaction.userId}`);
                } else {
                    console.log("Ignored event: Invalid app ID");
                    return res.json({ received: true, message: "Ignored event: Invalid app ID" });
                }
                break;
            }

            default:
                console.log("Unhandled event type:", event.type);
                break;
        }

        res.json({ received: true });
    } catch (error) {
        console.error("Webhook processing error:", error);
        res.status(500).send("Internal Server Error");
    }
};
