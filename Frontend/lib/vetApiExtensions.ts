// lib/vetApiExtensions.ts
// 既存のAPIクライアントを拡張する追加機能
import { api } from '@/lib/api';
import type { 
  TranscribeResponse, 
  SoapGenerationResponse,
  SoapNotes,
  RecordCreationResponse
} from '@/types'; // メインの型定義から全てインポート

/**
 * 既存のAPIクライアントを拡張したカスタムフック用API
 * 既存のapi.tsの機能をそのまま活用し、必要な部分のみ追加
 */
class VetApiExtensions {
  
  /**
   * カスタムフック用: 音声ファイル転写 (既存APIのラッパー)
   */
  async transcribeForHook(file: File): Promise<TranscribeResponse> {
    try {
      const result = await api.transcribeAudio(file);
      
      // realApiの戻り値の型に合わせて安全にアクセス
      let transcriptionText = '';
      if (result && typeof result === 'object') {
        // 様々なプロパティ名に対応
        transcriptionText = (result as any).transcription || 
                          (result as any).transcribed_text || 
                          (result as any).text || '';
      }
      
      // メインのTranscribeResponse型に合わせる
      return {
        transcription: transcriptionText,
        transcribed_text: transcriptionText,
        filename: file.name,
        file_size: file.size,
        status: 'success',
        service: 'google_speech_to_text'
      };
    } catch (error) {
      // エラー時の形式
      return {
        transcription: '',
        transcribed_text: '',
        filename: file.name,
        file_size: file.size,
        status: 'error',
        service: 'google_speech_to_text'
      };
    }
  }

  /**
   * カスタムフック用: SOAP生成 (既存APIのラッパー)
   */
  async generateSoapForHook(transcribedText: string): Promise<SoapGenerationResponse> {
    try {
      const result = await api.generateSoapFromText(transcribedText);
      
      // realApiの戻り値の型に合わせて安全にアクセス
      let soapData;
      if (result && typeof result === 'object') {
        // result.soap_notes が存在する場合（想定される構造）
        if ('soap_notes' in result && result.soap_notes) {
          soapData = result.soap_notes;
        }
        // result に直接 subjective, objective などが含まれる場合
        else if ('subjective' in result) {
          soapData = {
            s: (result as any).subjective || '',
            o: (result as any).objective || '',
            a: (result as any).assessment || '',
            p: (result as any).plan || ''
          };
        }
        // result に s, o, a, p が含まれる場合
        else {
          soapData = {
            s: (result as any).s || '',
            o: (result as any).o || '',
            a: (result as any).a || '',
            p: (result as any).p || ''
          };
        }
      } else {
        // 予期しない形式の場合はデフォルト値
        soapData = { s: '', o: '', a: '', p: '' };
      }
      
      // メインのSoapGenerationResponse型に合わせる
      return {
        soap_notes: soapData,
        original_text: transcribedText,
        source: 'text',
        status: 'success',
        service: 'google_gemini'
      };
    } catch (error) {
      // エラー時の形式
      return {
        soap_notes: {
          s: '',
          o: '',
          a: '',
          p: ''
        },
        original_text: transcribedText,
        source: 'text',
        status: 'error',
        service: 'google_gemini'
      };
    }
  }

  /**
   * カスタムフック用: 音声付き記録保存
   */
  async saveRecordWithAudio(data: {
    animalId: string;
    soap: {
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
    };
    images?: File[];
    audioFile?: File;
  }): Promise<RecordCreationResponse> {
    try {
      // SoapNotes型の実際の構造（s, o, a, p）に合わせる
      const soapNotes: SoapNotes = {
        s: data.soap.subjective,
        o: data.soap.objective,
        a: data.soap.assessment,
        p: data.soap.plan
      };

      return await api.createRecord({
        animalId: data.animalId,
        soap: soapNotes,
        images: data.images,
        audio: data.audioFile
      });
    } catch (error) {
      throw new Error(`記録保存に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 既存APIへの直接アクセス (後方互換性)
   */
  get originalApi() {
    return api;
  }
}

// シングルトンインスタンス
export const vetApiExtensions = new VetApiExtensions();

// 便利関数: 既存APIと拡張APIの統合インターフェース
export const vetApi = {
  // 既存API機能をそのまま利用
  searchAnimals: api.searchAnimals.bind(api),
  getAnimalDetail: api.fetchAnimalDetail.bind(api),
  createAnimal: api.createAnimal.bind(api),
  updateRecord: api.updateRecord.bind(api),
  
  // カスタムフック用の拡張機能
  transcribeAudio: vetApiExtensions.transcribeForHook.bind(vetApiExtensions),
  generateSoap: vetApiExtensions.generateSoapForHook.bind(vetApiExtensions),
  saveRecord: vetApiExtensions.saveRecordWithAudio.bind(vetApiExtensions),
  
  // 既存APIへの直接アクセス
  original: api
};