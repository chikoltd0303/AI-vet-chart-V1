// lib/api.ts
// 🔄 ここを true にすればモックAPI（開発用）、false にすれば本番API（FastAPI）を使用
const USE_FAKE = false;

import { fakeApi } from "@/lib/fakeApi";
import { api as realApi } from "@/lib/realApi"; // 正しいインポート名を使用

// 両方のAPIが同じ構造を持っているので型アサーションは不要

export const api = USE_FAKE ? fakeApi : realApi;

// 個別の関数エクスポート（後方互換性のため）
export const searchAnimals = api.searchAnimals.bind(api);
export const fetchAnimalDetail = api.fetchAnimalDetail.bind(api);
export const createAnimal = api.createAnimal.bind(api);
export const createRecord = api.createRecord.bind(api);
export const updateRecord = api.updateRecord.bind(api);
export const transcribeAudio = api.transcribeAudio.bind(api);
export const generateSoapFromText = api.generateSoapFromText.bind(api);

// 追加のメソッドがある場合の安全なバインド
export const generateSoapFromAudio = api.generateSoapFromAudio?.bind(api);
export const generateSoapFromInput = api.generateSoapFromInput?.bind(api);
export const uploadImage = api.uploadImage?.bind(api);
export const uploadImages = api.uploadImages?.bind(api);