// components/shared/AudioRecordingTest.tsx
import React, { useState } from 'react';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { Mic, MicOff, Upload, Loader2, AlertCircle, Trash2 } from 'lucide-react';

// 新フックをテストする簡単なコンポーネント
export const AudioRecordingTest: React.FC = () => {
  const [errors, setErrors] = useState<string[]>([]);
  const audioRecording = useAudioRecording(setErrors);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 border border-gray-300 rounded-lg bg-white shadow-sm max-w-2xl">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        Audio Recording Hook Test
      </h3>
      
      {/* エラー表示 */}
      {errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center text-red-800 font-medium mb-2">
            <AlertCircle className="h-4 w-4 mr-2" />
            エラー
          </div>
          <div className="text-sm text-red-700">
            {errors.map((error, index) => (
              <div key={index}>• {error}</div>
            ))}
          </div>
        </div>
      )}

      {/* 音声操作ボタン */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={audioRecording.isTranscribing ? audioRecording.stopSpeechRecognition : audioRecording.startSpeechRecognition}
          className={`flex items-center px-4 py-2 rounded-md transition ${
            audioRecording.isTranscribing 
              ? "bg-red-600 text-white hover:bg-red-700" 
              : "bg-purple-600 text-white hover:bg-purple-700"
          }`}
        >
          {audioRecording.isTranscribing ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
          {audioRecording.isTranscribing ? "認識停止" : "リアルタイム認識"}
        </button>

        <button
          onClick={audioRecording.isRecording ? audioRecording.stopRecording : audioRecording.startRecording}
          className={`flex items-center px-4 py-2 rounded-md transition ${
            audioRecording.isRecording 
              ? "bg-red-600 text-white hover:bg-red-700" 
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {audioRecording.isRecording ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
          {audioRecording.isRecording ? "録音停止" : "録音して文字起こし"}
        </button>

        <label className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md cursor-pointer hover:bg-gray-700 transition">
          <Upload className="mr-2 h-4 w-4" />
          音声ファイル選択
          <input
            type="file"
            accept="audio/*"
            onChange={audioRecording.handleAudioFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* 処理状態表示 */}
      {audioRecording.isTranscribing && (
        <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
          <div className="flex items-center text-purple-800">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            音声認識中... 話してください
          </div>
        </div>
      )}

      {audioRecording.isProcessingAudio && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center text-blue-800">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            音声ファイルを処理中...
          </div>
        </div>
      )}

      {/* 音声ファイル表示 */}
      {audioRecording.audioFile && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-800">
              ファイル: {audioRecording.audioFile.name} ({formatFileSize(audioRecording.audioFile.size)})
            </p>
            <button
              onClick={audioRecording.removeAudioFile}
              className="flex items-center text-red-600 hover:text-red-800 text-sm font-medium"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              削除
            </button>
          </div>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => audioRecording.transcribeAudioFile(audioRecording.audioFile!)}
              disabled={audioRecording.isProcessingAudio}
              className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm disabled:bg-blue-300"
            >
              {audioRecording.isProcessingAudio ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : null}
              {audioRecording.isProcessingAudio ? "処理中..." : "文字起こし実行"}
            </button>
          </div>
          <audio controls className="w-full">
            <source src={URL.createObjectURL(audioRecording.audioFile)} type={audioRecording.audioFile.type} />
            お使いのブラウザは音声の再生をサポートしていません。
          </audio>
        </div>
      )}

      {/* 転写テキスト表示・編集 */}
      <div className="space-y-2">
        <label className="font-semibold text-gray-800">転写テキスト</label>
        <textarea
          value={audioRecording.transcribedText}
          onChange={(e) => audioRecording.setTranscribedText(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-800"
          rows={6}
          placeholder="ここに音声認識結果が表示されます。手動での編集も可能です。"
        />
      </div>

      {/* デバッグ情報 */}
      <details className="mt-4">
        <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
          デバッグ情報 (クリックして展開)
        </summary>
        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto text-gray-700">
          {JSON.stringify({
            isRecording: audioRecording.isRecording,
            isTranscribing: audioRecording.isTranscribing,
            isProcessingAudio: audioRecording.isProcessingAudio,
            hasAudioFile: !!audioRecording.audioFile,
            transcriptLength: audioRecording.transcribedText.length,
            hasMediaRecorder: !!audioRecording.mediaRecorder,
            hasSpeechRecognition: !!audioRecording.speechRecognition
          }, null, 2)}
        </pre>
      </details>
    </div>
  );
};