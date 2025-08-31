import React from "react";
import { ArrowLeft, Calendar, Home } from "lucide-react";
//import type { Appointment } from "@/types";
import type { AppointmentWithAnimalInfo } from "@/types";

interface DailyAppointmentsProps {
  onBack: () => void;
  onHome: () => void;
  appointments: AppointmentWithAnimalInfo[];
  selectedDate: string;
  onSelectAnimal: (microchipNumber: string) => void;
}

const DailyAppointments: React.FC<DailyAppointmentsProps> = ({
  onBack,
  onHome,
  appointments,
  selectedDate,
  onSelectAnimal,
}) => {
  const sortedAppointments = [...appointments].sort((a, b) => {
    return a.date.localeCompare(b.date);;
  });

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> カレンダーに戻る
        </button>
        <button
          onClick={onHome}
          className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
        >
          <Home className="mr-1 h-4 w-4" /> ホームへ
        </button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-4">
          <Calendar className="mr-2" />
          {selectedDate} の予定
        </h2>
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
                  onClick={() => onSelectAnimal(app.microchip_number)}
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

export default DailyAppointments;
