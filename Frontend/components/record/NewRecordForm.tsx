import React, { useState, useRef } from "react";
import { 
  Mic, 
  MicOff, 
  Upload, 
  Loader2, 
  Calendar,
  Save,
  AlertCircle,
  CheckCircle,
  Camera,
  X,
  Sparkles
} from "lucide-react";
import type { SoapNotes, Appointment } from "@/types";
import { TIME_OPTIONS } from "@/lib/utils";

interface NewRecordFormProps {
  onSave: (recordData: { 
    soap: SoapNotes; 
    images?: File[]; 
    nextVisitDate?: string;
    nextVisitTime?: string;
    // 画像データをBase64で保存するためのフィールドを追加
    imageBase64s?: string[];
    imageNames?: string[];
  }) => Promise<void>;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  appointments: { [key: string]: Appointment[] };
  onSelectAnimal: (microchipNumber: string) => void;
  selectedMicrochip?: string;
  onAppointmentsUpdate?: () => void;
}

// ユーティリティ関数
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

// ファイルをBase64に変換する関数
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

// API URL を動的に決定する関数
const getApiUrl = (): string => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('github.dev')) {
    const hostname = window.location.hostname;
    const backendHostname = hostname.replace('-3000.app.github.dev', '-8000.app.github.dev');
    return `https://${backendHostname}`;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
};

