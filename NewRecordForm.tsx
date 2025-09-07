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
import MiniCalendar from "@/components/calendar/MiniCalendar";

interface NewRecordFormProps {
  onSave: (recordData: { 
    soap: SoapNotes; 
    images?: File[]; 
    nextVisitDate?: string;
    nextVisitTime?: string;
    // 逕ｻ蜒上ョ繝ｼ繧ｿ繧達ase64縺ｧ菫晏ｭ倥☆繧九◆繧√・繝輔ぅ繝ｼ繝ｫ繝峨ｒ霑ｽ蜉
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

// 繝ｦ繝ｼ繝・ぅ繝ｪ繝・ぅ髢｢謨ｰ
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

// 繝輔ぃ繧､繝ｫ繧達ase64縺ｫ螟画鋤縺吶ｋ髢｢謨ｰ
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

// API URL 繧貞虚逧・↓豎ｺ螳壹☆繧矩未謨ｰ
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

  // 髻ｳ螢ｰ隱崎ｭ倥・蛻晄悄蛹・
  const initializeSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setErrors(["Speech recognition is not supported. Please use Chrome, Edge, or Safari."]);
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
      console.error('髻ｳ螢ｰ隱崎ｭ倥お繝ｩ繝ｼ:', event.error);
      setIsTranscribing(false);
      if (event.error === 'not-allowed') {
        setErrors(["マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。"]);
      } else if (event.error === 'no-speech') {
        setErrors(["音声が検出されませんでした。もう一度お試しください。"]);
      } else {
        setErrors([`髻ｳ螢ｰ隱崎ｭ倥お繝ｩ繝ｼ: ${event.error}`]);
      }
    };

    recognition.onend = () => {
      setIsTranscribing(false);
    };

    return recognition;
  };

  // 繝ｪ繧｢繝ｫ繧ｿ繧､繝髻ｳ螢ｰ隱崎ｭ倬幕蟋・
  const startSpeechRecognition = () => {
    const recognition = initializeSpeechRecognition();
    if (!recognition) return;

    try {
      recognition.start();
      setSpeechRecognition(recognition);
      setIsTranscribing(true);
      setErrors([]);
    } catch (error) {
      console.error('髻ｳ螢ｰ隱崎ｭ倬幕蟋九お繝ｩ繝ｼ:', error);
      setErrors(["音声認識の開始に失敗しました。"]);
    }
  };

  // 繝ｪ繧｢繝ｫ繧ｿ繧､繝髻ｳ螢ｰ隱崎ｭ伜●豁｢
  const stopSpeechRecognition = () => {
    if (speechRecognition) {
      speechRecognition.stop();
      setSpeechRecognition(null);
      setIsTranscribing(false);
    }
  };

