import Stripe from "stripe";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import { response } from "express";

export const stripeWebhooks = async (req, res)=>{
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const sig = req.headers["stripe-signature"]

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (error) {
        return res.status(400).send(`webhook Error: ${error.message}`)
    }

    try {
        switch (event.type) {
            case "payment_intent.succeeded":{
                const payment_intent = event.data.object;
                const sessionList = await stripe.checkout.sessions.list({
                    payment_intent: paymentIntant.id,
                })

                const session = sessionList.data[0];
                const {transactionId, appId} = session.metadata;

                if (appId === 'mygpt') {
                    const transaction = await Transaction.findOne({_id: transactionId, isPaid: false})

                    // Update credits in user account
                    await User.updateOne({_id: transaction.userId}, {$inc:{credits: transaction.credits }})

                    // Update credit Payment status
                    transaction.isPaid = true;
                    await transaction.save();
                }else{
                    return response.json({received: true, messsage: "Ignored event:Invalid app"})
                }
                break;
            }
                
            default:
                console.log("Unhandled event type:", event.type)
                break;
        }
        res.json({received: true})
    } catch (error) {
        console.error("Webhook processing error:", error)
        res.status(500).send("Internal Server Error")
    }
}