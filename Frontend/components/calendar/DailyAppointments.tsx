"use client";
import React from "react";
import { ArrowLeft, Calendar, Home } from "lucide-react";
import type { AppointmentWithAnimalInfo } from "@/types";
import { useI18n } from "@/lib/i18n";

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
  const { lang } = useI18n();
  const toMinutes = (t?: string) => {
    if (!t) return Number.POSITIVE_INFINITY;
    const m = t.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return Number.POSITIVE_INFINITY;
    const h = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    return h * 60 + mm;
  };
  const sortedAppointments = [...appointments].sort((a, b) => {
    const ma = toMinutes(a.time);
    const mb = toMinutes(b.time);
    if (ma !== mb) return ma - mb;
    // tie-breaker: by date string (if available)
    return (a.date || "").localeCompare(b.date || "");
  });

  return (
    <div className="w-full max-w-4xl mx-auto p-3 md:p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onBack} className="flex items-center text-blue-600 hover:underline">
          <ArrowLeft className="mr-1 h-4 w-4" /> {lang === 'ja' ? 'カレンダーに戻る' : 'Back to Calendar'}
        </button>
        <button onClick={onHome} className="flex items-center text-gray-600 hover:text-blue-600 transition-colors">
          <Home className="mr-1 h-4 w-4" /> {lang === 'ja' ? 'ホームへ' : 'Home'}
        </button>
      </div>
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center mb-4">
          <Calendar className="mr-2" />
          {selectedDate} {lang === 'ja' ? 'の予約' : 'Appointments'}
        </h2>
        {sortedAppointments.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {sortedAppointments.map((app, index) => {
              const time = app.time || app.date.split("T")[1]?.substring(0, 5) || '';
              return (
                <li
                  key={index}
                  className="p-3 md:p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onSelectAnimal(app.microchip_number)}
                >
                  <p className="font-bold text-base md:text-lg text-blue-700 flex items-center">
                    <span className="font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs md:text-sm mr-3">
                      {time}
                    </span>
                    {app.animal_name}
                  </p>
                  {app.doctor && (
                    <p className="text-sm text-gray-900">{lang === 'ja' ? '担当' : 'Doctor'}: <span className="font-semibold text-gray-900">{app.doctor}</span></p>
                  )}
                  {app.farm_id && (
                    <p className="text-sm text-gray-900">{lang === 'ja' ? '牧場' : 'Farm'}: {app.farm_id}</p>
                  )}
                  {app.summary && (
                    <p className="text-sm text-gray-900">{lang === 'ja' ? '所見' : 'Notes'}: {app.summary}</p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-10 text-gray-900">
            {lang === 'ja' ? 'この日には予定はありません' : 'No appointments on this date.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyAppointments;
