// lib/api.ts
// モチE��API使用可否は環墁E��数で制御
const USE_FAKE = (process.env.NEXT_PUBLIC_USE_FAKE || "false").toLowerCase() === "true";

import { fakeApi } from "@/lib/fakeApi";
import { api as realApi } from "@/lib/realApi";

const baseApi = USE_FAKE ? fakeApi : realApi;

// 互換レイヤー: クラスインスタンスのプロトタイプメソチE��を壊さなぁE��ぁE��E// インスタンスに直接メソチE��を上書きして引数互換を提供すめEconst instance: any = baseApi;
const originalUpdateRecord = instance.updateRecord?.bind(instance);
instance.updateRecord = (...args: any[]) => {
  if (args.length === 3 && typeof args[0] === 'string' && typeof args[1] === 'string') {
    const [, recordId, data] = args;
    return originalUpdateRecord ? originalUpdateRecord(recordId, data) : (baseApi as any).updateRecord(recordId, data);
  }
  return originalUpdateRecord ? originalUpdateRecord(...args) : (baseApi as any).updateRecord(...args);
};

export const api: any = instance;

// ����݊��̂��߂̊֐��G�N�X�|�[�g�iimport����bind��]�����Ȃ��j
export const searchAnimals = (...args: any[]) => api.searchAnimals?.(...args);
export const fetchAnimalDetail = (...args: any[]) => api.fetchAnimalDetail?.(...args);
export const createAnimal = (...args: any[]) => api.createAnimal?.(...args);
export const createRecord = (...args: any[]) => api.createRecord?.(...args);
export const updateRecord = (...args: any[]) => api.updateRecord?.(...args);
export const transcribeAudio = (...args: any[]) => api.transcribeAudio?.(...args);
export const generateSoapFromText = (...args: any[]) => api.generateSoapFromText?.(...args);

// �ǉ����\�b�h�i���݂���ꍇ�̂݌Ăяo���j
export const generateSoapFromAudio = (...args: any[]) => api.generateSoapFromAudio?.(...args);
export const generateSoapFromInput = (...args: any[]) => api.generateSoapFromInput?.(...args);
export const uploadImage = (...args: any[]) => api.uploadImage?.(...args);
export const uploadImages = (...args: any[]) => api.uploadImages?.(...args);
