"use client";

import React, { useState, useEffect } from "react";
import type { Animal } from "@/types";
import { api } from "@/lib/api";
import { generateFarmList } from "@/lib/dataService";

import AnimalSearch from "@/components/search/AnimalSearch";
import SearchResultsList from "@/components/search/SearchResultsList";
import { Loader2 } from "lucide-react";
import DoctorSelector from "@/components/shared/DoctorSelector";
import LanguageSelector from "@/components/shared/LanguageSelector";

export default function Page() {
  const [searchResults, setSearchResults] = useState<Animal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [farmList, setFarmList] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // SSR時は null にしてCSR後に設定 (Hydration mismatch防止)
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setFarmList(generateFarmList());
  }, []);

  const handleSearch = async (term: string) => {
    setIsLoading(true);
    setError("");
    try {
      const results = await api.searchAnimals(term);
      setSearchTerm(term);
      setSearchResults(results);
      setHasSearched(true);
    } catch {
      setError("検索に失敗しました。");
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchResults([]);
    setSearchTerm("");
    setHasSearched(false);
    setError("");
  };

  if (!isMounted) {
    return (
      <div className="bg-gray-100 min-h-screen font-sans">
        <div className="container mx-auto px-4 py-8 flex justify-center items-center h-96">
          <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen font-sans">
      <div className="container mx-auto px-4 py-4">
        <div className="mb-4 flex justify-end gap-4">
          <LanguageSelector />
          <DoctorSelector />
        </div>

        <div className="py-4">
          {error && (
            <p className="text-red-500 text-center mb-4">{error}</p>
          )}

          {!hasSearched ? (
            <AnimalSearch
              onSearch={handleSearch}
              isLoading={isLoading}
              farmList={farmList}
            />
          ) : (
            <SearchResultsList
              results={searchResults}
              onBack={clearSearch}
              isLoading={isLoading}
              searchTerm={searchTerm}
            />
          )}
        </div>
      </div>
    </div>
  );
}
