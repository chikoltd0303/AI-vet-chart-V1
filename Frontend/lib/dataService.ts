import { MOCK_DB } from "@/data/mockDB";
import type { Appointment } from "@/types";
import type { AppointmentWithAnimalInfo } from "@/types";
import { api } from "./api";

// 予約データを更新する関数（現在はモックデータを使用、将来的にAPI対応）
export const updateAppointments = async (): Promise<{ [key: string]: AppointmentWithAnimalInfo[] }> => {
  try {
    // 将来的にAPIが実装されたら以下を有効化
    // const appointmentsData = await api.getAppointments();
    // return appointmentsData;
    
    // 現在はモックデータから生成
    const allAppointments: { [key: string]: AppointmentWithAnimalInfo[] } = {};
    
    for (const microchipNumber in MOCK_DB.records) {
      const animal = MOCK_DB.animals[microchipNumber];
      const records = MOCK_DB.records[microchipNumber];
      
      if (!animal || !animal.farm_id) continue; // farm_idがundefinedの場合はスキップ
      
      records.forEach((record, index) => {
        if (record.next_visit_date && animal.farm_id) {
          const dateTime = new Date(record.next_visit_date);
          const date = record.next_visit_date.split("T")[0];
          const time = dateTime.toTimeString().slice(0, 5); // HH:MM形式
          
          if (!allAppointments[date]) {
            allAppointments[date] = [];
          }
          
          allAppointments[date].push({
            id: `${microchipNumber}-${index}`, // ユニークなIDを生成
            microchip_number: microchipNumber,
            animal_name: animal.name,
            farm_id: animal.farm_id,
            date: date,
            time: time,
            summary: record.soap.a,
            next_visit_date: record.next_visit_date,
          });
        }
      });
    }
    
    return allAppointments;
  } catch (error) {
    console.error("Failed to update appointments:", error);
    return {};
  }
};

// 農場リストを生成する関数（モックデータ + カスタム農場対応）
export const generateFarmList = (): string[] => {
  try {
    // モックデータから農場リストを生成
    const farms = new Set<string>();
    Object.values(MOCK_DB.animals).forEach((animal) => {
      if (animal.farm_id) {
        farms.add(animal.farm_id.trim());
      }
    });
    
    const mockFarms = Array.from(farms).sort((a, b) => a.localeCompare(b, "ja"));
    
    // LocalStorageから追加の農場を取得（あれば）
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

// 農場を追加する関数
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

// 予約を日付別にグループ化する関数
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

// 今日の予約を取得する関数
export const getTodayAppointments = (appointments: { [key: string]: Appointment[] }): Appointment[] => {
  const today = new Date().toISOString().split('T')[0];
  return appointments[today] || [];
};

// 特定の日の予約を取得する関数
export const getAppointmentsForDate = (
  appointments: { [key: string]: Appointment[] }, 
  date: string
): Appointment[] => {
  return appointments[date] || [];
};

// 予約数を取得する関数
export const getAppointmentCount = (
  appointments: { [key: string]: Appointment[] }, 
  date: string
): number => {
  return (appointments[date] || []).length;
};

// 週間予約を取得する関数（追加のユーティリティ）
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