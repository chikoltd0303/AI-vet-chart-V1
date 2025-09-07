// lib/api.ts
// 実API/フェイクAPIを環境変数で切り替える薄いラッパー
const USE_FAKE = (process.env.NEXT_PUBLIC_USE_FAKE || "false").toLowerCase() === "true";

import { fakeApi } from "@/lib/fakeApi";
import { api as realApi } from "@/lib/realApi";

export const api: any = USE_FAKE ? fakeApi : realApi;

// 後方互換のための関数エクスポート（単純委譲）
export const searchAnimals = (...args: any[]) => api.searchAnimals?.(...args);
export const fetchAnimalDetail = (...args: any[]) => api.fetchAnimalDetail?.(...args);
export const createAnimal = (...args: any[]) => api.createAnimal?.(...args);
export const createRecord = (...args: any[]) => api.createRecord?.(...args);
export const updateRecord = (...args: any[]) => api.updateRecord?.(...args);
export const transcribeAudio = (...args: any[]) => api.transcribeAudio?.(...args);
export const generateSoapFromText = (...args: any[]) => api.generateSoapFromText?.(...args);
export const generateSoapFromAudio = (...args: any[]) => api.generateSoapFromAudio?.(...args);
export const generateSoapFromInput = (...args: any[]) => api.generateSoapFromInput?.(...args);
export const uploadImage = (...args: any[]) => api.uploadImage?.(...args);
export const uploadImages = (...args: any[]) => api.uploadImages?.(...args);

