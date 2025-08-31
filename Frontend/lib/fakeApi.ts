// fakeApi.ts - 完全なモックAPIの実装
import type { 
  Animal, 
  Record, 
  AnimalDetailData, 
  UploadResponse, 
  TranscribeResponse,
  SoapGenerationResponse,
  RecordCreationResponse,
  SoapNotes,
  SearchFilters,
  NewAnimalFormData,
  NewRecordFormData,
  Appointment,
  AppointmentFormData
} from "@/types";

// モックデータ
const mockAnimals: Animal[] = [
  {
    id: "1",
    name: "太郎",
    age: 3,
    sex: "male",
    breed: "ホルスタイン",
    farm_id: "FARM001",
    owner: "田中農場",
    microchip_number: "123456789",
  },
  {
    id: "2",
    name: "花子",
    age: 2,
    sex: "female",
    breed: "黒毛和牛",
    farm_id: "FARM002",
    owner: "鈴木牧場",
    microchip_number: "987654321",
  }
];

export class FakeApiClient {
  // 動物関連のAPI
  async searchAnimals(query: string = "", filters?: SearchFilters): Promise<Animal[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let results = mockAnimals;
    
    if (query) {
      results = results.filter(animal => 
        animal.name.includes(query) || 
        animal.breed.includes(query) ||
        animal.owner.includes(query)
      );
    }
    
    if (filters?.sex) {
      results = results.filter(animal => animal.sex === filters.sex);
    }
    
    if (filters?.breed) {
      results = results.filter(animal => animal.breed === filters.breed);
    }
    
    return results;
  }

  async fetchAnimalDetail(animalId: string): Promise<AnimalDetailData> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const animal = mockAnimals.find(a => a.id === animalId);
    if (!animal) {
      throw new Error("Animal not found");
    }
    
