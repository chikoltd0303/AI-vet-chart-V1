/**
 * このアプリケーションで使用される主要なデータモデルと型定義です。
 * フロントエンドとバックエンドの実装に基づいて更新されています。
 */

// --- 基本的なデータモデル ---

/**
 * SOAP形式の診療ノート。
 * フロントエンドのフォームとバックエンドのモデルで共通して使用されます。
 */
export interface SoapNotes {
  s: string;
  o: string;
  a: string;
  p: string;
}

/**
 * 個々の診療記録。
 * バックエンドのDBスキーマとAPIレスポンスに基づいています。
 */
export interface Record {
  id: string; // uuidv4
  animalId: string;
  soap: SoapNotes;
  images?: string[]; // 画像URLの配列
  audioUrl?: string; // 音声ファイルのURL
  next_visit_date?: string | null; // バックエンドの実装に合わせて追加
  next_visit_time?: string | null; // バックエンドの実装に合わせて追加
  createdAt?: string; // サーバーで生成されるタイムスタンプ
  updatedAt?: string;
}

export interface SearchResults {
  animals: Animal[];
  total_count: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

/**
 * 動物の基本情報。
 */
export interface Animal {
  id: string; // `microchip_number` と同じ値
  microchip_number: string;
  name: string;
  age?: number;
  sex?: "male" | "female" | "unknown";
  breed?: string;
  farm_id?: string;
  thumbnailUrl?: string; // 動物の写真URL
  owner?: string;
  records?: Record[]; // 詳細表示時に含まれる場合があるためオプショナルに変更
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 予約情報。
 * NewRecordFormやカレンダー機能で使用されます。
 */
export interface Appointment {
  id: string;
  microchip_number: string;
  animal_name: string;
  date: string;
  time: string;
  description?: string;
  status?: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  doctor?: string; // 担当獣医（任意）
}

/**
 * 動物詳細ページ (`/api/animals/{animal_id}`) のレスポンスデータ構造。
 */
export interface AnimalDetailData {
  animal: Animal;
  records: Record[];
  summary: string;
}


// --- UI関連の型 ---

/**
 * アプリケーションの表示状態を管理するための型。
 */
export type ViewState =
  | "search"
  | "results"
  | "detail"
  | "newAnimal"
  | "calendar"
  | "dailyAppointments"
  | "settings"
  | "reports";


// --- API レスポンス型 ---

/**
 * 汎用的なアップロード処理のレスポンス。
 */
export interface UploadResponse {
  url?: string;
  key?: string;
  message?: string;
  status?: 'success' | 'error';
}

/**
 * 音声文字起こしAPI (`/api/transcribe`) のレスポンス。
 */
export interface TranscribeResponse {
  transcription: string; // バックエンドのレスポンスに合わせて追加
  transcribed_text: string; // 互換性のために維持
  filename: string;
  file_size: number; // バックエンドのレスポンスに合わせて追加
  status: 'success' | 'error';
  service: string; // 例: "google_speech_to_text"
}

/**
 * SOAPノート自動生成API (`/api/generateSoap`) のレスポンス。
 */
export interface SoapGenerationResponse {
  soap_notes: SoapNotes;
  audio_url?: string;
  original_text?: string;
  source: "audio" | "text";
  status: 'success' | 'error';
  service: string; // 例: "google_gemini"
}

/**
 * 診療記録作成API (`/api/records`) のレスポンスに含まれる処理済み画像情報。
 */
export interface ProcessedImageInfo {
  name: string;
  data: string; // Base64 data URL
  size: number;
}

/**
 * 診療記録作成API (`/api/records`) のレスポンス。
 */
export interface RecordCreationResponse {
  record: Record;
  record_id: string; // バックエンドのレスポンスに合わせて追加
  message: string; // バックエンドのレスポンスに合わせて追加
  transcribed_text?: string;
  auto_transcribe: boolean;
  processed_images: ProcessedImageInfo[]; // バックエンドのレスポンスに合わせて追加
  status: 'success' | 'error';
  api_used: string; // 例: "google_cloud_apis"
}


// --- フォームデータ型 ---

/**
 * 新しい記録を作成/更新するフォームデータ。
 */
export interface NewRecordFormData {
  soap?: SoapNotes;
  images?: File[];
  audio?: File;
  autoTranscribe?: boolean;
  next_visit_date?: string;
  next_visit_time?: string;
  doctor?: string;
}


/**
 * 新しい動物を登録するフォームのデータ。
 */
export interface NewAnimalFormData {
  microchip_number: string;
  name: string;
  age?: number;
  sex?: 'male' | 'female' | 'unknown';
  breed?: string;
  farm_id?: string;
  owner?: string;
  thumbnail?: File; // バックエンドの `file` パラメータに対応
}

/**
 * 予約を作成/編集するフォームのデータ。
 */
export interface AppointmentFormData {
  microchip_number: string;
  animal_name: string;
  date: string;
  time: string;
  description?: string;
}


// --- 検索・エラー・設定など ---

/**
 * 動物検索時のフィルター条件。
  */
export interface SearchFilters {
  query?: string; // バックエンドの実装に合わせたシンプルなクエリ
  microchip_number?: string;
  farm_id?: string;
  breed?: string;
  sex?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * APIから返されるエラーレスポンス。
 */
export interface ApiError {
  detail: string;
  status_code?: number;
}

/**
 * フォームのバリデーションエラー。
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * アプリケーション設定。
 */
export interface AppSettings {
  default_visit_duration: number;
  auto_transcribe_enabled: boolean;
  preferred_ai_service: 'gemini' | 'gpt' | 'claude';
  language: 'ja' | 'en';
  timezone: string;
  notification_enabled: boolean;
}

/**
 * 予約情報に、関連する動物の情報を付加した型。
 * 画面表示などで使用します。
 */
export interface AppointmentWithAnimalInfo extends Appointment {
  farm_id?: string;  // 動物の農場ID
  summary?: string;
  next_visit_date?: string | null; // ← これを追加
  // 他にも動物の情報が必要であればここに追加できます
  // animal_breed?: string;
  // animal_sex?: "male" | "female" | "unknown";
}
