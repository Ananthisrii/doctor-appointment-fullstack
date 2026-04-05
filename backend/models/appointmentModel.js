import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
    userId: { type: String, required: true},
    docId: { type: String, required: true},
    slotDate: { type: String, required: true},
    slotTime: { type: String, required: true},
    userData: { type: Object, required: true},
    docData: { type: Object, required: true},
    amount: { type: Number, required: true},
    date: { type: Number, required: true},
    cancelled: { type: Boolean, default: false},
    payment: { type: Boolean, default: false},
    isCompleted: { type: Boolean, default: false},

    paymentId: { type: String },   // Razorpay payment_id
    orderId: { type: String },     // Razorpay order_id

    refundId: { type: String },    // Razorpay refund_id
    refundStatus: { 
        type: String, 
        enum: ["none", "pending", "processed", "failed"], 
        default: "none" 
    }
})

const appointmentModel = mongoose.models.appointment || mongoose.model('appointment',appointmentSchema)
export default appointmentModel