const NewRecordForm: React.FC<NewRecordFormProps> = ({
  onSave,
  isProcessing,
  setIsProcessing,
  appointments,
  onSelectAnimal,
  selectedMicrochip,
  onAppointmentsUpdate,
}) => {
  const [soap, setSoap] = useState<SoapNotes>({ s: "", o: "", a: "", p: "" });
  const [images, setImages] = useState<File[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [nextVisitDate, setNextVisitDate] = useState<string>("");
  const [nextVisitTime, setNextVisitTime] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isConvertingToSoap, setIsConvertingToSoap] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 音声認識の初期化
  const initializeSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setErrors(["このブラウザは音声認識をサポートしていません。Chrome、Edge、Safariをお使いください。"]);
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
        setErrors(["マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。"]);
      } else if (event.error === 'no-speech') {
        setErrors(["音声が検出されませんでした。もう一度お試しください。"]);
      } else {
        setErrors([`音声認識エラー: ${event.error}`]);
      }
    };

    recognition.onend = () => {
      setIsTranscribing(false);
    };

    return recognition;
  };

  // リアルタイム音声認識開始
  const startSpeechRecognition = () => {
    const recognition = initializeSpeechRecognition();
    if (!recognition) return;

    try {
      recognition.start();
      setSpeechRecognition(recognition);
      setIsTranscribing(true);
      setErrors([]);
    } catch (error) {
      console.error('音声認識開始エラー:', error);
      setErrors(["音声認識の開始に失敗しました。"]);
    }
  };

  // リアルタイム音声認識停止
  const stopSpeechRecognition = () => {
    if (speechRecognition) {
      speechRecognition.stop();
      setSpeechRecognition(null);
      setIsTranscribing(false);
    }
  };

  // 音声ファイルの文字起こし（実際のAPI実装に変更）
  const transcribeAudioFile = async (file: File) => {
    setIsProcessingAudio(true);
    setErrors([]);
    
    try {
      const apiUrl = getApiUrl();
      const formData = new FormData();
      formData.append('audio_file', file);

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
      setErrors(["音声ファイルの処理に失敗しました。サンプルテキストを表示しています。"]);
    } finally {
      setIsProcessingAudio(false);
    }
  };
  
  const validateForm = (): string[] => {
    const newErrors: string[] = [];
    
    if (!soap.s && !soap.o && !soap.a && !soap.p) {
      newErrors.push("SOAPノートの内容を最低1つ入力してください。");
    }
    
    if (nextVisitDate && !nextVisitTime) {
      newErrors.push("次回診療日が設定されている場合は、時間も選択してください。");
    }
    
    if (nextVisitTime && !nextVisitDate) {
      newErrors.push("次回診療時間が設定されている場合は、日付も選択してください。");
    }
    
    return newErrors;
  };

  // 音声録音開始
  const startRecording = async () => {
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
        setErrors(["録音中にエラーが発生しました。"]);
      };

      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecording(true);
      setErrors([]);
      
      console.log('録音開始');
    } catch (error) {
      console.error("録音開始エラー:", error);
      setErrors(["マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。"]);
    }
  };

  // 音声録音停止
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
    }
    stopSpeechRecognition();
  };

  // 音声ファイル選択
  const handleAudioFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!isAudioFile(file.name)) {
        setErrors(["音声ファイル（.wav, .mp3, .ogg, .webm, .flac, .m4a）を選択してください。"]);
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setErrors(["ファイルサイズは25MB以下にしてください。"]);
        return;
      }
      setAudioFile(file);
      setErrors([]);
      transcribeAudioFile(file);
    }
  };

  // 画像選択
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validImages = files.filter(file => {
      const isValid = file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024;
      if (!isValid && file.size > 5 * 1024 * 1024) {
        setErrors(prev => [...prev, `${file.name}: ファイルサイズは5MB以下にしてください。`]);
      }
      return isValid;
    });
    
    if (validImages.length + images.length > 10) {
      setErrors(prev => [...prev, "画像は最大10枚まで選択できます。"]);
      return;
    }
    
    setImages(prev => [...prev, ...validImages]);
    setErrors([]);
  };

  // カメラ起動
  const startCamera = async () => {
    setIsCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        } 
      });
      
      setCameraStream(stream);
      setIsCameraOpen(true);
      setErrors([]);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              resolve();
            };
          }
        });
        
        await videoRef.current.play();
      }
    } catch (error) {
      console.error("カメラ起動エラー:", error);
      setErrors(["カメラへのアクセスが許可されていません。ブラウザの設定を確認してください。"]);
      setIsCameraOpen(false);
    } finally {
      setIsCameraLoading(false);
    }
  };

  // カメラ停止
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  // 写真撮影
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setErrors(["カメラまたはキャンバスの準備ができていません。"]);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) {
      setErrors(["キャンバスコンテキストを取得できませんでした。"]);
      return;
    }

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      setErrors(["ビデオの準備ができていません。少し待ってからもう一度お試しください。"]);
      return;
    }

    try {
      const videoWidth = video.videoWidth || video.clientWidth;
      const videoHeight = video.videoHeight || video.clientHeight;
      
      if (videoWidth === 0 || videoHeight === 0) {
        setErrors(["ビデオサイズを取得できませんでした。"]);
        return;
      }

      canvas.width = videoWidth;
      canvas.height = videoHeight;
      
      context.drawImage(video, 0, 0, videoWidth, videoHeight);
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('写真の変換に失敗しました'));
          }
        }, 'image/jpeg', 0.8);
      });

      const timestamp = Date.now();
      const file = new File([blob], `photo_${timestamp}.jpg`, { type: 'image/jpeg' });
      
      if (images.length >= 10) {
        setErrors(["画像は最大10枚まで撮影できます。"]);
        return;
      }
      
      setImages(prev => [...prev, file]);
      setErrors([]);
      
      console.log('写真撮影完了:', file.name, formatFileSize(file.size));
      
    } catch (error) {
      console.error('写真撮影エラー:', error);
      setErrors(["写真の撮影に失敗しました。もう一度お試しください。"]);
    }
  };

  // 画像削除
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // 音声ファイル削除
  const removeAudioFile = () => {
    setAudioFile(null);
    setTranscribedText("");
  };

  // 転写テキストをSOAPに変換
  const handleConvertToSoap = async () => {
    if (!transcribedText.trim()) {
      setErrors(["転写テキストがありません。"]);
      return;
    }

    setIsConvertingToSoap(true);
    setErrors([]);

    try {
      const apiUrl = getApiUrl();
      console.log('API接続試行中:', apiUrl);

      const formData = new FormData();
      formData.append('transcribed_text', transcribedText.trim());

      const response = await fetch(`${apiUrl}/api/generateSoap`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API エラーレスポンス:', response.status, errorText);
        
        let errorMessage = 'SOAPへの変換に失敗しました。';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('完全なAPIレスポンス:', JSON.stringify(result, null, 2));

      const classifiedSoap: SoapNotes = result.soap_notes || result;
      console.log('抽出されたSOAP:', classifiedSoap);
      
      setSoap(classifiedSoap);

    } catch (error: any) {
      console.error("SOAP変換APIエラー:", error);
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        setErrors([
          `バックエンドサーバーに接続できません。`,
          `以下を確認してください:`,
          `1. バックエンドサーバー (ポート8000) が起動しているか`,
          `2. GitHub Codespaces の場合、ポート8000が公開設定になっているか`,
          `3. 現在の接続先: ${getApiUrl()}`
        ]);
      } else {
        setErrors([`自動変換エラー: ${error.message}`]);
      }
    } finally {
      setIsConvertingToSoap(false);
    }
  };

  // フォーム送信（画像をBase64で保存するよう修正）
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsProcessing(true);
    setErrors([]);
    
    try {
      // 画像をBase64に変換
      const imageBase64s: string[] = [];
      const imageNames: string[] = [];

      for (const image of images) {
        try {
          const base64 = await fileToBase64(image);
          imageBase64s.push(base64);
          imageNames.push(image.name);
        } catch (error) {
          console.error('画像変換エラー:', error);
          setErrors(prev => [...prev, `${image.name}の変換に失敗しました。`]);
        }
      }
      
      const recordData = {
        soap,
        images: images.length > 0 ? images : undefined,
        imageBase64s: imageBase64s.length > 0 ? imageBase64s : undefined,
        imageNames: imageNames.length > 0 ? imageNames : undefined,
        nextVisitDate: nextVisitDate || undefined,
        nextVisitTime: nextVisitTime || undefined,
      };
      
      await onSave(recordData);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      if (nextVisitDate && nextVisitTime && onAppointmentsUpdate) {
        onAppointmentsUpdate();
      }
      
      resetForm();
    } catch (error) {
      console.error("記録保存エラー:", error);
      setErrors(["記録の保存に失敗しました。もう一度お試しください。"]);
    } finally {
      setIsProcessing(false);
    }
  };

  // フォームリセット
  const resetForm = () => {
    setSoap({ s: "", o: "", a: "", p: "" });
    setImages([]);
    setAudioFile(null);
    setNextVisitDate("");
    setNextVisitTime("");
    setTranscribedText("");
    setErrors([]);
    stopCamera();
    stopSpeechRecognition();
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-4">新しい診療記録</h3>
      
      {/* エラー表示 */}
      {errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center text-red-800 font-medium">
            <AlertCircle className="h-4 w-4 mr-2" />
            エラー
          </div>
          <div className="mt-2 text-sm text-red-700">
            {errors.map((error, index) => (
              <div key={index}>• {error}</div>
            ))}
          </div>
        </div>
      )}

      {/* 成功表示 */}
      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center text-green-800 font-medium">
            <CheckCircle className="h-4 w-4 mr-2" />
            記録が正常に保存されました
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 音声録音・アップロード */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800">音声入力</h4>
          
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={isTranscribing ? stopSpeechRecognition : startSpeechRecognition}
              className={`flex items-center px-4 py-2 rounded-md transition ${
                isTranscribing 
                  ? "bg-red-600 text-white hover:bg-red-700" 
                  : "bg-purple-600 text-white hover:bg-purple-700"
              }`}
            >
              {isTranscribing ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
              {isTranscribing ? "認識停止" : "リアルタイム認識"}
            </button>

            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex items-center px-4 py-2 rounded-md transition ${
                isRecording 
                  ? "bg-red-600 text-white hover:bg-red-700" 
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isRecording ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
              {isRecording ? "録音停止" : "録音して文字起こし"}
            </button>

            <label className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md cursor-pointer hover:bg-gray-700 transition">
              <Upload className="mr-2 h-4 w-4" />
              音声ファイル選択
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* 処理状態表示 */}
          {isTranscribing && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
              <div className="flex items-center text-purple-800">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                音声認識中... 話してください
              </div>
            </div>
          )}

          {isProcessingAudio && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center text-blue-800">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                音声ファイルを処理中...
              </div>
            </div>
          )}

          {/* 音声ファイル表示 */}
          {audioFile && (
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-800">
                  選択されたファイル: {audioFile.name} ({formatFileSize(audioFile.size)})
                </p>
                <button
                  type="button"
                  onClick={removeAudioFile}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  削除
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={() => transcribeAudioFile(audioFile)}
                  disabled={isProcessingAudio}
                  className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm disabled:bg-blue-300"
                >
                  {isProcessingAudio ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : null}
                  {isProcessingAudio ? "処理中..." : "文字起こし実行"}
                </button>
              </div>
              <audio controls className="mt-2 w-full">
                <source src={URL.createObjectURL(audioFile)} type={audioFile.type} />
                お使いのブラウザは音声の再生をサポートしていません。
              </audio>
            </div>
          )}
        </div>

        {/* 転写テキスト入力 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-800">転写テキスト</h4>
            {transcribedText.trim() && (
              <button
                type="button"
                onClick={handleConvertToSoap}
                disabled={isConvertingToSoap}
                className="flex items-center px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition text-sm disabled:bg-purple-300 disabled:cursor-not-allowed"
              >
                {isConvertingToSoap ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {isConvertingToSoap ? "AIで変換中..." : "AIでSOAP変換"}
              </button>
            )}
          </div>
          <textarea
            value={transcribedText}
            onChange={(e) => setTranscribedText(e.target.value)}
            className="w-full p-2 border border-gray-800 rounded-md block font-semibold text-gray-800 text-sm"
            rows={4}
            placeholder="ここに音声認識結果が表示、または手動で入力します。"
          />
        </div>

        {/* 写真撮影・選択 */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800">診療画像（最大10枚、各5MB以下）</h4>
          
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={isCameraOpen ? stopCamera : startCamera}
              disabled={isCameraLoading || images.length >= 10}
              className={`flex items-center px-4 py-2 rounded-md transition ${
                isCameraOpen
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-green-600 text-white hover:bg-green-700"
              } ${(isCameraLoading || images.length >= 10) ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isCameraLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              {isCameraLoading ? "起動中..." : isCameraOpen ? "カメラ停止" : "カメラで撮影"}
            </button>

            <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition">
              <Upload className="mr-2 h-4 w-4" />
              ファイルから選択 ({images.length}/10)
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                disabled={images.length >= 10}
                className="hidden"
              />
            </label>
          </div>

          {/* カメラプレビュー */}
          {isCameraOpen && (
            <div className="space-y-3">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-w-md mx-auto block"
                />
                
                <canvas ref={canvasRef} className="hidden" />
                
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={images.length >= 10}
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-gray-300 hover:border-blue-500 transition disabled:opacity-50 flex items-center justify-center"
                >
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                </button>
                
                <button
                  type="button"
                  onClick={stopCamera}
                  className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition"
                >
                  <X className="h-4 w-4" />
                </button>
                
                <div className="absolute top-4 right-14 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  {images.length}/10
                </div>
              </div>
              
              <p className="text-sm text-gray-700 text-center">
                カメラを被写体に向けて、下のボタンで撮影してください
              </p>
            </div>
          )}

          {/* 撮影済み・選択済み画像のプレビュー */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`選択画像 ${index + 1}`}
                    className="w-full h-24 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    {image.name} ({formatFileSize(image.size)})
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SOAP入力 */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800">診療ノート</h4>
          {Object.entries(soap).map(([key, value]) => (
            <div key={key}>
              <label className="w-full block font-semibold text-gray-800 text-sm mb-1">
                {key.toUpperCase()}: {
                  key === 's' ? 'Subjective (主観的情報)' :
                  key === 'o' ? 'Objective (客観的情報)' :
                  key === 'a' ? 'Assessment (評価・診断)' :
                  'Plan (計画・治療)'
                }
              </label>
              <textarea
                value={value}
                onChange={(e) => setSoap(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full block font-semibold text-gray-800 text-sm mb-1 p-2 border border-gray-800 rounded-md focus:ring-2 focus:ring-blue-500"
                rows={key === "s" || key === "o" ? 3 : 2}
                placeholder={`${key.toUpperCase()}の内容を入力してください`}
              />
            </div>
          ))}
        </div>

        {/* 次回診療予約 */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800">次回診療予約 (オプション)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                予約日
              </label>
              <input
                type="date"
                value={nextVisitDate}
                onChange={(e) => setNextVisitDate(e.target.value)}
                min={today}
                className="w-full block font-semibold text-gray-800 text-sm mb-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                予約時間
              </label>
              <select
                value={nextVisitTime}
                onChange={(e) => setNextVisitTime(e.target.value)}
                className="w-full block font-semibold text-gray-800 text-sm mb-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">時間を選択</option>
                {TIME_OPTIONS.map((time) => {
                  // 選択された日付の既存予約を確認
                  const existingAppointments = nextVisitDate ? appointments[nextVisitDate] || [] : [];
                  const isTimeBooked = existingAppointments.some(apt => apt.time === time);
                  
                  return (
                    <option key={time} value={time} disabled={isTimeBooked}>
                      {time} {isTimeBooked ? "(予約済み)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* 送信ボタン */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition"
          >
            リセット
          </button>
          <button
            type="submit"
            disabled={isProcessing}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isProcessing ? "保存中..." : "診療記録を保存"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewRecordForm;