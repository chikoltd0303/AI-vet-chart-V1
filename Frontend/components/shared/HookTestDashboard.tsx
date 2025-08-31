// components/shared/HookTestDashboard.tsx
import React, { useState } from 'react';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useImageCapture } from '@/hooks/useImageCapture';
import { vetApi } from '@/lib/vetApiExtensions';
import { SoapNotes, SoapGenerationResponse } from '@/types/index'

export const HookTestDashboard: React.FC = () => {
  const [errors, setErrors] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<string[]>([]);

  // カスタムフックをテスト
  const audioRecording = useAudioRecording(setErrors);
  const imageCapture = useImageCapture(setErrors);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // API テスト
  const testApiConnection = async () => {
    try {
      addTestResult('API接続テスト開始...');
      const health = await vetApi.original.healthCheck();
      addTestResult(`✅ API接続成功: ${health.status}`);
    } catch (error) {
      addTestResult(`❌ API接続エラー: ${error}`);
    }
  };

  // SOAP生成テスト
    const testSoapGeneration = async () => {
    try {
      addTestResult('SOAP生成テスト開始...');
      // vetApi.generateSoap は SoapGenerationResponse を返すと仮定
      const result: SoapGenerationResponse = await vetApi.generateSoap('犬が咳をしている。体温38.5度。聴診で異常音あり。');
      
      addTestResult('✅ SOAP生成成功');

      // 統一された型 'soap_notes' を直接使用する
      if (result.soap_notes) {
        const soapNotes = result.soap_notes;
        addTestResult(`S: ${(soapNotes.s || '').substring(0, 50)}...`);
        addTestResult(`O: ${(soapNotes.o || '').substring(0, 50)}...`);
        addTestResult(`A: ${(soapNotes.a || '').substring(0, 50)}...`);
        addTestResult(`P: ${(soapNotes.p || '').substring(0, 50)}...`);
      } else {
        addTestResult('⚠️ SOAPノートがレスポンスに含まれていませんでした。');
      }
    } catch (error) {
      addTestResult(`❌ SOAP生成エラー: ${error}`);
    }
  };

  // 転写テキストからSOAP生成テスト
  const testSoapFromTranscription = async () => {
    if (!audioRecording.transcribedText) {
      addTestResult('❌ 転写テキストがありません');
      return;
    }

    try {
      addTestResult('転写テキストからSOAP生成開始...');
      // vetApi.generateSoap は SoapGenerationResponse を返すと仮定
      const result: SoapGenerationResponse = await vetApi.generateSoap(audioRecording.transcribedText);
      
      addTestResult('✅ 転写テキストからSOAP生成成功');
      
      // こちらも同様に、統一された型 'soap_notes' を直接使用する
      if (result.soap_notes) {
        const soapNotes = result.soap_notes;
        addTestResult(`S: ${(soapNotes.s || '').substring(0, 50)}...`);
        addTestResult(`O: ${(soapNotes.o || '').substring(0, 50)}...`);
        addTestResult(`A: ${(soapNotes.a || '').substring(0, 50)}...`);
        addTestResult(`P: ${(soapNotes.p || '').substring(0, 50)}...`);
      } else {
        addTestResult('⚠️ SOAPノートがレスポンスに含まれていませんでした。');
      }
    } catch (error) {
      addTestResult(`❌ 転写テキストからSOAP生成エラー: ${error}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setErrors([]);
  };

  return (
    <div className="space-y-6">
      {/* エラー表示 */}
      {errors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-800 mb-2">エラー:</h4>
          {errors.map((error, i) => (
            <div key={i} className="text-red-700 text-sm">{error}</div>
          ))}
        </div>
      )}

      {/* 音声録音テスト */}
      <div className="p-4 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">🎤 音声録音フック テスト</h3>
        <div className="flex gap-2 mb-3">
          <button 
            onClick={audioRecording.isRecording ? audioRecording.stopRecording : audioRecording.startRecording}
            className={`px-4 py-2 rounded ${
              audioRecording.isRecording 
                ? 'bg-red-500 text-white' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            disabled={audioRecording.isProcessingAudio}
          >
            {audioRecording.isRecording ? '🔴 録音停止' : '🎙️ 録音開始'}
          </button>
          
          <button 
            onClick={audioRecording.isTranscribing ? audioRecording.stopSpeechRecognition : audioRecording.startSpeechRecognition}
            className={`px-4 py-2 rounded ${
              audioRecording.isTranscribing 
                ? 'bg-red-500 text-white' 
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {audioRecording.isTranscribing ? '🛑 音声認識停止' : '🗣️ 音声認識開始'}
          </button>

          {audioRecording.audioFile && (
            <button 
              onClick={() => audioRecording.transcribeAudioFile(audioRecording.audioFile!)}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              disabled={audioRecording.isProcessingAudio}
            >
              {audioRecording.isProcessingAudio ? '⏳ 転写中...' : '📝 ファイル転写'}
            </button>
          )}
        </div>

        {audioRecording.audioFile && (
          <div className="mb-3 p-2 bg-gray-100 rounded text-sm">
            録音ファイル: {audioRecording.audioFile.name}
          </div>
        )}

        {audioRecording.transcribedText && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-semibold text-sm mb-2">転写テキスト:</h4>
            <div className="text-sm">{audioRecording.transcribedText}</div>
          </div>
        )}
      </div>

      {/* 画像キャプチャテスト */}
      <div className="p-4 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">📷 画像キャプチャフック テスト</h3>
        <div className="flex gap-2 mb-3">
          <button 
            onClick={imageCapture.isCameraOpen ? imageCapture.stopCamera : imageCapture.startCamera}
            className={`px-4 py-2 rounded ${
              imageCapture.isCameraOpen 
                ? 'bg-red-500 text-white' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            disabled={imageCapture.isCameraLoading}
          >
            {imageCapture.isCameraLoading ? '⏳ 初期化中...' : 
             imageCapture.isCameraOpen ? '📱 カメラ停止' : '📷 カメラ開始'}
          </button>

          {imageCapture.isCameraOpen && (
            <button 
              onClick={imageCapture.capturePhoto}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              📸 撮影
            </button>
          )}

          <input 
            type="file" 
            accept="image/*" 
            multiple 
            onChange={imageCapture.handleImageChange}
            className="hidden" 
            id="image-upload" 
          />
          <label 
            htmlFor="image-upload"
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 cursor-pointer"
          >
            🖼️ ファイル選択
          </label>
        </div>

        {/* カメラプレビュー */}
        {imageCapture.isCameraOpen && (
          <div className="mb-4 relative">
            <video 
              ref={imageCapture.getCameraRefs().videoRef} 
              autoPlay 
              playsInline 
              className="w-full max-w-md border rounded"
            />
            <canvas 
              ref={imageCapture.getCameraRefs().canvasRef} 
              className="hidden"
            />
          </div>
        )}

        {imageCapture.images.length > 0 && (
          <div className="mt-3">
            <h4 className="font-semibold text-sm mb-2">キャプチャ画像 ({imageCapture.images.length}枚):</h4>
            <div className="grid grid-cols-3 gap-2">
              {imageCapture.images.map((image, index) => (
                <div key={index} className="relative">
                  <img 
                    src={URL.createObjectURL(image)} 
                    alt={`キャプチャ ${index + 1}`}
                    className="w-full h-20 object-cover rounded border"
                  />
                  <button 
                    onClick={() => imageCapture.removeImage(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* API統合テスト */}
      <div className="p-4 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">🔗 API統合テスト</h3>
        <div className="flex gap-2 mb-3">
          <button 
            onClick={testApiConnection}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            🔍 接続テスト
          </button>
          <button 
            onClick={testSoapGeneration}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            📋 SOAP生成テスト
          </button>
          <button 
            onClick={clearResults}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            🗑️ ログクリア
          </button>
        </div>

        {testResults.length > 0 && (
          <div className="bg-gray-50 border rounded p-3 max-h-60 overflow-y-auto">
            <h4 className="font-semibold text-sm mb-2">テスト結果:</h4>
            {testResults.map((result, i) => (
              <div key={i} className="text-sm font-mono mb-1">{result}</div>
            ))}
          </div>
        )}
      </div>

      {/* 統合動作テスト */}
      {audioRecording.transcribedText && (
        <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">🧪 SOAP変換テスト</h3>
          <button 
            onClick={testSoapFromTranscription}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            📄 転写テキストからSOAP生成
          </button>
        </div>
      )}
    </div>
  );
};