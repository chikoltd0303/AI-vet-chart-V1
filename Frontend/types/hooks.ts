// types/hooks.ts
export interface AudioRecordingState {
  isRecording: boolean;
  audioFile: File | null;
  transcribedText: string;
  isTranscribing: boolean;
  isProcessingAudio: boolean;
  mediaRecorder: MediaRecorder | null;
  speechRecognition: any;
}

export interface AudioRecordingActions {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  startSpeechRecognition: () => void;
  stopSpeechRecognition: () => void;
  transcribeAudioFile: (file: File) => Promise<void>;
  handleAudioFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  removeAudioFile: () => void;
  setTranscribedText: React.Dispatch<React.SetStateAction<string>>;
}

export interface ImageCaptureState {
  images: File[];
  isCameraOpen: boolean;
  cameraStream: MediaStream | null;
  isCameraLoading: boolean;
}

export interface ImageCaptureActions {
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => Promise<void>;
  handleImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: (index: number) => void;
  setImages: React.Dispatch<React.SetStateAction<File[]>>;
  getCameraRefs: () => { 
    videoRef: React.MutableRefObject<HTMLVideoElement | null>; 
    canvasRef: React.MutableRefObject<HTMLCanvasElement | null>; 
  };
}

// API関連の型定義
export interface TranscribeResponse {
  transcribed_text: string;
  success: boolean;
  // 既存APIとの互換性のため
  text?: string;
}

