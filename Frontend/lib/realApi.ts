import type { 
  Animal, 
  Record, 
  AnimalDetailData, 
  UploadResponse, 
  TranscribeResponse,
  SoapGenerationResponse,
  RecordCreationResponse,
  SoapNotes,
  ApiError,
  SearchFilters,
  SearchResults,
  NewAnimalFormData,
  NewRecordFormData,
  Appointment,
  AppointmentFormData
} from "@/types";

// APIベースURL（未設定時はローカル想定）
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// カスタムエラークラス
export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
  // 翻訳 API
  async translateText(text: string, target_lang: string = 'en'): Promise<{ translated: string; target_lang: string; service: string | null; }> {
    const formData = new FormData();
    formData.append('text', text);
    formData.append('target_lang', target_lang);
    return this.request(`/api/translate`, { method: 'POST', body: formData });
  }
}

class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        let errorMessage = `API Error: ${response.status}`;
        let errorDetail = '';
        
        try {
          const errorData = await response.json() as ApiError;
          errorDetail = errorData.detail || await response.text();
        } catch {
          errorDetail = await response.text();
        }
        
        throw new ApiClientError(
          `${errorMessage} - ${errorDetail}`,
          response.status
        );
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      } else {
        return response.text() as unknown as T;
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      throw new ApiClientError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // 動物関連のAPI
  async searchAnimals(
    query: string = "", 
    filters?: SearchFilters
  ): Promise<Animal[]> {
    const params = new URLSearchParams();
    
    if (query) params.append("query", query);
    if (filters?.microchip_number) params.append("microchip_number", filters.microchip_number);
    if (filters?.farm_id) params.append("farm_id", filters.farm_id);
    if (filters?.breed) params.append("breed", filters.breed);
    if (filters?.sex) params.append("sex", filters.sex);
    if (filters?.date_from) params.append("date_from", filters.date_from);
    if (filters?.date_to) params.append("date_to", filters.date_to);
    
    const queryString = params.toString();
    const endpoint = `/api/animals${queryString ? `?${queryString}` : ""}`;
    
    return this.request<Animal[]>(endpoint);
  }

  async fetchAnimalDetail(animalId: string): Promise<AnimalDetailData> {
    return this.request<AnimalDetailData>(`/api/animals/${animalId}`);
  }

  async createAnimal(animalData: NewAnimalFormData): Promise<Animal> {
    const formData = new FormData();

    // Backend 要件に合わせたフィールド
    formData.append("microchip_number", animalData.microchip_number);
    formData.append("name", animalData.name);

    if (animalData.age !== undefined) {
      formData.append("age", animalData.age.toString());
    }
    if (animalData.sex) formData.append("sex", animalData.sex);
    if (animalData.breed) formData.append("breed", animalData.breed);
    if (animalData.farm_id) formData.append("farm_id", animalData.farm_id);
    if (animalData.owner) formData.append("owner", animalData.owner);

    // サムネイル画像は backend 側の file フィールドへ
    if (animalData.thumbnail) {
      formData.append("file", animalData.thumbnail);
    }

    return this.request<Animal>("/api/animals", {
      method: "POST",
      body: formData,
    });
  }

  async updateAnimal(animalId: string, animalData: Partial<NewAnimalFormData>): Promise<Animal> {
    const formData = new FormData();
    
    Object.entries(animalData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'thumbnail' && value instanceof File) {
          formData.append(key, value);
        } else if (key === 'age') {
          formData.append(key, value.toString());
        } else if (typeof value === 'string') {
          formData.append(key, value);
        }
      }
    });

    return this.request<Animal>(`/api/animals/${animalId}`, {
      method: "PUT",
      body: formData,
    });
  }

  // 画像アップロード
  async uploadImage(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    return this.request<UploadResponse>("/api/uploads/images", {
      method: "POST",
      body: formData,
    });
  }

  async uploadImages(files: File[]): Promise<UploadResponse[]> {
    const uploadPromises = files.map(file => this.uploadImage(file));
    return Promise.all(uploadPromises);
  }

  // 音声転写
  async transcribeAudio(audioFile: File): Promise<TranscribeResponse> {
    const formData = new FormData();
    formData.append("audio", audioFile);

    return this.request<TranscribeResponse>("/api/transcribe", {
      method: "POST",
      body: formData,
    });
  }

  // SOAP生成（音声から）
  async generateSoapFromAudio(
    audioFile: File, 
    transcribedText?: string
  ): Promise<SoapGenerationResponse> {
    const formData = new FormData();
    formData.append("audio", audioFile);
    
    if (transcribedText) {
      formData.append("transcribed_text", transcribedText);
    }

    return this.request<SoapGenerationResponse>("/api/generateSoap", {
      method: "POST",
      body: formData,
    });
  }

  // SOAP生成（テキストから）
  async generateSoapFromText(text: string): Promise<SoapGenerationResponse> {
    const formData = new FormData();
    formData.append("text", text);

    return this.request<SoapGenerationResponse>("/api/generateSoapFromText", {
      method: "POST",
      body: formData,
    });
  }

  // SOAP生成（複合入力から）
  async generateSoapFromInput(data: {
    audio?: File;
    images?: File[];
    transcript?: string;
    text?: string;
  }): Promise<SoapGenerationResponse> {
    const formData = new FormData();
    
    if (data.audio) {
      formData.append("audio", data.audio);
    }
    
    if (data.transcript) {
      formData.append("transcript", data.transcript);
    }
    
    if (data.text) {
      formData.append("text", data.text);
    }
    
    if (data.images) {
      data.images.forEach((file) => {
        formData.append("images", file);
      });
    }

    return this.request<SoapGenerationResponse>("/api/generateSoap", {
      method: "POST",
      body: formData,
    });
  }

  // 診療記録作成
  async createRecord(recordData: {
    animalId: string;
    soap: SoapNotes;
    images?: File[];
    audio?: File;
    autoTranscribe?: boolean;
    next_visit_date?: string;
    next_visit_time?: string;
    doctor?: string;
    medication_history?: string[];
  }): Promise<RecordCreationResponse> {
    const formData = new FormData();
    
    formData.append("animalId", recordData.animalId);
    formData.append("soap_json", JSON.stringify(recordData.soap));
    
    if (recordData.audio) {
      formData.append("audio", recordData.audio);
    }
    
    if (recordData.images && recordData.images.length > 0) {
      recordData.images.forEach((image) => {
        formData.append("images", image);
      });
    }
    
    if (recordData.autoTranscribe !== undefined) {
      formData.append("auto_transcribe", recordData.autoTranscribe.toString());
    }
    
    if (recordData.next_visit_date) {
      formData.append("next_visit_date", recordData.next_visit_date);
    }
    if (recordData.next_visit_time) {
      formData.append("next_visit_time", recordData.next_visit_time);
    }
    if (recordData.doctor) {
      formData.append("doctor", recordData.doctor);
    }
    
    if (recordData.medication_history) {
      formData.append("medication_history", JSON.stringify(recordData.medication_history));
    }

    // extensions: medications_json / nosai_points (optional)
    const anyData: any = recordData as any;
    if (anyData.medications_json) {
      formData.append("medications_json", anyData.medications_json);
    }
    if (anyData.nosai_points !== undefined && anyData.nosai_points !== null) {
      formData.append("nosai_points", String(anyData.nosai_points));
    }

    return this.request<RecordCreationResponse>("/api/records", {
      method: "POST",
      body: formData,
    });
  }

  // 診療記録更新
  async updateRecord(
    recordId: string, 
    updatedRecord: Partial<NewRecordFormData>
  ): Promise<Record> {
    const formData = new FormData();
    
    if (updatedRecord.soap) {
      formData.append("soap_json", JSON.stringify(updatedRecord.soap));
    }
    
    if (updatedRecord.images && updatedRecord.images.length > 0) {
      updatedRecord.images.forEach((image) => {
        formData.append("images", image);
      });
    }
    
    if (updatedRecord.audio) {
      formData.append("audio", updatedRecord.audio);
    }
    
    if (updatedRecord.next_visit_date) {
      formData.append("next_visit_date", updatedRecord.next_visit_date);
    }

    return this.request<Record>(`/api/records/${recordId}`, {
      method: "PUT",
      body: formData,
    });
  }

  // 診療記録削除
  async deleteRecord(recordId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/records/${recordId}`, {
      method: "DELETE",
    });
  }

  // 予定関連
  async getAppointments(date?: string): Promise<Appointment[]> {
    const params = date ? `?date=${encodeURIComponent(date)}` : "";
    return this.request<Appointment[]>(`/api/appointments${params}`);
  }

  async createAppointment(appointmentData: AppointmentFormData): Promise<Appointment> {
    return this.request<Appointment>("/api/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(appointmentData),
    });
  }

  async updateAppointment(appointmentId: string, appointmentData: Partial<AppointmentFormData>): Promise<Appointment> {
    return this.request<Appointment>(`/api/appointments/${appointmentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(appointmentData),
    });
  }

  async deleteAppointment(appointmentId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/appointments/${appointmentId}`, {
      method: "DELETE",
    });
  }

  // ヘルスチェック・デバッグ
  async healthCheck(): Promise<{ status: string; apis: string }> {
    return this.request<{ status: string; apis: string }>("/health");
  }

  async getDebugInfo(): Promise<any> {
    return this.request<any>("/api/debug/google-apis");
  }

  async getSupportedAudioFormats(): Promise<{ formats: string[] }> {
    return this.request<{ formats: string[] }>("/api/debug/audio-formats");
  }

  // 統計・レポート
  async getStatistics(timeRange?: string): Promise<any> {
    const params = timeRange ? `?range=${encodeURIComponent(timeRange)}` : "";
    return this.request<any>(`/api/statistics${params}`);
  }
}

// シングルトンインスタンス
export const api = new ApiClient();

// 後方互換性のための関数エクスポート
export const searchAnimals = (query: string) => api.searchAnimals(query);
export const fetchAnimalDetail = (animalId: string) => api.fetchAnimalDetail(animalId);
export const createAnimal = (animalData: NewAnimalFormData) => api.createAnimal(animalData);
export const createRecord = (recordData: { animalId: string; soap: SoapNotes }) => 
  api.createRecord(recordData);
export const updateRecord = (recordId: string, recordData: Partial<NewRecordFormData>) => 
  api.updateRecord(recordId, recordData);
export const generateSoapFromInput = (data: { audio?: File; images?: File[]; transcript?: string }) => 
  api.generateSoapFromInput(data);

// 名前付きエクスポート
export { api as realApi };
