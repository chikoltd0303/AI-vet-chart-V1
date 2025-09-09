import { MOCK_DB } from "@/data/mockDB";
import type { Appointment } from "@/types";
import type { AppointmentWithAnimalInfo } from "@/types";
import { api } from "./api";

// 莠育ｴ・ョ繝ｼ繧ｿ繧呈峩譁ｰ縺吶ｋ髢｢謨ｰ・育樟蝨ｨ縺ｯ繝｢繝・け繝・・繧ｿ繧剃ｽｿ逕ｨ縲∝ｰ・擂逧・↓API蟇ｾ蠢懶ｼ・
export const updateAppointments = async (): Promise<{ [key: string]: AppointmentWithAnimalInfo[] }> => {
  try {
    const appointmentsData = await api.getAppointments();
    // 正規化: Backendの date に時刻が含まれる/ time にURLが入る等の揺らぎを吸収
    const normalized = (appointmentsData as any[]).map((a: any) => {
      const rawDate = String(a.date || "");
      const timeCandidate = (a.time ?? "").toString();

      // date 部分抽出: 'YYYY-MM-DDTHH:MM' or 'YYYY-MM-DD HH:MM' → 'YYYY-MM-DD'
      const tIndex = rawDate.indexOf("T");
      const sIndex = rawDate.indexOf(" ");
      const delim = tIndex >= 0 ? tIndex : sIndex;
      const datePart = delim > 0 ? rawDate.slice(0, delim) : rawDate;

      // time 部分抽出: date 由来 or time フィールドが時刻なら優先
      let timePart = "";
      const fromDate = delim > 0 ? rawDate.slice(delim + 1).slice(0, 5) : "";
      if (/^\d{1,2}:\d{2}$/.test(fromDate)) {
        timePart = fromDate;
      }
      if (!timePart && /^\d{1,2}:\d{2}$/.test(timeCandidate)) {
        timePart = timeCandidate;
      }
      // URLやパスが time に入っている場合は破棄
      if (/^https?:\/\//.test(timeCandidate) || timeCandidate.startsWith("/uploads/")) {
        // keep timePart as-is (possibly empty)
      }

      return { ...a, date: datePart, time: timePart } as AppointmentWithAnimalInfo;
    });

    const grouped: { [key: string]: AppointmentWithAnimalInfo[] } = {} as any;
    normalized.forEach((a: any) => {
      const date = a.date;
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(a);
    });
    // APIが空配列なら、モックDBから補完
    if (Object.keys(grouped).length === 0) {
      const fallback: { [key: string]: AppointmentWithAnimalInfo[] } = {} as any;
      for (const microchipNumber in MOCK_DB.records) {
        const animal = MOCK_DB.animals[microchipNumber];
        const records = MOCK_DB.records[microchipNumber];
        if (!animal) continue; // farm_id は任意
        records.forEach((record, index) => {
          if (record.next_visit_date) {
            const dateStr = record.next_visit_date as string;
            const date = dateStr.split("T")[0];
            const time = dateStr.includes("T") ? dateStr.split("T")[1].slice(0, 5) : "";
            if (!fallback[date]) { fallback[date] = []; }
            fallback[date].push({
              id: `${microchipNumber}-${index}`,
              microchip_number: microchipNumber,
              animal_name: animal.name,
              farm_id: animal.farm_id,
              date,
              time,
              summary: record.soap.a,
              next_visit_date: record.next_visit_date,
            } as any);
          }
        });
      }
      return fallback;
    }
    return grouped;
  } catch (error) {
    console.error("Failed to fetch appointments from API:", error);
    // Fallback to mock DB
    const allAppointments: { [key: string]: AppointmentWithAnimalInfo[] } = {};
    for (const microchipNumber in MOCK_DB.records) {
      const animal = MOCK_DB.animals[microchipNumber];
      const records = MOCK_DB.records[microchipNumber];
      if (!animal) continue; // farm_id は任意
      records.forEach((record, index) => {
        if (record.next_visit_date) {
          const dateStr = record.next_visit_date as string;
          const date = dateStr.split("T")[0];
          const time = dateStr.includes("T") ? dateStr.split("T")[1].slice(0, 5) : "";
          if (!allAppointments[date]) { allAppointments[date] = []; }
          allAppointments[date].push({
            id: `${microchipNumber}-${index}`,
            microchip_number: microchipNumber,
            animal_name: animal.name,
            farm_id: animal.farm_id,
            date,
            time,
            summary: record.soap.a,
            next_visit_date: record.next_visit_date,
          } as any);
        }
      });
    }
    return allAppointments;
  }
};

