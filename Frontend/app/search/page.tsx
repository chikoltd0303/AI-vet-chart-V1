"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Animal } from "@/types";
import { api } from "@/lib/api";
import { generateFarmList } from "@/lib/dataService";

import AnimalSearch from "@/components/search/AnimalSearch";
import SearchResultsList from "@/components/search/SearchResultsList";
import NewAnimalForm from "@/components/animal/NewAnimalForm";

type View = "search" | "results" | "newAnimal";

export default function SearchPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("search");
  const [searchResults, setSearchResults] = useState<Animal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [farmList, setFarmList] = useState<string[]>([]);

  useEffect(() => {
    setFarmList(generateFarmList());
  }, []);

  const handleSearch = async (term: string) => {
    setIsLoading(true);
    setError("");
    try {
      const results = await api.searchAnimals(term);
      setSearchTerm(term);
      setSearchResults(results);
      setView("results");
    } catch {
      setError("検索に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAnimal = (microchipNumber: string) => {
    if (!microchipNumber) return;
    router.push(`/animal/${encodeURIComponent(microchipNumber)}`);
  };

  const handleAddNewAnimal = () => setView("newAnimal");

  const handleSaveNewAnimal = async (animalData: Animal) => {
    setIsLoading(true);
    setError("");
    try {
      await api.createAnimal(animalData as any);
      router.push(`/animal/${encodeURIComponent(animalData.microchip_number)}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen font-sans">
      <div className="container mx-auto px-4 py-8">
        {error && view !== "newAnimal" && (
          <p className="text-red-500 text-center mb-4">{error}</p>
        )}
        {view === "search" && (
          <AnimalSearch
            onSearch={handleSearch}
            isLoading={isLoading}
            onShowCalendar={() => router.push("/calendar")}
            onShowNewAnimalForm={handleAddNewAnimal}
            farmList={farmList}
          />
        )}
        {view === "results" && (
          <SearchResultsList
            results={searchResults}
            onSelect={handleSelectAnimal}
            onBack={() => setView("search")}
            isLoading={isLoading}
            onAddNew={handleAddNewAnimal}
            searchTerm={searchTerm}
          />
        )}
        {view === "newAnimal" && (
          <NewAnimalForm
            onBack={() => setView("search")}
            onSave={handleSaveNewAnimal as any}
            searchTerm={searchTerm}
            isLoading={isLoading}
            error={error}
            setError={setError}
          />
        )}
      </div>
    </div>
  );
}

