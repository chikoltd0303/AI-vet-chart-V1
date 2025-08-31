// lib/api.ts
// モックAPI使用可否は環境変数で制御
const USE_FAKE = (process.env.NEXT_PUBLIC_USE_FAKE || "false").toLowerCase() === "true";

import { fakeApi } from "@/lib/fakeApi";
import { api as realApi } from "@/lib/realApi";

const baseApi = USE_FAKE ? fakeApi : realApi;

// 互換レイヤー: updateRecord の引数差異を吸収（(recordId, data) も (animalId, recordId, data) も許容）
export const api: any = {
  ...baseApi,
  updateRecord: (...args: any[]) => {
    if (args.length === 3 && typeof args[0] === 'string' && typeof args[1] === 'string') {
      const [, recordId, data] = args;
      return (baseApi as any).updateRecord(recordId, data);
    }
    return (baseApi as any).updateRecord(...args);
  },
};

// 後方互換のための関数エクスポート
export const searchAnimals = api.searchAnimals.bind(api);
export const fetchAnimalDetail = api.fetchAnimalDetail.bind(api);
export const createAnimal = api.createAnimal.bind(api);
export const createRecord = api.createRecord.bind(api);
export const updateRecord = api.updateRecord.bind(api);
export const transcribeAudio = api.transcribeAudio.bind(api);
export const generateSoapFromText = api.generateSoapFromText.bind(api);

// 追加メソッド（存在する場合のみ）
export const generateSoapFromAudio = api.generateSoapFromAudio?.bind(api);
export const generateSoapFromInput = api.generateSoapFromInput?.bind(api);
export const uploadImage = api.uploadImage?.bind(api);
export const uploadImages = api.uploadImages?.bind(api);
