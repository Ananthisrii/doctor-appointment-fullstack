import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import connectDB from './config/mongodb.js'
import connectCloudinary from './config/cloudinary.js'
import adminRouter from './routes/adminRoute.js'
import { loginAdmin } from './controllers/adminController.js'
import doctorRouter from './routes/doctorRoute.js'
import userRouter from './routes/userRoute.js'

// load env variables
console.log(process.env.CLOUDINARY_NAME)
console.log(loginAdmin)


// app config
const app = express()
const port = process.env.PORT || 4000

// middlewares
app.use(express.json())
app.use(cors())

//api endpoints
app.use('/api/admin', adminRouter)
app.use('/api/doctor', doctorRouter)
app.use('/api/user', userRouter)


// database connection
connectDB()
connectCloudinary()

// test route
app.get('/', (req, res) => {
    res.send('API WORKING 🚀')
})

// server start
app.listen(port, () => {
    console.log(`✅ Server started on port ${port}`)
})