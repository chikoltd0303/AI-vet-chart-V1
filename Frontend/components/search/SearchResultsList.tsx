import React from "react";
import type { Animal } from "@/types";
import { ArrowLeft, ChevronRight, List, Loader2, PlusCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import Translatable from "@/components/shared/Translatable";

import { useRouter } from "next/navigation";

interface SearchResultsListProps {
  results: Animal[];
  onBack: () => void;
  isLoading: boolean;
  searchTerm: string;
}

const SearchResultsList: React.FC<SearchResultsListProps> = ({
  results,
  onBack,
  isLoading,
  searchTerm,
}) => {
  const { t, lang } = useI18n();
  const router = useRouter();
  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in" data-testid="results-view">
      <button onClick={onBack} className="flex items-center text-blue-600 hover:underline mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" /> {t('search_again')}
      </button>
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center" data-testid="results-count">
            <List className="mr-2" /> {lang === 'en' ? `Results: ${results.length}` : `検索結果: ${results.length} 件`}
          </h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center p-10">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        ) : results.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {results.map((animal) => (
              <li
                key={animal.microchip_number}
                onClick={() => router.push(`/animal/${animal.microchip_number}`)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors flex justify-between items-center"
                data-testid="result-item"
                data-id={animal.microchip_number}
              >
                <div>
                  <p className="font-bold text-lg text-blue-700"><Translatable text={animal.name} /></p>
                  <p className="text-sm text-gray-800"><Translatable text={animal.farm_id || ''} /></p>
                  <p className="text-xs text-gray-800 font-mono">{animal.microchip_number}</p>
                </div>
                <ChevronRight className="h-6 w-6 text-gray-400" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 text-center bg-gray-50">
            <p className="text-gray-800 mb-4">{lang === 'en' ? `No animals found for “${searchTerm}”.` : `「${searchTerm}」に一致する動物は見つかりませんでした。`}</p>
            <button
              onClick={() => router.push('/animal/new')}
              className="bg-blue-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center mx-auto"
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              {t('add_new')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsList;
