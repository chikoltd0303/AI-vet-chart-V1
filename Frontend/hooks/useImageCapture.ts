
// hooks/useImageCapture.ts
import { useState, useRef, useCallback } from 'react';
import type { ImageCaptureState, ImageCaptureActions } from '@/types/hooks';

// ユーティリティ関数
const isImageFile = (filename: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return imageExtensions.includes(extension);
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const useImageCapture = (
  onError: (errors: string[]) => void
): ImageCaptureState & ImageCaptureActions => {
  // State
  const [images, setImages] = useState<File[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // カメラ開始
  const startCamera = useCallback(async () => {
    setIsCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'environment' // 背面カメラを優先
        } 
      });
      
      setCameraStream(stream);
      setIsCameraOpen(true);
      
      // ビデオ要素にストリームを設定
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('カメラアクセスエラー:', error);
      onError(['カメラへのアクセスが許可されていません。ブラウザの設定を確認してください。']);
    } finally {
      setIsCameraLoading(false);
    }
  }, [onError]);

  // カメラ停止
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [cameraStream]);

  // 写真撮影
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !cameraStream) {
      onError(['カメラが利用できません。']);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) {
      onError(['キャンバスの初期化に失敗しました。']);
      return;
    }

    // キャンバスサイズをビデオサイズに合わせる
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // ビデオフレームをキャンバスに描画
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // キャンバスをBlobに変換
    canvas.toBlob((blob) => {
      if (blob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `photo-${timestamp}.jpg`, { 
          type: 'image/jpeg' 
        });
        
        setImages(prev => [...prev, file]);
      } else {
        onError(['写真の保存に失敗しました。']);
      }
    }, 'image/jpeg', 0.8);
  }, [cameraStream, onError]);

  // ファイル選択による画像追加
  const handleImageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      // ファイル形式チェック
      if (!isImageFile(file.name)) {
        errors.push(`${file.name}: 対応していないファイル形式です`);
        return;
      }

      // ファイルサイズチェック (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        errors.push(`${file.name}: ファイルサイズが大きすぎます (最大: 10MB)`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      onError(errors);
    }

    if (validFiles.length > 0) {
      // 現在の画像数と合わせて最大10枚まで
      const maxImages = 10;
      const totalImages = images.length + validFiles.length;
      
      if (totalImages > maxImages) {
        const allowedCount = maxImages - images.length;
        const allowedFiles = validFiles.slice(0, allowedCount);
        onError([`画像は最大${maxImages}枚までです。${allowedFiles.length}枚を追加しました。`]);
        setImages(prev => [...prev, ...allowedFiles]);
      } else {
        setImages(prev => [...prev, ...validFiles]);
      }
    }

    // ファイル選択をリセット
    event.target.value = '';
  }, [images.length, onError]);

  // 画像削除
  const removeImage = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // カメラ用の参照を提供する関数を追加
  const getCameraRefs = useCallback(() => {
    return { videoRef, canvasRef };
  }, []);

  return {
    // State
    images,
    isCameraOpen,
    cameraStream,
    isCameraLoading,
    // Actions
    startCamera,
    stopCamera,
    capturePhoto,
    handleImageChange,
    removeImage,
    setImages,
    // Utility
    getCameraRefs,
  };
};