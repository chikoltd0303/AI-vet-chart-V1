import React, { useState } from "react";
import {
  Search,
  Stethoscope,
  Loader2,
  PlusCircle,
  NotebookTabs,
  Building,
} from "lucide-react";

interface AnimalSearchProps {
  onSearch: (searchTerm: string) => void;
  isLoading: boolean;
  onShowCalendar: () => void;
  onShowNewAnimalForm: () => void;
  farmList: string[];
}

const AnimalSearch: React.FC<AnimalSearchProps> = ({
  onSearch,
  isLoading,
  onShowCalendar,
  onShowNewAnimalForm,
  farmList,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showFarmList, setShowFarmList] = useState<boolean>(false);

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
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-block bg-white p-4 rounded-full shadow-md">
          <Stethoscope className="h-16 w-16 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mt-4">AI Vet Chart</h1>
        <p className="text-gray-800 mt-2">
          大動物臨床向けAIカルテシステム (MVP)
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex items-center bg-white p-2 rounded-full shadow-lg"
      >
        <Search className="h-6 w-6 text-gray-400 mx-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="チップナンバー、患畜名、牧場名..."
          className="w-full bg-transparent focus:outline-none text-lg text-gray-800"
        />
        <button
          type="submit"
          disabled={isLoading || !searchTerm.trim()}
          className="bg-blue-600 text-white rounded-full px-6 py-3 font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center"
        >
          {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "検索"}
        </button>
      </form>
      <div className="text-center mt-4 flex justify-center space-x-2">
        <p className="text-sm text-gray-800">
          検索例:
          <button
            onClick={() => setSearchTerm("はなこ")}
            className="font-mono bg-gray-200 p-1 rounded text-gray-800"
          >
            はなこ
          </button>
          ,
          <button
            onClick={() => setSearchTerm("佐藤牧場")}
            className="font-mono bg-gray-200 p-1 rounded text-gray-800"
          >
            佐藤牧場
          </button>
        </p>
      </div>
      <div className="text-center mt-6 flex justify-center space-x-4">
        <button
          onClick={onShowCalendar}
          className="bg-purple-600 text-white rounded-full px-4 py-3 font-semibold shadow-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
        >
          <NotebookTabs className="h-5 w-5 mr-2" />
          スケジュール
        </button>
        <button
          onClick={() => setShowFarmList(!showFarmList)}
          className="bg-green-600 text-white rounded-full px-4 py-3 font-semibold shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center"
        >
          <Building className="h-5 w-5 mr-2" />
          牧場一覧から探す
        </button>
      </div>
      <div className="text-center mt-6">
        <button
          onClick={onShowNewAnimalForm}
          className="text-blue-600 font-bold hover:underline transition-colors flex items-center justify-center mx-auto"
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          新規登録はこちら
        </button>
      </div>
      {showFarmList && (
        <div className="mt-4 bg-white p-4 rounded-lg shadow-lg max-h-60 overflow-y-auto animate-fade-in">
          <h4 className="font-bold text-gray-800 mb-2">牧場一覧（五十音順）</h4>
          <ul className="grid grid-cols-2 gap-2">
            {farmList.map((farm) => (
              <li key={farm}>
                <button
                  onClick={() => handleFarmSelect(farm)}
                  className="w-full text-left p-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors text-gray-800 font-medium"
                >
                  {farm}
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
