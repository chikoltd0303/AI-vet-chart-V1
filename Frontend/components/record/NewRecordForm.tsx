"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { SoapNotes, Appointment } from "@/types";
import { Mic, MicOff, Upload, Loader2, Calendar as CalendarIcon, Save, Camera, X, Sparkles } from "lucide-react";
import MiniCalendar from "@/components/calendar/MiniCalendar";
import VetCalendar from "@/components/calendar/VetCalendar";
import { TIME_OPTIONS } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAudioRecording } from "@/hooks/useAudioRecording";

interface NewRecordFormProps {
  onSave: (recordData: {
    soap: SoapNotes;
    images?: File[];
    nextVisitDate?: string;
    nextVisitTime?: string;
    // 拡張: medications/nosai_points も受け渡す
    medications?: { name: string; dose?: string; route?: string }[];
    nosai_points?: number;
  }) => Promise<void>;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  appointments: { [key: string]: Appointment[] };
  onSelectAnimal: (microchipNumber: string) => void;
  selectedMicrochip?: string;
  onAppointmentsUpdate?: () => void;
}

const NewRecordForm: React.FC<NewRecordFormProps> = (
  {
    onSave,
    isProcessing,
    setIsProcessing,
    appointments,
    onSelectAnimal,
    selectedMicrochip,
    onAppointmentsUpdate,
  }
) => {
  const todayDate = React.useMemo(() => new Date(), []);
  // SOAP 入力
  const [soap, setSoap] = useState<SoapNotes>({ s: "", o: "", a: "", p: "" });
  const [errors, setErrors] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 音声・STT（フックで機能集約）
  const {
    isRecording,
    audioFile,
    transcribedText,
    isTranscribing,
    isProcessingAudio,
    startRecording,
    stopRecording,
    startSpeechRecognition,
    stopSpeechRecognition,
    handleAudioFileChange,
    removeAudioFile,
    setTranscribedText,
  } = useAudioRecording(setErrors);

  // 画像アップロード/撮影
  const [images, setImages] = useState<File[]>([]);
  const [medications, setMedications] = useState<{ name: string; dose?: string; route?: string }[]>([]);
  const [nosaiPoints, setNosaiPoints] = useState<number | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);

  // 次回予約
  const [nextVisitDate, setNextVisitDate] = useState<string>("");
  const [nextVisitTime, setNextVisitTime] = useState<string>("");
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarMode, setCalendarMode] = useState<'list' | 'month'>("list");

  // バリデーション
  const validateForm = () => {
    const e: string[] = [];
    if (!soap.s && !soap.o && !soap.a && !soap.p) {
      e.push("最低でも1つのSOAP項目（S/O/A/P）を入力してください。");
    }
    if (false && nextVisitDate && !nextVisitTime) {
      e.push("次回予約日を設定した場合、時間も選択してください。");
    }
    if (nextVisitTime && !nextVisitDate) {
      e.push("次回予約時間を設定した場合、日付も選択してください。");
    }
    return e;
  };

  // カメラ制御
  const startCamera = async () => {
    setIsCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "environment" },
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setErrors([]);
    } catch (err) {
      console.error("カメラ起動エラー:", err);
      setErrors(["カメラへのアクセスが許可されていません。ブラウザの設定を確認してください。"]);
      setIsCameraOpen(false);
    } finally {
      setIsCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraOpen(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setErrors(["カメラまたはキャンバスの準備ができていません。"]);
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setErrors(["キャンバスコンテキストを取得できませんでした。"]); return; }
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      setErrors(["ビデオの準備ができていません。少し待ってからもう一度お試しください。"]); return;
    }
    const w = video.videoWidth || video.clientWidth;
    const h = video.videoHeight || video.clientHeight;
    if (!w || !h) { setErrors(["ビデオサイズを取得できませんでした。"]); return; }
    canvas.width = w; canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await new Promise<void>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("toBlob失敗"));
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
        if (images.length >= 10) { setErrors(["画像は最大10枚まで撮影できます。"]); return resolve(); }
        setImages((prev) => [...prev, file]);
        resolve();
      }, "image/jpeg", 0.9);
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024);
    if (valid.length + images.length > 10) {
      setErrors(["画像は最大10枚まで選択できます。"]); return;
    }
    setImages((prev) => [...prev, ...valid]);
    setErrors([]);
  };

  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));

  // AI: テキスト→SOAP 変換
  const handleConvertToSoap = async () => {
    if (!transcribedText.trim()) {
      setErrors(["転写テキストがありません。"]); return;
    }
    setErrors([]);
    try {
      const result = await api.generateSoapFromText(transcribedText.trim());
      const s: SoapNotes = (result as any).soap_notes || (result as any);
      setSoap(s);
    } catch (e: any) {
      setErrors([`自動変換エラー: ${e.message || e}`]);
    }
  };

  // 送信
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const e = validateForm();
    if (e.length) { setErrors(e); return; }
    setErrors([]);
    setIsProcessing(true);
    try {
      await onSave({
        soap,
        images: images.length ? images : undefined,
        nextVisitDate: nextVisitDate || undefined,
        nextVisitTime: nextVisitTime || undefined,
        medications: medications.length ? medications : undefined,
        nosai_points: nosaiPoints,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      if (nextVisitDate && nextVisitTime && onAppointmentsUpdate) onAppointmentsUpdate();
      // 時刻未選択でも更新をトリガー
      if (nextVisitDate && onAppointmentsUpdate) onAppointmentsUpdate();
      // reset
      setSoap({ s: "", o: "", a: "", p: "" });
      setImages([]);
      setTranscribedText("");
      setMedications([]);
      setNosaiPoints(undefined);
      setNextVisitDate("");
      setNextVisitTime("");
      stopCamera();
      stopSpeechRecognition();
    } catch (err: any) {
      setErrors([`保存に失敗しました: ${err.message ?? err}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-4">新しい診療記録</h3>

      {/* エラー表示 */}
      {errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="text-red-800 font-medium mb-1">エラー</div>
          <ul className="list-disc list-inside text-sm text-red-700">
            {errors.map((er, i) => (<li key={i}>{er}</li>))}
          </ul>
        </div>
      )}

      {/* 完了表示 */}
      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800">
          記録が正常に保存されました
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 音声（録音/リアルタイム認識/音声ファイル） */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800">音声入力</h4>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={isTranscribing ? stopSpeechRecognition : startSpeechRecognition}
              className={`flex items-center px-4 py-2 rounded-md transition ${isTranscribing ? "bg-red-600 text-white hover:bg-red-700" : "bg-purple-600 text-white hover:bg-purple-700"}`}>
              {isTranscribing ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
              {isTranscribing ? "認識停止" : "リアルタイム認識"}
            </button>
            <button type="button" onClick={isRecording ? stopRecording : startRecording}
              className={`flex items-center px-4 py-2 rounded-md transition ${isRecording ? "bg-red-600 text-white hover:bg-red-700" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
              {isRecording ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
              {isRecording ? "録音停止" : "録音して文字起こし"}
            </button>
            <label className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md cursor-pointer hover:bg-gray-700 transition">
              <Upload className="mr-2 h-4 w-4" /> 音声ファイル選択
              <input type="file" accept="audio/*" onChange={handleAudioFileChange} className="hidden" />
            </label>
          </div>

          {isTranscribing && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-md text-purple-800">
              <Loader2 className="mr-2 h-4 w-4 inline animate-spin" /> 音声認識中... 話してください
            </div>
          )}
          {isProcessingAudio && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-800">
              <Loader2 className="mr-2 h-4 w-4 inline animate-spin" /> 音声ファイルを処理中...
            </div>
          )}

          {audioFile && (
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-800">選択されたファイル: {audioFile.name}</p>
                <button type="button" onClick={removeAudioFile} className="text-red-600 hover:text-red-800 text-sm font-medium">削除</button>
              </div>
              <audio controls className="mt-2 w-full">
                <source src={URL.createObjectURL(audioFile)} type={audioFile.type} />
                お使いのブラウザは音声の再生をサポートしていません。
              </audio>
            </div>
          )}

          {/* 転写テキスト */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-800">転写テキスト</h4>
              {transcribedText.trim() && (
                <button type="button" onClick={handleConvertToSoap} className="flex items-center px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition text-sm disabled:bg-purple-300 disabled:cursor-not-allowed">
                  <Sparkles className="mr-2 h-4 w-4" /> AIでSOAP変換
                </button>
              )}
            </div>
            <textarea value={transcribedText} onChange={(e) => setTranscribedText(e.target.value)} rows={4}
              className="w-full p-2 border border-gray-300 rounded-md block font-semibold text-gray-800 text-sm"
              placeholder="ここに音声認識結果が表示、または手動で入力します" />
          </div>
        </div>

        {/* 投薬（薬剤名/用量/投与ルート） */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-800">投薬</h4>
          <div className="space-y-2">
            {medications.map((m, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <input value={m.name} onChange={(e) => {
                  const v = [...medications]; v[idx] = { ...v[idx], name: e.target.value }; setMedications(v);
                }} placeholder="薬剤名" className="md:col-span-5 border rounded p-2 text-sm" />
                <input value={m.dose || ''} onChange={(e) => {
                  const v = [...medications]; v[idx] = { ...v[idx], dose: e.target.value }; setMedications(v);
                }} placeholder="用量(例: 5mg/kg)" className="md:col-span-4 border rounded p-2 text-sm" />
                <select value={m.route || ''} onChange={(e) => {
                  const v = [...medications]; v[idx] = { ...v[idx], route: e.target.value }; setMedications(v);
                }} className="md:col-span-2 border rounded p-2 text-sm">
                  <option value="">投与ルート</option>
                  <option value="PO">PO(経口)</option>
                  <option value="IM">IM(筋注)</option>
                  <option value="IV">IV(静注)</option>
                  <option value="SC">SC(皮下)</option>
                </select>
                <button type="button" onClick={() => setMedications(medications.filter((_, i) => i !== idx))} className="md:col-span-1 text-red-600 text-sm">削除</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setMedications([...medications, { name: '' }])} className="px-3 py-1 bg-gray-100 border rounded text-sm">投薬を追加</button>
        </div>

        {/* NOSAI 点数（オプション） */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-800">NOSAI（任意）</h4>
          <input type="number" min={0} value={nosaiPoints ?? ''} onChange={(e) => setNosaiPoints(e.target.value === '' ? undefined : Number(e.target.value))} className="border rounded p-2 w-40 text-sm" placeholder="治療点数" />
        </div>

        {/* 画像（撮影/アップロード/プレビュー） */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800">診療画像（最大10枚、各5MB以下）</h4>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={isCameraOpen ? stopCamera : startCamera}
              disabled={isCameraLoading || images.length >= 10}
              className={`flex items-center px-4 py-2 rounded-md transition ${isCameraOpen ? "bg-red-600 text-white hover:bg-red-700" : "bg-green-600 text-white hover:bg-green-700"} ${(isCameraLoading || images.length >= 10) ? "opacity-50 cursor-not-allowed" : ""}`}>
              {isCameraLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />} {isCameraOpen ? "カメラ停止" : "カメラで撮影"}
            </button>
            <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition">
              <Upload className="mr-2 h-4 w-4" /> ファイルから選択({images.length}/10)
              <input type="file" accept="image/*" multiple onChange={handleImageChange} disabled={images.length >= 10} className="hidden" />
            </label>
          </div>
          {isCameraOpen && (
            <div className="space-y-3">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-md mx-auto block" />
                <canvas ref={canvasRef} className="hidden" />
                <button type="button" onClick={capturePhoto} disabled={images.length >= 10}
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-gray-300 hover:border-blue-500 transition disabled:opacity-50 flex items-center justify-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                </button>
                <button type="button" onClick={stopCamera}
                  className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition">
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute top-4 right-14 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">{images.length}/10</div>
              </div>
              <p className="text-sm text-gray-700 text-center">カメラを被写体に向けて、下のボタンで撮影してください</p>
            </div>
          )}
          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((img, index) => (
                <div key={index} className="relative">
                  <img src={URL.createObjectURL(img)} alt={`選択画像${index + 1}`} className="w-full h-24 object-cover rounded-md" />
                  <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SOAP 入力 */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800">診療ノート</h4>
          {Object.entries(soap).map(([key, value]) => (
            <div key={key}>
              <label className="w-full block font-semibold text-gray-800 text-sm mb-1">
                {key.toUpperCase()}: {key === "s" ? "Subjective (主観情報)" : key === "o" ? "Objective (客観情報)" : key === "a" ? "Assessment (評価・診断)" : "Plan (計画・治療)"}
              </label>
              <textarea
                value={value}
                onChange={(e) => setSoap((prev) => ({ ...prev, [key]: e.target.value }))}
                className="w-full block font-semibold text-gray-800 text-sm mb-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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
                <CalendarIcon className="inline h-4 w-4 mr-1" /> 予定日
              </label>
              <input type="date" value={nextVisitDate} onChange={(e) => setNextVisitDate(e.target.value)} min={today}
                className="w-full block font-semibold text-gray-800 text-sm mb-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">予定時間</label>
              <select value={nextVisitTime} onChange={(e) => setNextVisitTime(e.target.value)}
                className="w-full block font-semibold text-gray-800 text-sm mb-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                <option value="">時間を選択</option>
                {TIME_OPTIONS.map((time) => {
                  const existingAppointments = nextVisitDate ? appointments[nextVisitDate] || [] : [];
                  const isTimeBooked = existingAppointments.some((apt) => apt.time === time);
                  return (
                    <option key={time} value={time} disabled={isTimeBooked}>
                      {time} {isTimeBooked ? "（予約済み）" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-start gap-2 md:gap-3">
            <MiniCalendar appointments={appointments} selectedDate={nextVisitDate || today} onDateChange={(d) => setNextVisitDate(d)} currentDate={todayDate} />
            <button
              type="button"
              onClick={() => setShowCalendarModal(true)}
              className="h-9 md:h-10 px-3 mt-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition w-full md:w-auto"
            >
              カレンダー拡大
            </button>
          </div>

          {showCalendarModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowCalendarModal(false)} />
              <div className="relative bg-white w-screen h-screen md:w-[95vw] md:max-w-4xl md:max-h-[90vh] md:h-auto rounded-none md:rounded-lg shadow-lg p-2 md:p-4 overflow-auto">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-base md:text-lg font-bold text-gray-900">スケジュール（拡大表示）</h3>
                  <button onClick={() => setShowCalendarModal(false)} className="text-gray-600 hover:text-black text-xl leading-none">×</button>
                </div>
                <div className="mb-2 flex gap-2">
                  <button
                    type="button"
                    className={`px-3 py-1 rounded border ${calendarMode === 'list' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-800 border-gray-300'}`}
                    onClick={() => setCalendarMode('list')}
                  >一覧</button>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded border ${calendarMode === 'month' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-800 border-gray-300'}`}
                    onClick={() => setCalendarMode('month')}
                  >月表示</button>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNextVisitDate(today)}
                      className="px-3 py-1 rounded bg-gray-100 text-gray-800 hover:bg-gray-200"
                    >今日へ</button>
                  </div>
                </div>
                {calendarMode === 'list' ? (
                  <div className="border rounded-md p-2 text-[15px] md:text-base">
                    <h4 className="font-semibold mb-2">{(nextVisitDate || today)} の予定</h4>
                    <div className="max-h-[70vh] overflow-auto divide-y">
                      {((appointments[nextVisitDate || today] || []) as any[]).length > 0 ? (
                        ((appointments[nextVisitDate || today] || []) as any[])
                          .slice()
                          .sort((a: any, b: any) => (a.time || '').localeCompare(b.time || ''))
                          .map((app: any, idx: number) => (
                            <div key={idx} className="py-2">
                              <div className="text-blue-700 font-semibold">
                                {(app.time ? `${app.time} ` : "") + (app.animal_name || "")}
                              </div>
                              {app.farm_id && (
                                <div className="text-[13px] text-gray-700">{app.farm_id}</div>
                              )}
                            </div>
                          ))
                      ) : (
                        <div className="py-6 text-center text-gray-600">この日に予定はありません</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-md p-2">
                    <VetCalendar
                      onBack={() => setShowCalendarModal(false)}
                      onHome={() => setShowCalendarModal(false)}
                      appointments={appointments}
                      onDateClick={(d: string) => setNextVisitDate(d)}
                      currentDate={todayDate}
                      compact={true}
                      maxPerDay={2}
                      showFarm={true}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 送信ボタン */}
        <div className="flex justify-end space-x-3">
          <button type="button" onClick={() => { setSoap({ s: "", o: "", a: "", p: "" }); setImages([]); setTranscribedText(""); setNextVisitDate(""); setNextVisitTime(""); stopCamera(); stopSpeechRecognition(); setErrors([]); }}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition">
            リセット
          </button>
          <button type="submit" disabled={isProcessing}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:bg-blue-300 disabled:cursor-not-allowed">
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isProcessing ? "保存中..." : "診療記録を保存"}
          </button>
        </div>
        {/* 画像選択（カメラ対応） */}
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-800 mb-1">画像を追加</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-800 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-800 hover:file:bg-gray-200"
          />
        </div>

      </form>
    </div>
  );
};

export default NewRecordForm;


