// hooks/useAudioRecording.ts
import { useState, useCallback } from 'react';
import type { AudioRecordingState, AudioRecordingActions } from '@/types/hooks';

// API URL 決定関数（NewRecordFormから移動）
const getApiUrl = (): string => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('github.dev')) {
    const hostname = window.location.hostname;
    const backendHostname = hostname.replace('-3000.app.github.dev', '-8000.app.github.dev');
    return `https://${backendHostname}`;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
};

// ユーティリティ関数（NewRecordFormから移動）
const isAudioFile = (filename: string): boolean => {
  const audioExtensions = ['.wav', '.mp3', '.ogg', '.webm', '.flac', '.m4a'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return audioExtensions.includes(extension);
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const useAudioRecording = (
  onError: (errors: string[]) => void
): AudioRecordingState & AudioRecordingActions => {
  // State（NewRecordFormから移動）
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);

  // 音声認識初期化（NewRecordFormから移動、useCallbackで最適化）
  const initializeSpeechRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      onError(["このブラウザは音声認識をサポートしていません。Chrome、Edge、Safariをお使いください。"]);
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ja-JP';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }
      if (finalTranscript) {
        setTranscribedText(prev => prev + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('音声認識エラー:', event.error);
      setIsTranscribing(false);
      if (event.error === 'not-allowed') {
        onError(["マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。"]);
      } else if (event.error === 'no-speech') {
        onError(["音声が検出されませんでした。もう一度お試しください。"]);
      } else {
        onError([`音声認識エラー: ${event.error}`]);
      }
    };

    recognition.onend = () => {
      setIsTranscribing(false);
    };

    return recognition;
  }, [onError]);

  // リアルタイム音声認識開始
  const startSpeechRecognition = useCallback(() => {
    const recognition = initializeSpeechRecognition();
    if (!recognition) return;

    try {
      recognition.start();
      setSpeechRecognition(recognition);
      setIsTranscribing(true);
      onError([]); // エラーをクリア
    } catch (error) {
      console.error('音声認識開始エラー:', error);
      onError(["音声認識の開始に失敗しました。"]);
    }
  }, [initializeSpeechRecognition, onError]);

  // リアルタイム音声認識停止
  const stopSpeechRecognition = useCallback(() => {
    if (speechRecognition) {
      speechRecognition.stop();
      setSpeechRecognition(null);
      setIsTranscribing(false);
    }
  }, [speechRecognition]);

  // 音声ファイルの文字起こし
  const transcribeAudioFile = useCallback(async (file: File) => {
    setIsProcessingAudio(true);
    onError([]);
    
    try {
      const apiUrl = getApiUrl();
      const formData = new FormData();
      // Backend は 'audio' フィールドを受け付ける
      formData.append('audio', file);
      // 推定言語をサーバへヒントとして送る（ja-JP/en-US）
      try {
        const ui = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
        const lang = ui.startsWith('en') ? 'en-US' : 'ja-JP';
        formData.append('lang', lang);
      } catch {}

      const response = await fetch(`${apiUrl}/api/transcribe`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`音声転写に失敗しました: ${response.status}`);
      }

      const result = await response.json();
      const transcription = result.transcription || result.text || '';
      
      setTranscribedText(prev => prev + (prev ? "\n" : "") + transcription);
      
    } catch (error) {
      console.error('音声ファイル処理エラー:', error);
      // フォールバック: デモ用のサンプルテキスト
      const sampleTranscription = "音声ファイルの内容です。患者は食欲不振を訴えており、体温は38.5度でした。診察の結果、風邪と判断し、解熱剤を処方しました。";
      setTranscribedText(prev => prev + (prev ? "\n" : "") + sampleTranscription);
      onError(["音声ファイルの処理に失敗しました。サンプルテキストを表示しています。"]);
    } finally {
      setIsProcessingAudio(false);
    }
  }, [onError]);

  // 音声録音開始
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/wav'
      });
      
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/wav';
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        const extension = mimeType.includes('webm') ? 'webm' : 'wav';
        const audioFile = new File([audioBlob], `recording_${Date.now()}.${extension}`, { type: mimeType });
        
        setAudioFile(audioFile);
        transcribeAudioFile(audioFile);
        stream.getTracks().forEach(track => track.stop());
        
        console.log('録音完了:', audioFile.name, formatFileSize(audioFile.size));
      };

      recorder.onerror = (event) => {
        console.error('録音エラー:', event);
        onError(["録音中にエラーが発生しました。"]);
      };

      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecording(true);
      onError([]); // エラーをクリア
      
      console.log('録音開始');
    } catch (error) {
      console.error("録音開始エラー:", error);
      onError(["マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。"]);
    }
  }, [transcribeAudioFile, onError]);

  // 音声録音停止
  const stopRecording = useCallback(() => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
    }
    stopSpeechRecognition();
  }, [mediaRecorder, isRecording, stopSpeechRecognition]);

  // 音声ファイル選択
  const handleAudioFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!isAudioFile(file.name)) {
        onError(["音声ファイル（.wav, .mp3, .ogg, .webm, .flac, .m4a）を選択してください。"]);
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        onError(["ファイルサイズは25MB以下にしてください。"]);
        return;
      }
      setAudioFile(file);
      onError([]); // エラーをクリア
      transcribeAudioFile(file);
    }
  }, [transcribeAudioFile, onError]);

  // 音声ファイル削除
  const removeAudioFile = useCallback(() => {
    setAudioFile(null);
    setTranscribedText("");
  }, []);

  return {
    // State
    isRecording,
    audioFile,
    transcribedText,
    isTranscribing,
    isProcessingAudio,
    mediaRecorder,
    speechRecognition,
    // Actions
    startRecording,
    stopRecording,
    startSpeechRecognition,
    stopSpeechRecognition,
    transcribeAudioFile,
    handleAudioFileChange,
    removeAudioFile,
    setTranscribedText,
  };
};