  // 髻ｳ螢ｰ繝輔ぃ繧､繝ｫ縺ｮ譁・ｭ苓ｵｷ縺薙＠・亥ｮ滄圀縺ｮAPI螳溯｣・↓螟画峩・・
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
        throw new Error(`髻ｳ螢ｰ霆｢蜀吶↓螟ｱ謨励＠縺ｾ縺励◆: ${response.status}`);
      }

      const result = await response.json();
      const transcription = result.transcription || result.text || '';
      
      setTranscribedText(prev => prev + (prev ? "\n" : "") + transcription);
      
    } catch (error) {
      console.error('音声ファイル処理エラー:', error);
      // フォールバック: サンプルテキスト
      const sampleTranscription = "音声ファイルの文字起こしです。患畜は食欲不振を訴えており、体温は38.5度でした。診察の結果、風邪と判断し、解熱剤を処方しました。";
      setTranscribedText(prev => prev + (prev ? "\n" : "") + sampleTranscription);
      setErrors(["音声ファイルの処理に失敗しました。サンプルテキストを表示しています。"]);
    } finally {
      setIsProcessingAudio(false);
    }
  };
  
  const validateForm = (): string[] => {
    const newErrors: string[] = [];
    
    if (!soap.s && !soap.o && !soap.a && !soap.p) {
      newErrors.push("Please enter at least one SOAP note (S/O/A/P).");
    }
    
    if (nextVisitDate && !nextVisitTime) {
      newErrors.push("If you set a next-visit date, please also select a time.");
    }
    
    if (nextVisitTime && !nextVisitDate) {
      newErrors.push("If you set a next-visit time, please also select a date.");
    }
    
    return newErrors;
  };

  // 髻ｳ螢ｰ骭ｲ髻ｳ髢句ｧ・
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
        
        console.log('録音完了', audioFile.name, formatFileSize(audioFile.size));
      };

      recorder.onerror = (event) => {
        console.error('骭ｲ髻ｳ繧ｨ繝ｩ繝ｼ:', event);
        setErrors(["録音中にエラーが発生しました。"]);
      };

      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecording(true);
      setErrors([]);
      
      console.log('録音開始');
    } catch (error) {
      console.error("骭ｲ髻ｳ髢句ｧ九お繝ｩ繝ｼ:", error);
      setErrors(["マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。"]);
    }
  };

  // 髻ｳ螢ｰ骭ｲ髻ｳ蛛懈ｭ｢
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
    }
    stopSpeechRecognition();
  };

  // 髻ｳ螢ｰ繝輔ぃ繧､繝ｫ驕ｸ謚・
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

  // 逕ｻ蜒城∈謚・
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validImages = files.filter(file => {
      const isValid = file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024;
      if (!isValid && file.size > 5 * 1024 * 1024) {
        setErrors(prev => [...prev, file.name + ': ファイルサイズは5MB以下にしてください。']);
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

  // 繧ｫ繝｡繝ｩ襍ｷ蜍・
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
      console.error("繧ｫ繝｡繝ｩ襍ｷ蜍輔お繝ｩ繝ｼ:", error);
      setErrors(["カメラへのアクセスが許可されていません。ブラウザの設定を確認してください。"]);
      setIsCameraOpen(false);
    } finally {
      setIsCameraLoading(false);
    }
  };

  // 繧ｫ繝｡繝ｩ蛛懈ｭ｢
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

  // 蜀咏悄謦ｮ蠖ｱ
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
            reject(new Error('蜀咏悄縺ｮ螟画鋤縺ｫ螟ｱ謨励＠縺ｾ縺励◆'));
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
      
      console.log('写真撮影完了', file.name, formatFileSize(file.size));
      
    } catch (error) {
      console.error('蜀咏悄謦ｮ蠖ｱ繧ｨ繝ｩ繝ｼ:', error);
      setErrors(["写真の撮影に失敗しました。もう一度お試しください。"]);
    }
  };

  // 逕ｻ蜒丞炎髯､
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // 髻ｳ螢ｰ繝輔ぃ繧､繝ｫ蜑企勁
  const removeAudioFile = () => {
    setAudioFile(null);
    setTranscribedText("");
  };

  // 霆｢蜀吶ユ繧ｭ繧ｹ繝医ｒSOAP縺ｫ螟画鋤
  const handleConvertToSoap = async () => {
    if (!transcribedText.trim()) {
      setErrors(["転写テキストがありません。"]);
      return;
    }

    setIsConvertingToSoap(true);
    setErrors([]);

    try {
      const apiUrl = getApiUrl();
      console.log('API謗･邯夊ｩｦ陦御ｸｭ:', apiUrl);

      const formData = new FormData();
      formData.append('transcribed_text', transcribedText.trim());

      const response = await fetch(`${apiUrl}/api/generateSoap`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API 繧ｨ繝ｩ繝ｼ繝ｬ繧ｹ繝昴Φ繧ｹ:', response.status, errorText);
        
        let errorMessage = 'Failed to convert to SOAP.';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('APIレスポンス:', JSON.stringify(result, null, 2));

      const classifiedSoap: SoapNotes = result.soap_notes || result;
      console.log('謚ｽ蜃ｺ縺輔ｌ縺欖OAP:', classifiedSoap);
      
      setSoap(classifiedSoap);

    } catch (error: any) {
      console.error("SOAP螟画鋤API繧ｨ繝ｩ繝ｼ:", error);
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        setErrors([
          `バックエンドサーバーに接続できません。`,
          `莉･荳九ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞:`,
          `1. バックエンドサーバー（ポート8000）が起動していますか`,
          `2. GitHub Codespaces の場合、ポート8000が公開設定になっていますか`,
          `3. 現在の接続先: ${getApiUrl()}`
        ]);
      } else {
        setErrors([`閾ｪ蜍募､画鋤繧ｨ繝ｩ繝ｼ: ${error.message}`]);
      }
    } finally {
      setIsConvertingToSoap(false);
    }
  };

  // フォーム送信（画像をBase64で保存する方式）
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
      // 逕ｻ蜒上ｒBase64縺ｫ螟画鋤
      const imageBase64s: string[] = [];
      const imageNames: string[] = [];

      for (const image of images) {
        try {
          const base64 = await fileToBase64(image);
          imageBase64s.push(base64);
          imageNames.push(image.name);
        } catch (error) {
          console.error('逕ｻ蜒丞､画鋤繧ｨ繝ｩ繝ｼ:', error);
          setErrors(prev => [...prev, image.name + 'の変換に失敗しました。']);
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
      console.error("險倬鹸菫晏ｭ倥お繝ｩ繝ｼ:", error);
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
      <h3 className="text-xl font-bold text-gray-800 mb-4">譁ｰ縺励＞險ｺ逋りｨ倬鹸</h3>
      
      {/* 繧ｨ繝ｩ繝ｼ陦ｨ遉ｺ */}
      {errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center text-red-800 font-medium">
            <AlertCircle className="h-4 w-4 mr-2" />
            繧ｨ繝ｩ繝ｼ
          </div>
          <div className="mt-2 text-sm text-red-700">
            {errors.map((error, index) => (
              <div key={index}>窶｢ {error}</div>
            ))}
        </div>
          </div>
      )}

      {/* 謌仙粥陦ｨ遉ｺ */}
      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center text-green-800 font-medium">
            <CheckCircle className="h-4 w-4 mr-2" />
            險倬鹸縺梧ｭ｣蟶ｸ縺ｫ菫晏ｭ倥＆繧後∪縺励◆
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 髻ｳ螢ｰ骭ｲ髻ｳ繝ｻ繧｢繝・・繝ｭ繝ｼ繝・*/}
          <h4 className="font-semibold text-gray-800">音声入力</h4>
          <h4 className="font-semibold text-gray-800">髻ｳ螢ｰ蜈･蜉・/h4>
          
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
              {isTranscribing ? "認識停止" : "リアルタイム認識"}
              {isTranscribing ? "隱崎ｭ伜●豁｢" : "繝ｪ繧｢繝ｫ繧ｿ繧､繝隱崎ｭ・}
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
              {isRecording ? "録音停止" : "録音して文字起こし"}
              {isRecording ? "骭ｲ髻ｳ蛛懈ｭ｢" : "骭ｲ髻ｳ縺励※譁・ｭ苓ｵｷ縺薙＠"}
            </button>

            <label className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md cursor-pointer hover:bg-gray-700 transition">
              音声ファイル選択
              髻ｳ螢ｰ繝輔ぃ繧､繝ｫ驕ｸ謚・
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* 蜃ｦ逅・憾諷玖｡ｨ遉ｺ */}
          {isTranscribing && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
              <div className="flex items-center text-purple-800">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                髻ｳ螢ｰ隱崎ｭ倅ｸｭ... 隧ｱ縺励※縺上□縺輔＞
              </div>
            </div>
          )}

          {isProcessingAudio && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center text-blue-800">
                音声ファイルを処理中...
                髻ｳ螢ｰ繝輔ぃ繧､繝ｫ繧貞・逅・ｸｭ...
              </div>
            </div>
          )}

          {/* 髻ｳ螢ｰ繝輔ぃ繧､繝ｫ陦ｨ遉ｺ */}
          {audioFile && (
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-800">
                  驕ｸ謚槭＆繧後◆繝輔ぃ繧､繝ｫ: {audioFile.name} ({formatFileSize(audioFile.size)})
                </p>
                <button
                  type="button"
                  onClick={removeAudioFile}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  蜑企勁
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
                  {isProcessingAudio ? "処理中..." : "文字起こし実行"}
                  {isProcessingAudio ? "蜃ｦ逅・ｸｭ..." : "譁・ｭ苓ｵｷ縺薙＠螳溯｡・}
                </button>
              </div>
              <audio controls className="mt-2 w-full">
                お使いのブラウザは音声の再生をサポートしていません。
                縺贋ｽｿ縺・・繝悶Λ繧ｦ繧ｶ縺ｯ髻ｳ螢ｰ縺ｮ蜀咲函繧偵し繝昴・繝医＠縺ｦ縺・∪縺帙ｓ縲・
              </audio>
            </div>
          )}
        </div>

        {/* 霆｢蜀吶ユ繧ｭ繧ｹ繝亥・蜉・*/}
        <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">転写テキスト</h4>
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
                {isConvertingToSoap ? "AI縺ｧ螟画鋤荳ｭ..." : "AI縺ｧSOAP螟画鋤"}
              </button>
            )}
          </div>
          <textarea
            value={transcribedText}
            onChange={(e) => setTranscribedText(e.target.value)}
            className="w-full p-2 border border-gray-800 rounded-md block font-semibold text-gray-800 text-sm"
            rows={4}
            placeholder="ここに音声認識結果が表示、または手動で入力します"
          />
        </div>

        {/* 蜀咏悄謦ｮ蠖ｱ繝ｻ驕ｸ謚・*/}
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
              {isCameraLoading ? "襍ｷ蜍穂ｸｭ..." : isCameraOpen ? "繧ｫ繝｡繝ｩ蛛懈ｭ｢" : "繧ｫ繝｡繝ｩ縺ｧ謦ｮ蠖ｱ"}
            </button>

            <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition">
              <Upload className="mr-2 h-4 w-4" />
              ファイルから選択({images.length}/10)
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

          {/* 繧ｫ繝｡繝ｩ繝励Ξ繝薙Η繝ｼ */}
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

          {/* 謦ｮ蠖ｱ貂医∩繝ｻ驕ｸ謚樊ｸ医∩逕ｻ蜒上・繝励Ξ繝薙Η繝ｼ */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`選択画像${index + 1}` }
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
                  key === 's' ? 'Subjective (主観情報)' :
                  key === 'o' ? 'Objective (客観情報)' :
                  key === 'a' ? 'Assessment (隧穂ｾ｡繝ｻ險ｺ譁ｭ)' :
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

        {/* 次回診療予定 */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800">次回診療予定（オプション）</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                予定日
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
                予定時間
              </label>
              <select
                value={nextVisitTime}
                onChange={(e) => setNextVisitTime(e.target.value)}
                className="w-full block font-semibold text-gray-800 text-sm mb-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">時間を選択</option>
                {TIME_OPTIONS.map((time) => {
                  // 驕ｸ謚槭＆繧後◆譌･莉倥・譌｢蟄倅ｺ育ｴ・ｒ遒ｺ隱・
                  const existingAppointments = nextVisitDate ? appointments[nextVisitDate] || [] : [];
                  const isTimeBooked = existingAppointments.some(apt => apt.time === time);
                  
                  return (
                    <option key={time} value={time} disabled={isTimeBooked}>
                      {time} {isTimeBooked ? "（予約済み）" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          {/* 予定日選択用ミニカレンダー */}
          <div>
            <MiniCalendar
              appointments={appointments}
              selectedDate={nextVisitDate || today}
              onDateChange={(date) => setNextVisitDate(date)}
              currentDate={new Date()}
            />
          </div>
        </div>

        {/* 騾∽ｿ｡繝懊ち繝ｳ */}
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
            {isProcessing ? "菫晏ｭ倅ｸｭ..." : "險ｺ逋りｨ倬鹸繧剃ｿ晏ｭ・}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewRecordForm;



