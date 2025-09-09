"use client";
import React, { useState, useEffect } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import type { Appointment } from "@/types";
import { useI18n, WEEKDAYS_I18N } from "@/lib/i18n";

interface MiniCalendarProps {
  appointments: { [key: string]: Appointment[] };
  selectedDate: string;
  onDateChange: (date: string) => void;
  currentDate: Date;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({
  appointments,
  selectedDate,
  onDateChange,
  currentDate,
}) => {
  const [displayDate, setDisplayDate] = useState<Date>(currentDate);
  const { lang } = useI18n();

  useEffect(() => {
    setDisplayDate(currentDate);
  }, [currentDate]);

  const getDaysInMonth = (date: Date): (number | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(i);
    }
    return days;
  };

  const days = getDaysInMonth(displayDate);
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth() + 1;

  const handlePrevMonth = () => {
    setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1));
  };

  const getDayClass = (day: number | null) => {
    if (!day) return "";
    const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isSelected = dateString === selectedDate;
    let baseClass = "relative h-9 w-9 md:h-10 md:w-10 flex items-center justify-center rounded-md text-[11px] md:text-sm";
    baseClass += " cursor-pointer transition-colors";
    if (isSelected) baseClass += " bg-blue-600 text-white font-bold";
    else baseClass += " hover:bg-gray-200 bg-gray-50 text-gray-900";
    return baseClass;
  };

  return (
    <div className="bg-white p-3 md:p-4 rounded-lg shadow-inner touch-manipulation select-none">
      <div className="flex justify-between items-center mb-2">
        <button onClick={handlePrevMonth} className="p-1 rounded-full hover:bg-gray-200 transition text-gray-800">
          <ArrowLeft size={16} />
        </button>
        <h4 className="text-md font-bold text-gray-900">{lang === 'ja' ? `${year}年 ${month}月` : `${month}/${year}`}</h4>
        <button onClick={handleNextMonth} className="p-1 rounded-full hover:bg-gray-200 transition text-gray-800">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 md:gap-1 text-center text-[10px] md:text-xs font-semibold text-gray-900">
        {WEEKDAYS_I18N(lang).map((day) => (
          <div
            key={day}
            className={(day === "日" || day.toLowerCase().startsWith('sun')) ? 'text-red-500' : ((day === "土" || day.toLowerCase().startsWith('sat')) ? 'text-blue-500' : '')}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 md:gap-1 mt-1">
        {days.map((day, index) => {
          if (!day) return <div key={index}></div>;
          const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasAppointment = dateString && appointments[dateString] && appointments[dateString].length > 0;
          const count = hasAppointment ? appointments[dateString].length : 0;
          return (
            <div
              key={index}
              className={`group relative ${getDayClass(day)}`}
              onClick={() => onDateChange(dateString)}
              title={hasAppointment ? appointments[dateString].map(a => `${a.time || ''} ${a.animal_name || ''}`.trim()).join(', ') : ''}
            >
              {day}
              {hasAppointment && (
                <>
                  <div className="absolute bottom-1 right-1 min-h-4 min-w-4 px-1 bg-purple-600 text-white rounded-full text-[10px] leading-4 text-center">
                    {count > 9 ? '9+' : count}
                  </div>
                  <div className="pointer-events-none absolute z-10 hidden md:block group-hover:block left-1/2 -translate-x-1/2 top-10 whitespace-nowrap rounded bg-black text-white text-xs px-2 py-1 shadow">
                    {appointments[dateString].map(a => (a.time || '')).filter(Boolean).join(', ')}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MiniCalendar;
