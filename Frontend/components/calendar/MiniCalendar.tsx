import React, { useState, useEffect } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { WEEKDAYS } from "@/lib/utils";
import type { Appointment } from "@/types";

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

  useEffect(() => {
    setDisplayDate(currentDate);
  }, [currentDate]);

  const getDaysInMonth = (date: Date): (number | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (number | null)[] = [];
    let startDayOfWeek = firstDay.getDay();

    for (let i = 0; i < startDayOfWeek; i++) {
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
    setDisplayDate(
      new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setDisplayDate(
      new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1)
    );
  };

  const getDayClass = (day: number | null) => {
    if (!day) return "";
    const dateString = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    const isSelected = dateString === selectedDate;

    let baseClass =
      "relative h-10 w-10 flex items-center justify-center rounded-md text-sm";
    baseClass += " cursor-pointer transition-colors";
    if (isSelected) {
      baseClass += " bg-blue-600 text-white font-bold";
    } else {
      baseClass += " hover:bg-gray-200 bg-gray-50 text-gray-800";
    }
    return baseClass;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-inner">
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={handlePrevMonth}
          className="p-1 rounded-full hover:bg-gray-200 transition text-gray-800"
        >
          <ArrowLeft size={16} />
        </button>
        <h4 className="text-md font-bold text-gray-800">
          {year}年 {month}月
        </h4>
        <button
          onClick={handleNextMonth}
          className="p-1 rounded-full hover:bg-gray-200 transition text-gray-800"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-800">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className={
              day === "日"
                ? "text-red-500"
                : day === "土"
                ? "text-blue-500"
                : ""
            }
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mt-1">
        {days.map((day, index) => {
          if (!day) return <div key={index}></div>;
          const dateString = `${year}-${String(month).padStart(
            2,
            "0"
          )}-${String(day).padStart(2, "0")}`;
          const hasAppointment =
            dateString &&
            appointments[dateString] &&
            appointments[dateString].length > 0;
          return (
            <div
              key={index}
              className={getDayClass(day)}
              onClick={() => onDateChange(dateString)}
            >
              {day}
              {hasAppointment && (
                <div className="absolute bottom-1 right-1 h-2 w-2 bg-purple-500 rounded-full"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MiniCalendar;
