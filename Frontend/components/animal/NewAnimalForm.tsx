import React, { useState, useEffect } from "react";
import {
  PlusCircle,
  ArrowLeft,
  Database,
  Building,
  Bone,
  Loader2,
  Save,
} from "lucide-react";
import type { NewAnimalFormData } from "@/types";

interface NewAnimalFormProps {
  onBack: () => void;
  onSave: (animal: NewAnimalFormData) => Promise<void>;
  searchTerm: string;
  isLoading: boolean;
  error: string;
  setError: (message: string) => void;
}

const NewAnimalForm: React.FC<NewAnimalFormProps> = ({
  onBack,
  onSave,
  searchTerm,
  isLoading,
  error,
  setError,
}) => {
  const [animal, setAnimal] = useState<NewAnimalFormData>({
    microchip_number: "",
    farm_id: "",
    name: "",
  });

  useEffect(() => {
    // 検索語がマイクロチップ番号っぽい場合は初期値としてセット
    if (searchTerm && /^\d{10,}$/.test(searchTerm)) {
      setAnimal((prev) => ({
        ...prev,
        microchip_number: searchTerm,
        name: "",
        farm_id: "",
      }));
    } else if (searchTerm) {
      // それ以外の場合は患畜名や牧場名かもしれないので、対応するフィールドにセット
      setAnimal((prev) => ({
        ...prev,
        name: searchTerm,
        microchip_number: "",
        farm_id: "",
      }));
    }
  }, [searchTerm]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAnimal((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animal.microchip_number || !animal.farm_id || !animal.name) {
      setError("全ての必須項目を入力してください。");
      return;
    }
    setError("");
    await onSave(animal);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 md:p-6 animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center text-blue-600 hover:underline mb-4"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> 検索画面に戻る
      </button>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-4">
          <PlusCircle className="mr-2 text-blue-600" /> 新しい動物を登録
        </h2>
        {error && (
          <p className="text-red-500 mb-4 bg-red-100 p-3 rounded-md">{error}</p>
        )}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label
              htmlFor="microchip_number"
              className="font-semibold text-gray-800 flex items-center mb-1"
            >
              <Database className="mr-2 h-4 w-4" /> マイクロチップ番号{" "}
              <span className="text-red-500 ml-2">*</span>
            </label>
            <input
              id="microchip_number"
              name="microchip_number"
              type="text"
              value={animal.microchip_number}
              onChange={handleChange}
              placeholder="10桁以上の半角数字"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
              required
              data-testid="input-microchip"
            />
          </div>
          <div>
            <label
              htmlFor="farm_id"
              className="font-semibold text-gray-800 flex items-center mb-1"
            >
              <Building className="mr-2 h-4 w-4" /> 牧場名{" "}
              <span className="text-red-500 ml-2">*</span>
            </label>
            <input
              id="farm_id"
              name="farm_id"
              type="text"
              value={animal.farm_id}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
              required
              data-testid="input-farm"
            />
          </div>
          <div>
            <label
              htmlFor="name"
              className="font-semibold text-gray-800 flex items-center mb-1"
            >
              <Bone className="mr-2 h-4 w-4" /> 個体名{" "}
              <span className="text-red-500 ml-2">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={animal.name}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
              required
              data-testid="input-name"
            />
          </div>
          <div className="text-center pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 text-white px-8 py-3 rounded-full font-bold text-lg shadow-lg hover:bg-green-700 transition disabled:bg-green-300 flex items-center justify-center w-full mx-auto"
              data-testid="btn-save-animal"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" /> 登録中...{" "}
                </>
              ) : (
                <>
                  <Save className="mr-2" /> 登録してカルテ作成へ
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewAnimalForm;
