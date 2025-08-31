import React from "react";
import { X, Calendar } from "lucide-react";
import type { AppointmentWithAnimalInfo } from "@/types";

interface DailyAppointmentsModalProps {
  date: string;
  appointments: AppointmentWithAnimalInfo[];
  onClose: () => void;
  onSelectAnimal: (microchipNumber: string) => void;
}

const DailyAppointmentsModal: React.FC<DailyAppointmentsModalProps> = ({
  date,
  appointments,
  onClose,
  onSelectAnimal,
}) => {
  const sortedAppointments = [...appointments].sort((a, b) => {
    return a.date.localeCompare(b.date);
  });

  const handleSelect = (microchipNumber: string) => {
    onSelectAnimal(microchipNumber);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition"
        >
          <X size={24} />
        </button>
        <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <Calendar className="mr-2" />
          {date} の予定
        </h3>
        {sortedAppointments.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {sortedAppointments.map((app, index) => {
              const time =
                app.date.split("T")[1]?.substring(0, 5) ||
                "時間未定";
              return (
                <li
                  key={index}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleSelect(app.microchip_number)}
                >
                  <p className="font-bold text-lg text-blue-700 flex items-center">
                    <span className="font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm mr-3">
                      {time}
                    </span>
                    {app.animal_name}
                  </p>
                  <p className="text-sm text-gray-800">牧場: {app.farm_id}</p>
                  <p className="text-sm text-gray-800">所見: {app.summary}</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-10 text-gray-800">
            この日には予定はありません。
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyAppointmentsModal;