// 霎ｲ蝣ｴ繝ｪ繧ｹ繝医ｒ逕滓・縺吶ｋ髢｢謨ｰ・医Δ繝・け繝・・繧ｿ + 繧ｫ繧ｹ繧ｿ繝霎ｲ蝣ｴ蟇ｾ蠢懶ｼ・
export const generateFarmList = (): string[] => {
  try {
    // 繝｢繝・け繝・・繧ｿ縺九ｉ霎ｲ蝣ｴ繝ｪ繧ｹ繝医ｒ逕滓・
    const farms = new Set<string>();
    Object.values(MOCK_DB.animals).forEach((animal) => {
      if (animal.farm_id) {
        farms.add(animal.farm_id.trim());
      }
    });
    
    const mockFarms = Array.from(farms).sort((a, b) => a.localeCompare(b, "ja"));
    
    // LocalStorage縺九ｉ霑ｽ蜉縺ｮ霎ｲ蝣ｴ繧貞叙蠕暦ｼ医≠繧後・・・
    const storedFarms = localStorage.getItem("customFarms");
    if (storedFarms) {
      const customFarms = JSON.parse(storedFarms) as string[];
      const uniqueCustomFarms = customFarms.filter(farm => !mockFarms.includes(farm));
      return [...mockFarms, ...uniqueCustomFarms].sort((a, b) => a.localeCompare(b, "ja"));
    }
    
    return mockFarms;
  } catch (error) {
    console.error("Failed to generate farm list:", error);
    return [];
  }
};

// 霎ｲ蝣ｴ繧定ｿｽ蜉縺吶ｋ髢｢謨ｰ
export const addFarm = (farmName: string): void => {
  try {
    const storedFarms = localStorage.getItem("customFarms");
    let customFarms: string[] = [];
    
    if (storedFarms) {
      customFarms = JSON.parse(storedFarms);
    }
    
    if (!customFarms.includes(farmName)) {
      customFarms.push(farmName);
      localStorage.setItem("customFarms", JSON.stringify(customFarms));
    }
  } catch (error) {
    console.error("Failed to add farm:", error);
  }
};

// 莠育ｴ・ｒ譌･莉伜挨縺ｫ繧ｰ繝ｫ繝ｼ繝怜喧縺吶ｋ髢｢謨ｰ
export const groupAppointmentsByDate = (appointments: Appointment[]): { [key: string]: Appointment[] } => {
  return appointments.reduce((groups, appointment) => {
    const date = appointment.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(appointment);
    return groups;
  }, {} as { [key: string]: Appointment[] });
};

// 莉頑律縺ｮ莠育ｴ・ｒ蜿門ｾ励☆繧矩未謨ｰ
export const getTodayAppointments = (appointments: { [key: string]: Appointment[] }): Appointment[] => {
  const today = new Date().toISOString().split('T')[0];
  return appointments[today] || [];
};

// 迚ｹ螳壹・譌･縺ｮ莠育ｴ・ｒ蜿門ｾ励☆繧矩未謨ｰ
export const getAppointmentsForDate = (
  appointments: { [key: string]: Appointment[] }, 
  date: string
): Appointment[] => {
  return appointments[date] || [];
};

// 莠育ｴ・焚繧貞叙蠕励☆繧矩未謨ｰ
export const getAppointmentCount = (
  appointments: { [key: string]: Appointment[] }, 
  date: string
): number => {
  return (appointments[date] || []).length;
};

// 騾ｱ髢謎ｺ育ｴ・ｒ蜿門ｾ励☆繧矩未謨ｰ・郁ｿｽ蜉縺ｮ繝ｦ繝ｼ繝・ぅ繝ｪ繝・ぅ・・
export const getWeeklyAppointments = (
  appointments: { [key: string]: Appointment[] },
  startDate: Date
): { [key: string]: Appointment[] } => {
  const weeklyAppointments: { [key: string]: Appointment[] } = {};
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateString = date.toISOString().split('T')[0];
    
    if (appointments[dateString]) {
      weeklyAppointments[dateString] = appointments[dateString];
    }
  }
  
  return weeklyAppointments;
};
