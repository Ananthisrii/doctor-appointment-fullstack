import dotenv from 'dotenv'
dotenv.config();
import validator from "validator"
import bcrypt from "bcrypt"
import userModel from "../models/userModel.js"
import jwt from "jsonwebtoken"
import { v2 as cloudinary } from 'cloudinary'
import doctorModel from "../models/doctorModel.js"
import appointmentModel from "../models/appointmentModel.js"
import Razorpay from 'razorpay'
import axios from 'axios'
import crypto from 'crypto'

console.log("Import test:", appointmentModel);


// API to register user
const registerUser = async (req, res) => {

    try {
        
         const {name, email, password } = req.body

         if(!name || !password || !email ){
            return res.json({success: false, message: "Missing Details"})
         }

         // validating email format
         if (!validator.isEmail(email)) {
            return res.json({success:false,message: "Enter a Valid Email"})
         }

         // validating strong password
         if (password.length < 8) {
            return res.json({success:false, message: "Enter a Strong Password"})
         }

         // hashing user password
            const salt = await bcrypt.genSalt(10)
            const hashedPassword = await bcrypt.hash(password,salt)

            const userData = {
                name,
                email,
                password: hashedPassword
            }
       
            const newUser = new userModel(userData)
            const user = await newUser.save()
            
            const token = jwt.sign({id:user._id}, process.env.JWT_SECRET)

            res.json({success: true, token})


    } catch (error) {
        console.log(error)
        res.json({success: false, message:error.message})
    }
}

// API for user login
const loginUser = async (req, res) => {

   try {
      
       const {email, password} = req.body
       const user = await userModel.findOne({email})

       if (!user) {
           return res.json({success: false, message:"User does not exist"})
       }

       const isMatch = await bcrypt.compare(password,user.password)

       if (isMatch) {
         const token = jwt.sign({id:user._id}, process.env.JWT_SECRET)
         res.json({success: true, token})
       } else {
         res.json({success: false,message:"Invalid Credentials"})
       }

   } catch (error) {
       console.log(error)
       res.json({success: false, message:error.message})
   }

}

// API to create user profile data
const getProfile = async (req, res) => {
    
    try {
        
        const  userId  = req.userId
        const userData = await userModel.findById(userId).select('-password')
        
        console.log(req.userId)
        res.json({success: true,userData})


    } catch (error) {
        res.json({success: false,message:error.message})
    }
}

// API to update user profile
const updateprofile = async (req, res) => {
    try {
        
        const userId = req.userId
        const { name, phone, address, dob, gender } = req.body
        const imageFile = req.file

        if (!name || !phone || !dob || !gender) {
            return res.json({success: false, message: 'Data Missing'})
        }

        await userModel.findByIdAndUpdate(userId,{name,phone,address:JSON.parse(address),dob,gender})

        if (imageFile) {

        // upload image to cloudinary
         const imageUpload = await cloudinary.uploader.upload(imageFile.path,{resource_type:'image'})
         const imageURL = imageUpload.secure_url

         await userModel.findByIdAndUpdate(userId,{image:imageURL})
        }

        res.json({success: true,message: "Profile Updated"})

    } catch (error) {
        console.log(error)
       res.json({success: false, message:error.message})
    }
}

// API to book appointment
const bookAppointment = async (req, res) => {
    try {
        
        const userId = req.userId
        const { docId, slotDate, slotTime } = req.body

        const docData = await doctorModel.findById(docId).select('-password')

        if (!docData.available) {
            return res.json({success: false, message: "Doctor not Available"})
        }

        let slots_booked = docData.slots_booked || {}

        // checking for slot availablity
        if (slots_booked[slotDate]) {
            if (slots_booked[slotDate].includes(slotTime)) {
                return res.json({success: false, message: "Slot not Available"})
            } else {
                slots_booked[slotDate].push(slotTime)
            }
        } else {
            slots_booked[slotDate] = []
            slots_booked[slotDate].push(slotTime)
        }

        const userData = await userModel.findById(userId).select('-password')

    

        const appointmentData = {
            userId: userId, docId, userData, docData, amount: docData.fees, slotTime, slotDate,
            date: Date.now()
        }

        const newAppointment = new appointmentModel(appointmentData)
        await newAppointment.save()

        // save new slots data in docData
        await doctorModel.findByIdAndUpdate(docId,{$set: {slots_booked}})

        res.json({success: true, message: "Appointment Booked"})
        
    } catch (error) {
         console.log(error)
       res.json({success: false, message:error.message})
    }
}

