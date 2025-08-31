"use client";

import React, { useState, useEffect } from "react";
import type {
  Animal,
  AnimalDetailData,
  Appointment,
  ViewState,
  Record,
} from "@/types";
import { api } from "@/lib/api";
import { updateAppointments, generateFarmList } from "@/lib/dataService";

import AnimalSearch from "@/components/search/AnimalSearch";
import SearchResultsList from "@/components/search/SearchResultsList";
import NewAnimalForm from "@/components/animal/NewAnimalForm";
import AnimalDetail from "@/components/animal/AnimalDetail";
import VetCalendar from "@/components/calendar/VetCalendar";
import DailyAppointments from "@/components/calendar/DailyAppointments";
//import { AudioRecordingTest } from '@/components/shared/AudioRecordingTest'; // 追加
import { Loader2 } from "lucide-react";

export default function Page() {
  const [view, setView] = useState<ViewState>("search");
  const [searchResults, setSearchResults] = useState<Animal[]>([]);
  const [currentAnimalData, setCurrentAnimalData] =
    useState<AnimalDetailData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [appointments, setAppointments] = useState<{
    [key: string]: Appointment[];
  }>({});
  const [farmList, setFarmList] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // SSR時は null にしてCSR後に設定
  const [calendarDate, setCalendarDate] = useState<Date | null>(null);

  useEffect(() => {
    setCalendarDate(new Date());
    refreshAppData();
  }, []);

  const refreshAppData = async () => {
    setAppointments(await updateAppointments());
    setFarmList(generateFarmList());
  };

  const handleSearch = async (term: string) => {
    setIsLoading(true);
    setError("");
    try {
      const results = await api.searchAnimals(term);
      setSearchTerm(term);
      setSearchResults(results);
      setView("results");
    } catch {
      setError("検索に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAnimal = async (microchip_number: string) => {
  if (!microchip_number || microchip_number === "undefined") {
    console.error(
      "無効なID（undefined）でhandleSelectAnimalが呼ばれました。"
    );
    return;
  }

  setIsLoading(true);
  setError("");
  try {
    console.log("Fetching animal detail for:", microchip_number);
    const animalDataFromApi = await api.fetchAnimalDetail(microchip_number);
    
    // ★★★ デバッグ用ログ追加 ★★★
    //console.log("API Response:", animalDataFromApi);
    //console.log("API Response type:", typeof animalDataFromApi);
    //console.log("API Response structure:", JSON.stringify(animalDataFromApi, null, 2));

    if (animalDataFromApi) {
      // APIから返されるデータが既にAnimalDetailData型であると仮定し、そのままセット
      // ★★★ ここが修正箇所 ★★★
      setCurrentAnimalData(animalDataFromApi);
      console.log("Current animal data set:", animalDataFromApi);
      setView("detail");
    } else {
      console.error("API returned null or undefined data");
      setError("患畜の詳細情報の取得に失敗しました。");
      setView("search");
    }
  } catch (error) {
    console.error("API error:", error);
    setError("患畜の詳細情報の取得に失敗しました。");
    setView("search");
  } finally {
    setIsLoading(false);
  }
};

  const handleSaveRecord = async (
    microchip_number: string,
    recordData: Omit<Record, "id" | "visit_date">
  ) => {
    setIsLoading(true);
    setError("");
    try {
      await api.createRecord({
        animalId: microchip_number,
        soap: recordData.soap,
      });
      const data = await api.fetchAnimalDetail(microchip_number);
      if (data) setCurrentAnimalData(data);
      await refreshAppData();
    } catch {
      setError("記録の保存に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRecord = async (
    microchip_number: string,
    recordId: string,
    updatedRecordData: Record
  ) => {
    setIsLoading(true);
    setError("");
    try {
      await api.updateRecord(microchip_number, recordId, updatedRecordData);
      const data = await api.fetchAnimalDetail(microchip_number);
      if (data) setCurrentAnimalData(data);
      await refreshAppData();
    } catch {
      setError("記録の更新に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewAnimal = () => {
    setView("newAnimal");
  };

  const handleSaveNewAnimal = async (animalData: Animal) => {
    setIsLoading(true);
    setError("");
    try {
      await api.createAnimal(animalData);
      await refreshAppData();
      await handleSelectAnimal(animalData.microchip_number);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const backToSearch = () => {
    setView("search");
    setSearchResults([]);
    setCurrentAnimalData(null);
    setError("");
    setSearchTerm("");
  };

  const backToResults = () => {
    setView("results");
    setCurrentAnimalData(null);
  };

  const showCalendar = () => {
    setView("calendar");
  };

  const showDailyAppointments = (date: string) => {
    setSelectedDate(date);
    setView("dailyAppointments");
  };

  if (calendarDate === null) {
    return (
      <div className="bg-gray-100 min-h-screen font-sans">
        <div className="container mx-auto px-4 py-8 flex justify-center items-center h-96">
          <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (view) {
      case "search":
        return (
          <>
            {/* 既存のコンテンツ */}
            <AnimalSearch
              onSearch={handleSearch}
              isLoading={isLoading}
              onShowCalendar={showCalendar}
              onShowNewAnimalForm={handleAddNewAnimal}
              farmList={farmList}
            />
          </>
        );
      case "results":
        return (
          <SearchResultsList
            results={searchResults}
            onSelect={handleSelectAnimal}
            onBack={backToSearch}
            isLoading={isLoading}
            onAddNew={handleAddNewAnimal}
            searchTerm={searchTerm}
          />
        );
      case "newAnimal":
        return (
          <NewAnimalForm
            onBack={backToSearch}
            onSave={handleSaveNewAnimal}
            searchTerm={searchTerm}
            isLoading={isLoading}
            error={error}
            setError={setError}
          />
        );
      case "detail":
        return currentAnimalData ? (
          <AnimalDetail
            data={currentAnimalData}
            onBack={backToResults}
            onHome={backToSearch}
            onSaveRecord={handleSaveRecord}
            onUpdateRecord={handleUpdateRecord}
            appointments={appointments}
            onSelectAnimal={handleSelectAnimal}
          />
        ) : null;
      case "calendar":
        return (
          <VetCalendar
            onBack={() => {
              setView("search");
              setSelectedDate(null);
            }}
            onHome={backToSearch}
            appointments={appointments}
            onDateClick={showDailyAppointments}
            currentDate={calendarDate}
          />
        );
      case "dailyAppointments":
        return selectedDate ? (
          <DailyAppointments
            onBack={() => setView("calendar")}
            onHome={backToSearch}
            appointments={appointments[selectedDate] || []}
            selectedDate={selectedDate}
            onSelectAnimal={handleSelectAnimal}
          />
        ) : null;
      default:
        return (
          <>
              {/* 既存のコンテンツ */}
            <AnimalSearch
              onSearch={handleSearch}
              isLoading={isLoading}
              onShowCalendar={showCalendar}
              onShowNewAnimalForm={handleAddNewAnimal}
              farmList={farmList}
            />
          </>
        );
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen font-sans">
      <div className="container mx-auto px-4 py-8">
        {error && view !== "newAnimal" && (
          <p className="text-red-500 text-center mb-4">{error}</p>
        )}
        {renderContent()}
      </div>
    </div>
  );
}