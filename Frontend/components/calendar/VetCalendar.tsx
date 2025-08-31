import React, { useState, useEffect } from "react";
import { ArrowLeft, ChevronRight, NotebookTabs, Home } from "lucide-react";
import { WEEKDAYS_FULL } from "@/lib/utils";
import type { Appointment } from "@/types";

interface VetCalendarProps {
  onBack: () => void;
  onHome: () => void;
  appointments: { [key: string]: Appointment[] };
  onDateClick: (date: string) => void;
  currentDate: Date;
}

const VetCalendar: React.FC<VetCalendarProps> = ({
  onBack,
  onHome,
  appointments,
  onDateClick,
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
    setDisplayDate(
      new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setDisplayDate(
      new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1)
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> 検索画面に戻る
        </button>
        <button
          onClick={onHome}
          className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
        >
          <Home className="mr-1 h-4 w-4" /> ホームへ
        </button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center mb-4">
          <NotebookTabs className="mr-3 h-8 w-8 text-purple-600" />{" "}
          診療スケジュール
        </h2>
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-full hover:bg-gray-200 transition text-gray-800"
          >
            <ArrowLeft />
          </button>
          <h3 className="text-xl font-bold text-gray-800">
            {year}年 {month}月
          </h3>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-full hover:bg-gray-200 transition text-gray-800"
          >
            <ChevronRight />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-gray-800 border-b pb-2">
          {WEEKDAYS_FULL.map((day) => (
            <div
              key={day}
              className={
                day.trim() === "日"
                  ? "text-red-500"
                  : day.trim() === "土"
                  ? "text-blue-500"
                  : ""
              }
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2 mt-2">
          {days.map((day, index) => {
            if (!day)
              return (
                <div key={index} className="border-b border-gray-100"></div>
              );
            const dateString = `${year}-${String(month).padStart(
              2,
              "0"
            )}-${String(day).padStart(2, "0")}`;
            const appointmentsOnDay = appointments[dateString] || [];
            return (
              <div
                key={index}
                className="h-32 border rounded-lg p-2 flex flex-col cursor-pointer transition-colors hover:bg-gray-100"
                onClick={() => onDateClick(dateString)}
              >
                <span className="font-semibold">{day}</span>
                <div className="mt-1 text-xs space-y-1 overflow-y-auto">
                  {appointmentsOnDay.map((app, appIndex) => (
                    <div
                      key={appIndex}
                      className="bg-purple-100 text-purple-800 p-1 rounded"
                    >
                      {app.animal_name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VetCalendar;