//API to get user appointment for frontend my-appointment page
const listAppointment = async (req, res) => {
    try {
        
        const  userId  = req.userId
        const appointments = await appointmentModel.find({userId})

        res.json({success: true, appointments})

    } catch (error) {
        console.log(error)
        res.json({success: false, message:error.message})
    }
} 

//API to cancel appointment
const cancelAppoinment = async (req, res) => {

    try {

        const userId = req.userId
        const { appointmentId } = req.body

        const appointmentData = await appointmentModel.findById(appointmentId)

        //verify appointment user
        if (appointmentData.userId !== userId) {
            return res.json({success: false,message: "Unauthorized action"})
        }

        await appointmentModel.findByIdAndUpdate(appointmentId, {cancelled:true})

        // releasing doctor slot
        const { docId, slotDate, slotTime } = appointmentData

        const  doctorData = await doctorModel.findById(docId)

        let slots_booked = doctorData.slots_booked

        slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime)

        await doctorModel.findByIdAndUpdate(docId, {slots_booked})

        res.json({success: true, message: "Appointment cancelled"})
        
    } catch (error) {
        console.log(error)
        res.json({success: false, message:error.message})
    }
}

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
})
   
   

// API to make payment of appointment using razorpay
const paymentRazorpay = async (req, res) => {

    try {
        const { appointmentId } = req.body
    const appointmentData = await appointmentModel.findById(appointmentId)
    console.log('model:', appointmentModel);
    

    if (!appointmentData || appointmentData.cancelled) {
        return res.json({success: false, message: "Appointment cancelled  or not found"})
    }

    // createing options for razorpay payment
    const options = {
        amount: appointmentData.amount * 100,
        currency: process.env.CURRENCY,
        receipt: appointmentId,
    }

    // creation of an order
    const order = await razorpayInstance.orders.create(options)

    res.json({success: true, order})
    } catch (error) {
        console.log(error)
        res.json({success: false, message:error.message})
    }
    
    

}

// API to verify payment of razorpay 
const verifyRazorpay = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        const generated_signature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        // 🔥 VERIFY SIGNATURE
        if (generated_signature !== razorpay_signature) {
            return res.json({
                success: false,
                message: "Payment verification failed"
            });
        }

        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);

        await appointmentModel.findByIdAndUpdate(orderInfo.receipt, {
            payment: true,
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            paidAmount: orderInfo.amount
        });

        res.json({ success: true, message: "Payment Successful" });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to refund payment


const refundPayment = async (req, res) => {
    try {
        const { id } = req.params;

        // 🔍 Get appointment
        const appointmentData = await appointmentModel.findById(id);

        if (!appointmentData) {
            return res.json({ success: false, message: "Appointment not found" });
        }

        // 🔐 सुरक्षा check
        if (appointmentData.userId !== req.userId) {
            return res.json({ success: false, message: "Unauthorized action" });
        }

        // 💳 Payment exists?
        if (!appointmentData.paymentId) {
            return res.json({ success: false, message: "No payment found" });
        }

        // 🔁 Prevent double refund
        if (appointmentData.refundStatus === "processed") {
            return res.json({
                success: false,
                message: "Refund already processed"
            });
        }

        // 🔥 Get REAL payment from Razorpay
        const payment = await razorpayInstance.payments.fetch(
            appointmentData.paymentId
        );

        console.log("Payment Debug:", {
            id: payment.id,
            amount: payment.amount,
            refunded: payment.amount_refunded,
            status: payment.status
        });

        // ❌ Already refunded?
        if (payment.amount_refunded > 0) {
            return res.json({
                success: false,
                message: "Payment already refunded"
            });
        }

        // ❌ Not captured
        if (payment.status !== "captured") {
            return res.json({
                success: false,
                message: "Payment not eligible for refund"
            });
        }

        // 💸 REFUND (final working call)
        const refund = await axios.post(
            `https://api.razorpay.com/v1/payments/${payment.id}/refund`,
            {
                amount: payment.amount   // ✅ exact amount
            },
            {
                auth: {
                    username: process.env.RAZORPAY_KEY_ID,
                    password: process.env.RAZORPAY_KEY_SECRET
                }
            }
        );

        // 🧾 Update DB
        appointmentData.cancelled = true;
        appointmentData.refundId = refund.data.id;
        appointmentData.refundStatus = refund.data.status;

        await appointmentData.save();

        return res.json({
            success: true,
            message: "Refund successful"
        });

    } catch (error) {
        console.log("Refund Error:", error.response?.data || error.message);

        return res.json({
            success: false,
            message: error.response?.data?.error?.description || "Refund failed"
        });
    }
};

export {registerUser, loginUser, getProfile, updateprofile, bookAppointment, listAppointment, cancelAppoinment, paymentRazorpay, verifyRazorpay, refundPayment}