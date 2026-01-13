import React, { useState } from "react";
import { Search, Stethoscope, Loader2, PlusCircle, NotebookTabs, Building } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import Translatable from "@/components/shared/Translatable";

import { useRouter } from "next/navigation";

interface AnimalSearchProps {
  onSearch: (searchTerm: string) => void;
  isLoading: boolean;
  farmList: string[];
}

const AnimalSearch: React.FC<AnimalSearchProps> = ({
  onSearch,
  isLoading,
  /* onShowCalendar, onShowNewAnimalForm props removed */
  farmList,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showFarmList, setShowFarmList] = useState<boolean>(false);
  const { t } = useI18n();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) onSearch(searchTerm.trim());
  };

  const handleFarmSelect = (farm: string) => {
    setSearchTerm(farm);
    onSearch(farm);
    setShowFarmList(false);
  };

  return (
    <div className="w-full max-w-md mx-auto" data-testid="search-view">
      <div className="text-center mb-8">
        <div className="inline-block bg-white p-4 rounded-full shadow-md">
          <Stethoscope className="h-16 w-16 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mt-4">{t('app_title')}</h1>
        <p className="text-gray-800 mt-2">{t('app_tagline')}</p>
      </div>
      <form onSubmit={handleSubmit} className="flex items-center bg-white p-2 rounded-full shadow-lg" data-testid="search-form">
        <Search className="h-6 w-6 text-gray-400 mx-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('search_placeholder')}
          className="w-full bg-transparent focus:outline-none text-lg text-gray-800"
          data-testid="search-input"
        />
        <button
          type="submit"
          disabled={isLoading || !searchTerm.trim()}
          className="bg-blue-600 text-white rounded-full px-6 py-3 font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center"
          data-testid="btn-search"
        >
          {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : t('search_button')}
        </button>
      </form>
      <div className="text-center mt-4 flex justify-center space-x-2">
        <p className="text-sm text-gray-800">
          {t('sample_terms_lead')}
          <button onClick={() => setSearchTerm(t('sample_term1'))} className="font-mono bg-gray-200 p-1 rounded text-gray-800">
            {t('sample_term1')}
          </button>
          ,
          <button onClick={() => setSearchTerm(t('sample_farm1'))} className="font-mono bg-gray-200 p-1 rounded text-gray-800">
            {t('sample_farm1')}
          </button>
        </p>
      </div>
      <div className="text-center mt-6 flex justify-center space-x-4">
        <button
          onClick={() => router.push('/calendar')}
          className="bg-purple-600 text-white rounded-full px-4 py-3 font-semibold shadow-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
          data-testid="btn-calendar"
        >
          <NotebookTabs className="h-5 w-5 mr-2" />
          {t('schedule_button')}
        </button>
        <button
          onClick={() => setShowFarmList(!showFarmList)}
          className="bg-green-600 text-white rounded-full px-4 py-3 font-semibold shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center"
          data-testid="btn-farm-list"
        >
          <Building className="h-5 w-5 mr-2" />
          {t('browse_farms_button')}
        </button>
      </div>
      <div className="text-center mt-6">
        <button
          onClick={() => router.push('/animal/new')}
          className="text-blue-600 font-bold hover:underline transition-colors flex items-center justify-center mx-auto"
          data-testid="btn-new-animal"
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          {t('new_animal_button')}
        </button>
      </div>
      {showFarmList && (
        <div className="mt-4 bg-white p-4 rounded-lg shadow-lg max-h-60 overflow-y-auto animate-fade-in">
          <h4 className="font-bold text-gray-800 mb-2">{t('farms_heading')}</h4>
          <ul className="grid grid-cols-2 gap-2">
            {farmList.map((farm) => (
              <li key={farm}>
                <button
                  onClick={() => handleFarmSelect(farm)}
                  className="w-full text-left p-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors text-gray-800 font-medium"
                >
                  <Translatable text={farm} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AnimalSearch;