    return {
      ...animal,
      records: [
        {
          id: "rec1",
          animal_id: animalId,
          date: "2024-01-15T10:00:00Z",
          soap: {
            subjective: "食欲不振、元気なし",
            objective: "体温39.2℃、心拍数80bpm",
            assessment: "軽度の発熱、ストレス性胃腸炎の疑い",
            plan: "抗生剤投与、経過観察"
          },
          images: [],
          audio_url: null,
          transcription: null,
          created_at: "2024-01-15T10:00:00Z",
          updated_at: "2024-01-15T10:00:00Z"
        }
      ]
    };
  }

  async createAnimal(animalData: NewAnimalFormData): Promise<Animal> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newAnimal: Animal = {
      id: Date.now().toString(),
      name: animalData.name,
      age: animalData.age || 0,
      sex: animalData.sex || "",
      breed: animalData.breed || "",
      farm_id: animalData.farm_id || "",
      owner: animalData.owner || "",
      microchip_number: `MOCK${Date.now()}`,
      thumbnail: animalData.thumbnail ? URL.createObjectURL(animalData.thumbnail) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    mockAnimals.push(newAnimal);
    return newAnimal;
  }

  async updateAnimal(animalId: string, animalData: Partial<NewAnimalFormData>): Promise<Animal> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const animalIndex = mockAnimals.findIndex(a => a.id === animalId);
    if (animalIndex === -1) {
      throw new Error("Animal not found");
    }
    
    mockAnimals[animalIndex] = {
      ...mockAnimals[animalIndex],
      ...animalData,
      updated_at: new Date().toISOString()
    };
    
    return mockAnimals[animalIndex];
  }

  // 画像アップロード
  async uploadImage(file: File): Promise<UploadResponse> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      url: `https://example.com/mock-image-${Date.now()}.jpg`,
      filename: file.name
    };
  }

  async uploadImages(files: File[]): Promise<UploadResponse[]> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return files.map((file, index) => ({
      url: `https://example.com/mock-image-${Date.now()}-${index}.jpg`,
      filename: file.name
    }));
  }

  // 音声転写
  async transcribeAudio(audioFile: File): Promise<TranscribeResponse> {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      transcription: "これはモックの音声認識結果です。実際の音声ファイルの内容が表示されます。"
    };
  }

  // SOAP生成（テキストから）
  async generateSoapFromText(text: string): Promise<SoapGenerationResponse> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      subjective: `患者は「${text.substring(0, 50)}...」と述べています。`,
      objective: "体温38.5℃、脈拍90bpm、血圧120/80mmHg。触診で軽度の圧痛を確認。",
      assessment: "症状から軽度の炎症反応が疑われます。バイタルサインは安定しています。",
      plan: "抗炎症薬の投与を開始し、3日後に再診予定。症状が悪化した場合は早期受診を指示。"
    };
  }

  // SOAP生成（音声から）
  async generateSoapFromAudio(audioFile: File, transcribedText?: string): Promise<SoapGenerationResponse> {
    await new Promise(resolve => setTimeout(resolve, 3000));
    const baseText = transcribedText || "音声から認識されたテキスト";
    return {
      subjective: `音声記録から：${baseText.substring(0, 50)}...`,
      objective: "身体検査：正常範囲内。特異的な所見なし。",
      assessment: "音声記録に基づく総合的な評価を実施。",
      plan: "継続的な観察と必要に応じた追加検査を計画。"
    };
  }

  // SOAP生成（複合入力から）
  async generateSoapFromInput(data: {
    audio?: File;
    images?: File[];
    transcript?: string;
    text?: string;
  }): Promise<SoapGenerationResponse> {
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const inputSources = [];
    if (data.audio) inputSources.push("音声");
    if (data.images?.length) inputSources.push(`画像${data.images.length}枚`);
    if (data.transcript) inputSources.push("音声認識テキスト");
    if (data.text) inputSources.push("手入力テキスト");
    
    return {
      subjective: `複合入力（${inputSources.join("、")}）から得られた主観的情報。`,
      objective: "複数のデータソースを統合した客観的所見。画像解析と音声解析の結果を含む。",
      assessment: "総合的なデータ解析に基づく医学的評価。AIアシスタントによる統合分析。",
      plan: "複合データに基づく治療計画。継続的なモニタリングと段階的なアプローチ。"
    };
  }

  // 診療記録作成
  async createRecord(recordData: {
    animalId: string;
    soap: SoapNotes;
    images?: File[];
    audio?: File;
    autoTranscribe?: boolean;
    next_visit_date?: string;
    medication_history?: string[];
  }): Promise<RecordCreationResponse> {
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const newRecord = {
      id: `rec_${Date.now()}`,
      animal_id: recordData.animalId,
      date: new Date().toISOString(),
      soap: recordData.soap,
      images: recordData.images?.map((_, index) => `https://example.com/image${index}.jpg`) || [],
      audio_url: recordData.audio ? `https://example.com/audio${Date.now()}.wav` : null,
      transcription: recordData.autoTranscribe ? "モック音声認識結果" : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return {
      record: newRecord,
      message: "診療記録が正常に作成されました"
    };
  }

  // 診療記録更新
  async updateRecord(recordId: string, recordData: Partial<NewRecordFormData>): Promise<Record> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      id: recordId,
      animal_id: "mock_animal_id",
      date: new Date().toISOString(),
      soap: recordData.soap || {
        subjective: "更新されたS",
        objective: "更新されたO", 
        assessment: "更新されたA",
        plan: "更新されたP"
      },
      images: [],
      audio_url: null,
      transcription: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: new Date().toISOString()
    };
  }

  // 診療記録削除
  async deleteRecord(recordId: string): Promise<{ success: boolean }> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return { success: true };
  }

  // 予定関連
  async getAppointments(date?: string): Promise<Appointment[]> {
    await new Promise(resolve => setTimeout(resolve, 600));
    return [
      {
        id: "appt1",
        animal_id: "1",
        date: date || new Date().toISOString(),
        time: "10:00",
        type: "定期検診",
        notes: "モック予定",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  async createAppointment(appointmentData: AppointmentFormData): Promise<Appointment> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      id: `appt_${Date.now()}`,
      ...appointmentData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  async updateAppointment(appointmentId: string, appointmentData: Partial<AppointmentFormData>): Promise<Appointment> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      id: appointmentId,
      animal_id: appointmentData.animal_id || "mock_id",
      date: appointmentData.date || new Date().toISOString(),
      time: appointmentData.time || "10:00",
      type: appointmentData.type || "検診",
      notes: appointmentData.notes || "",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: new Date().toISOString()
    };
  }

  async deleteAppointment(appointmentId: string): Promise<{ success: boolean }> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true };
  }

  // ヘルスチェック・デバッグ
  async healthCheck(): Promise<{ status: string; apis: string }> {
    return { status: "OK (Mock)", apis: "Mock API Active" };
  }

  async getDebugInfo(): Promise<any> {
    return { mode: "mock", timestamp: new Date().toISOString() };
  }

  async getSupportedAudioFormats(): Promise<{ formats: string[] }> {
    return { formats: ["wav", "mp3", "m4a", "webm"] };
  }

  // 統計・レポート
  async getStatistics(timeRange?: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      totalAnimals: mockAnimals.length,
      totalRecords: 5,
      timeRange: timeRange || "all",
      mock: true
    };
  }
}

// シングルトンインスタンス
export const fakeApi = new FakeApiClient();