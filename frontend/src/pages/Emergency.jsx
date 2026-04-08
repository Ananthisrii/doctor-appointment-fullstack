import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";

const Emergency = () => {

  const [emergencyDoctors, setEmergencyDoctors] = useState([]);
  const navigate = useNavigate();

  const { doctors } = useContext(AppContext);

  // 🚨 Filter only emergency doctors
  const applyEmergencyFilter = () => {
    const filtered = doctors.filter(
      (doc) => doc.emergencyAvailability && doc.available
    );
    setEmergencyDoctors(filtered);
  };

  useEffect(() => {
    applyEmergencyFilter();
  }, [doctors]);

  return (
    <div>
      <p className="text-red-600 font-semibold">
        🚨 Emergency Doctors Available Now
      </p>

      <div className="w-full grid grid-cols-auto gap-4 gap-y-6 mt-5">
        
        {emergencyDoctors.length === 0 ? (
          <p className="text-gray-500">No emergency doctors available</p>
        ) : (
          emergencyDoctors.map((item, index) => (
            <div
              onClick={() => navigate(`/appointment/${item._id}`)}
              className="border border-red-200 rounded-xl overflow-hidden cursor-pointer hover:translate-y-[-10px] transition-all duration-500"
              key={index}
            >
              <img className="bg-red-50" src={item.image} alt="" />

              <div className="p-4">
                
                {/* 🔴 Emergency Status */}
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <p className="w-2 h-2 bg-red-500 rounded-full"></p>
                  <p>Emergency Available</p>
                </div>

                <p className="text-gray-900 text-lg font-medium">
                  {item.name}
                </p>

                <p className="text-gray-600 text-sm">
                  {item.speciality}
                </p>

              </div>
            </div>
          ))
        )}

      </div>
    </div>
  );
};

export default Emergency;