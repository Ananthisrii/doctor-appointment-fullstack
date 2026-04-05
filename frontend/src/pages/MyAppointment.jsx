import React, { useContext } from 'react'
import {AppContext} from '../context/AppContext'
import { useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const MyAppointment = () => {

  const {backendUrl, token, getDoctorsData} = useContext(AppContext)

  const [appointments, setAppointments] = useState([])
  const months = ["","Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  const slotDateFormat = (slotDate) => {
     const dateArray = slotDate.split('_')
     return dateArray[0]+ " " + months[Number(dateArray[1])] + " " + dateArray[2]
  }

  const navigate = useNavigate()

  const getUserAppointments = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/user/appointments', {headers: {token}})

      if (data.success) {
         setAppointments(data.appointments.reverse())
         console.log(data.appointments);
         
      }

    } catch (error) {
      console.log(error);
      toast.error(error.message)
    }
  }

  const cancelAndRefundAppointment = async (appointmentId) => {
  try {

    const { data } = await axios.post(
      `${backendUrl}/api/user/appointments/${appointmentId}/refund`,  // ✅ NEW ROUTE
      {},
      { headers: { token } }
    );

    if (data.success) {
      toast.success(data.message);
      getUserAppointments();
    } else {
      toast.error(data.message);
    }

  } catch (error) {
    console.log(error);
    toast.error(error.message);
  }
};

  const initPay = (order) => {

  const options = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: order.amount,
    currency: order.currency,
    name: "Appointment Payment",
    description: "Appointment Payment",
    order_id: order.id,

    // optional (keep or remove)
    method: {
      card: true,
      netbanking: true,
      wallet: true,
    },

    handler: async (response) => {
      console.log("Payment Response:", response);

      try {
        const { data } = await axios.post(
          backendUrl + '/api/user/verifyRazorpay',
          {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          },
          { headers: { token } }
        );

        if (data.success) {
          toast.success("Payment Successful");
          getUserAppointments();
          navigate('/my-appointments');
        } else {
          toast.error(data.message);
        }

      } catch (error) {
        console.log(error);
        toast.error("Verification failed");
      }
    }
  };

  const rzp = new window.Razorpay(options);

  // 🔥 HANDLE PAYMENT FAILURE
  rzp.on('payment.failed', function (response) {
    console.log("Payment Failed:", response);
    toast.error("Payment Failed");
  });

  rzp.open();
};

  const appointmentRazorpay = async (appointmentId) => {
  
    try {
      
      const {data} = await axios.post(backendUrl + '/api/user/payment-razorpay', {appointmentId},{headers: {token}})

      if (data.success) {
        
        initPay(data.order)
      }

    } catch (error) {
      
    }

  }

  useEffect(() => {
    if (token) {
      getUserAppointments()
      getDoctorsData()
    }
  },[token])

  return (
    <div>
      <p className='pb-3 mt-12 font-medium text-zinc-700 border-b'>My appointments</p>
      <div>
        {appointments.map((item,index)=>(
          <div className='grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gao-6 py-2 border-b' key={index}>
            <div>
              <img className='w-32 bg-indigo-50' src={item.docData.image} alt="" />
            </div>
            <div className='flex-1 text-sm text-zinc-600 '>
              <p className='text-neutral-800 font-semibold '>{item.docData.name}</p>
              <p>{item.docData.speciality}</p>
              <p className='text-zinc-700 font-medium mt-1'>Address:</p>
              <p className='text-xs'>{item.docData.address.line1}</p>
              <p className='text-xs'>{item.docData.address.line2}</p>
              <p className='text-sm mt-1'> <span className='text-sm text-neutral-700 font-medium'>Date & Time:</span> {slotDateFormat(item.slotDate)} |  {item.slotTime} </p>
            </div>
            <div></div>
            <div className='flex flex-col gap-2 justify-end'>
              {!item.cancelled && item.payment && !item.isCompleted && <button className='sm:min-w-48 py-2 border rounded text-green-500 bg-indigo-50'>Payment Completed</button>}
              {!item.cancelled && !item.payment && !item.isCompleted && <button onClick={() =>appointmentRazorpay(item._id)} className='text-sm text-stone-500 text-center sm:min-w-48 py-2 border hover:bg-primary hover:text-white transition-all duration-300'>Pay Online</button>}
              {!item.cancelled && item.payment && !item.isCompleted && item.refundStatus !== "processed" && (
                 <button onClick={() => cancelAndRefundAppointment(item._id)}
                   className='text-sm text-stone-500 text-center sm:min-w-48 py-2 border hover:bg-red-600 hover:text-white transition-all duration-300'>
                   Cancel & Refund</button>)}
              {item.cancelled && !item.isCompleted && <button className='sm:min-w-48 py-2 border border-red-500 rounded text-red-500'>Appointment cancelled</button>}
              {item.isCompleted && <button className='sm:min-w-48 py-2 border border-green-500 rounded text-green-500'>Completed </button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MyAppointment