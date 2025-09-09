"use client";
import React, { useState, useEffect } from "react";
import { ArrowLeft, ChevronRight, NotebookTabs, Home } from "lucide-react";
import type { Appointment } from "@/types";
import { useI18n, WEEKDAYS_FULL_I18N, WEEKDAYS_I18N, formatYearMonthFor } from "@/lib/i18n";

interface VetCalendarProps {
  onBack: () => void;
  onHome: () => void;
  appointments: { [key: string]: Appointment[] };
  onDateClick: (date: string) => void;
  currentDate: Date;
  compact?: boolean;
  maxPerDay?: number; // 1日あたり表示する最大件数（超過は+N）
  showFarm?: boolean;
}

const VetCalendar: React.FC<VetCalendarProps> = ({
  onBack,
  onHome,
  appointments,
  onDateClick,
  currentDate,
  compact = false,
  maxPerDay,
  showFarm = true,
}) => {
  const [displayDate, setDisplayDate] = useState<Date>(currentDate);
  const { lang, t } = useI18n();
  const [doctorFilter, setDoctorFilter] = useState<string>("");

  useEffect(() => {
    setDisplayDate(currentDate);
  }, [currentDate]);

  const getDaysInMonth = (date: Date): (number | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(i);
    return days;
  };

  const days = getDaysInMonth(displayDate);
  const toMinutes = (t?: string) => {
    if (!t) return Number.POSITIVE_INFINITY;
    const m = /^(\d{1,2}):(\d{2})$/.exec(t);
    if (!m) return Number.POSITIVE_INFINITY;
    const h = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    return h * 60 + mm;
  };
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth() + 1;

  const handlePrevMonth = () => {
    setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1));
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-3 md:p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onBack} className="flex items-center text-blue-600 hover:underline">
          <ArrowLeft className="mr-1 h-4 w-4" /> {t("back_to_search")}
        </button>
        <button onClick={onHome} className="flex items-center text-gray-600 hover:text-blue-600 transition-colors">
          <Home className="mr-1 h-4 w-4" /> {t("go_home")}
        </button>
      </div>
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center mb-4">
          <NotebookTabs className="mr-3 h-8 w-8 text-purple-600" /> {t("schedule_title")}
        </h2>
        <div className="flex justify-between items-center mb-4">
          <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-200 transition text-gray-800">
            <ArrowLeft />
          </button>
          <h3 className="text-xl font-bold text-gray-900">{formatYearMonthFor(lang, year, month)}</h3>
          <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-200 transition text-gray-800">
            <ChevronRight />
          </button>
        </div>
        {/* Doctor filter (optional) */}
        <div className="mb-3 flex items-center gap-2">
          <label className="text-sm text-gray-700">
            {lang === 'ja' ? '担当獣医' : 'Doctor'}
          </label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
          >
            <option value="">{lang === 'ja' ? 'すべて' : 'All'}</option>
            {Array.from(
              new Set(
                Object.values(appointments)
                  .flat()
                  .map((a) => (a as any).doctor)
                  .filter(Boolean) as string[]
              )
            ).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-900 border-b pb-2 text-[11px] md:text-base">
          {WEEKDAYS_FULL_I18N(lang).map((day) => (
            <div
              key={day}
              className={
                (day.trim() === "日" || day.toLowerCase().startsWith("sun"))
                  ? "text-red-500"
                  : (day.trim() === "土" || day.toLowerCase().startsWith("sat"))
                  ? "text-blue-500"
                  : ""
              }
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 md:gap-2 mt-2">
          {days.map((day, index) => {
            if (!day) return <div key={index} className="border-b border-gray-100" />;
            const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const appointmentsOnDay = (appointments[dateString] || []).filter((a: any) => !doctorFilter || a.doctor === doctorFilter);
            const sortedDay = appointmentsOnDay.slice().sort((a: any, b: any) => {
              const ma = toMinutes(a.time);
              const mb = toMinutes(b.time);
              if (ma !== mb) return ma - mb;
              return (a.animal_name || '').localeCompare(b.animal_name || '');
            });
            const limit = typeof maxPerDay === 'number' ? Math.max(0, maxPerDay) : sortedDay.length;
            const visible = sortedDay.slice(0, limit);
            const extra = Math.max(0, sortedDay.length - visible.length);
            return (
              <div
                key={index}
                className={`${compact ? 'h-24 md:h-28' : 'h-24 md:h-32'} border rounded-lg p-2 flex flex-col cursor-pointer transition-colors hover:bg-gray-100 bg-white`}
                onClick={() => onDateClick(dateString)}
              >
                <span className="font-bold text-gray-900">{day}</span>
                <div className="mt-1 text-[11px] md:text-xs space-y-1 overflow-y-auto">
                  {visible.map((app: any, appIndex: number) => (
                    <div key={appIndex} className="bg-purple-100 text-purple-800 p-1 rounded">
                      <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                        {(app.time ? `${app.time} ` : "") + (app.animal_name || "")}
                      </span>
                      {showFarm && app.farm_id && (
                        <span className="block text-[10px] text-gray-700 overflow-hidden text-ellipsis whitespace-nowrap">{app.farm_id}</span>
                      )}
                    </div>
                  ))}
                  {extra > 0 && (
                    <div className="text-[10px] text-gray-700">+{extra}</div>
                  )}
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
