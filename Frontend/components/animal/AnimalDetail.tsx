"use client";
import React, { useState, useEffect } from "react";
import type { AnimalDetailData, Record, SoapNotes, Appointment } from "@/types";
import {
  ArrowLeft,
  Home,
  FileText,
  Bone,
  Edit2,
  Check,
  X,
  Calendar,
  Loader2,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle,
  Image as ImageIcon
} from "lucide-react";
import NewRecordForm from "../record/NewRecordForm";
import Translatable from "@/components/shared/Translatable";
import { TIME_OPTIONS } from "@/lib/utils";

interface AnimalDetailProps {
  data: any;
  onBack: () => void;
  onHome: () => void;
  onSaveRecord: (
    animalId: string,
    recordData: any
  ) => Promise<void>;
  onUpdateRecord: (
    animalId: string,
    recordId: string,
    updatedRecordData: any
  ) => Promise<void>;
  appointments: { [key: string]: Appointment[] };
  onSelectAnimal: (microchipNumber: string) => void;
  onAppointmentsUpdate?: () => void;
}

const AnimalDetail: React.FC<AnimalDetailProps> = ({
  data,
  onBack,
  onHome,
  onSaveRecord,
  onUpdateRecord,
  appointments,
  onSelectAnimal,
  onAppointmentsUpdate,
}) => {
  // デバッグ用 - レンダリング時刻を表示
  const [renderTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    console.log("🚀 AnimalDetail コンポーネントが再レンダリングされました:", renderTime);
    if (data) {
      console.log("📊 完全なデータ構造:", JSON.stringify(data, null, 2));
    }
  }, [data, renderTime]);

  if (!data) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 md:p-6 animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={onBack}
            className="flex items-center text-blue-600 hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> 検索結果に戻る
          </button>
          <button
            onClick={onHome}
            className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
          >
            <Home className="mr-1 h-4 w-4" /> ホームへ
          </button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-2" />
            <p className="text-gray-600">データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  const { animal, records = [], summary = "" } = data;
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editedSoap, setEditedSoap] = useState<SoapNotes | null>(null);
  const [editedNextVisitDate, setEditedNextVisitDate] = useState<string>("");
  const [editedNextVisitTime, setEditedNextVisitTime] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // 病歴サマリーを生成する関数
  const generateMedicalSummary = (records: any[]) => {
    if (!records || records.length === 0) return null;

    const sortedRecords = [...records].sort(
      (a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
    );

    const recentRecords = sortedRecords.slice(0, 5);
    const issues = new Set<string>();
    const treatments = new Set<string>();

    recentRecords.forEach((record) => {
      const assessment = record.soap?.assessment || record.soap?.a || '';
      const plan = record.soap?.plan || record.soap?.p || '';
      
      if (assessment && assessment.trim() !== '異常なし。' && assessment.trim() !== '異常なし' && assessment.trim() !== '') {
        issues.add(assessment);
      }
      
      if (plan && plan.trim() !== '経過観察。' && plan.trim() !== '経過観察' && plan.trim() !== '') {
        treatments.add(plan);
      }
    });

    return {
      totalRecords: records.length,
      recentRecords,
      issues: Array.from(issues).slice(0, 4),
      treatments: Array.from(treatments).slice(0, 3)
    };
  };

  const medicalSummary = generateMedicalSummary(records);

  const handleStartEdit = (record: any) => {
    setEditingRecordId(record.id);
    const convertedSoap = {
      s: (record.soap?.subjective || record.soap?.s || '') as string,
      o: (record.soap?.objective || record.soap?.o || '') as string,
      a: (record.soap?.assessment || record.soap?.a || '') as string,
      p: (record.soap?.plan || record.soap?.p || '') as string
    };
    setEditedSoap(convertedSoap);
   
    if (record.next_visit_date) {
      try {
        if (record.next_visit_date.includes("T")) {
          const [date, timeWithSeconds] = record.next_visit_date.split("T");
          const time = timeWithSeconds.substring(0, 5);
          setEditedNextVisitDate(date);
          setEditedNextVisitTime(time);
        } else if (record.next_visit_date.includes(" ")) {
          const [date, time] = record.next_visit_date.split(" ");
          setEditedNextVisitDate(date);
          setEditedNextVisitTime(time.substring(0, 5));
        } else {
          setEditedNextVisitDate(record.next_visit_date);
          setEditedNextVisitTime("");
        }
      } catch (error) {
        console.error("日付解析エラー:", error);
        setEditedNextVisitDate("");
        setEditedNextVisitTime("");
      }
    } else {
      setEditedNextVisitDate("");
      setEditedNextVisitTime("");
    }
  };

  const handleCancelEdit = () => {
    setEditingRecordId(null);
    setEditedSoap(null);
    setEditedNextVisitDate("");
    setEditedNextVisitTime("");
  };

  const handleUpdateSave = async (recordId: string, originalRecord: any) => {
    if (!editedSoap) return;
    setIsUpdating(true);

    const fullNextVisitDate =
      editedNextVisitDate
        ? (editedNextVisitTime ? `${editedNextVisitDate}T${editedNextVisitTime}` : editedNextVisitDate)
        : null;

    // BackendのSoapNotes(s,o,a,p)に合わせて送信
    const convertedSoap = {
      s: editedSoap.s || '',
      o: editedSoap.o || '',
      a: editedSoap.a || '',
      p: editedSoap.p || ''
    };

    const updatedRecord: any = {
      ...originalRecord,
      soap: convertedSoap,
      next_visit_date: fullNextVisitDate,
    };

    await onUpdateRecord(animal.microchip_number, recordId, updatedRecord);

    setIsUpdating(false);
    handleCancelEdit();
  };

  const handleSoapEdit = (field: keyof SoapNotes, value: string) => {
    setEditedSoap((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  // 画像を検証・表示する関数
  const renderImages = (rec: any) => {
    console.log("🖼️ 画像レンダリング開始 - Record ID:", rec.id);
    console.log("📸 Record全体:", JSON.stringify(rec, null, 2));
    
    // 可能性のある画像フィールドをチェック
    const imageFields = ['images', 'image', 'photo', 'photos', 'attachments'];
    let foundImages: string[] = [];

    imageFields.forEach(field => {
      if (rec[field]) {
        console.log(`🔍 フィールド '${field}' 発見:`, rec[field]);
        
        if (Array.isArray(rec[field])) {
                      const validImages = rec[field].filter((img: any) => {
            if (typeof img === 'string' && img.trim()) {
              // 開発環境ではplaceholder画像も表示する
              if (process.env.NODE_ENV === 'development' || !img.includes('placeholder')) {
                console.log("✅ 有効な画像URL:", img);
                return true;
              }
            }
            console.log("❌ 無効な画像:", img);
            return false;
          });
          foundImages.push(...validImages);
        } else if (typeof rec[field] === 'string' && rec[field].trim()) {
          // 開発環境ではplaceholder画像も表示する
          if (process.env.NODE_ENV === 'development' || !rec[field].includes('placeholder')) {
            console.log("✅ 単一画像URL:", rec[field]);
            foundImages.push(rec[field]);
          }
        }
      }
    });

    console.log("📊 最終的に表示する画像:", foundImages);

    if (foundImages.length === 0) {
      console.log("❌ 表示可能な画像が見つかりませんでした");
      return null;
    }

    return (
      <div className="mt-4 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center mb-3">
          <ImageIcon className="h-5 w-5 text-blue-600 mr-2" />
          <p className="font-semibold text-gray-800">診療画像 ({foundImages.length}枚)</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {foundImages.map((imageUrl: string, index: number) => {
            console.log(`🖼️ 画像 ${index + 1} を表示:`, imageUrl);
            return (
              <div key={index} className="relative group">
                <img
                  src={imageUrl.includes('placeholder') 
                    ? 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDYwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0yNDAgMjAwSDM2MFYzMjBIMjQwVjIwMFoiIGZpbGw9IiM5Q0E2QUYiLz4KPHBhdGggZD0iTTI2MCAyMDBIMzQwVjI2MEgyNjBWMjAwWiIgZmlsbD0iIzZCNzI4MCIvPgo8Y2lyY2xlIGN4PSIyODAiIGN5PSIyMjAiIHI9IjEwIiBmaWxsPSIjOUM5OTk5Ii8+CjwvcmVnPgo8dGV4dCB4PSIzMDAiIHk9IjIxMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNkI3MjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7nlLvlg4g8L3RleHQ+CjwvcGc+' 
                    : imageUrl
                  }
                  alt={`診療画像 ${index + 1}`}
                  className="w-full h-24 object-cover rounded-md border-2 border-gray-200 hover:border-blue-400 transition-colors cursor-pointer"
                  onLoad={() => console.log(`✅ 画像読み込み成功: ${imageUrl}`)}
                  onError={(e) => {
                    console.error(`❌ 画像読み込み失敗: ${imageUrl}`, e);
                    // フォールバック画像を設定
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDYwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yOTAgMTgwTDMxMCAyMDBMMzMwIDE4MEwzNTAgMjAwTDMzMCAyMjBMMzEwIDIwMEwyOTAgMjIwTDI3MCAyMDBMMjkwIDE4MFoiIGZpbGw9IiNEMUQ1REIiLz4KPHRleHQgeD0iMzAwIiB5PSIyNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI0Q5ODM4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+55S75YOI44GM6KaL44Gk44GL44KK44G+44Gb44KTPC90ZXh0Pgo8L3N2Zz4K';
                  }}
                  onClick={() => {
                    if (!imageUrl.includes('placeholder')) {
                      window.open(imageUrl, '_blank');
                    }
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-md flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                    拡大表示
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 画像を安定して抽出・表示する新関数（string/obj.url/Base64を許容・重複除外）
  const renderImagesV2 = (rec: any) => {
    const fields = ['images', 'image', 'photo', 'photos', 'attachments'];
    const urls: string[] = [];
    for (const f of fields) {
      const v = rec?.[f];
      if (!v) continue;
      const pushUrl = (u: any) => {
        const s = typeof u === 'string' ? u : (u && typeof u.url === 'string' ? u.url : null);
        if (s && s.trim() && !urls.includes(s)) urls.push(s);
      };
      if (Array.isArray(v)) {
        v.forEach(pushUrl);
      } else {
        pushUrl(v);
      }
    }
    if (urls.length === 0) return null;
    return (
      <div className="mt-4 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center mb-3">
          <ImageIcon className="h-5 w-5 text-blue-600 mr-2" />
          <p className="font-semibold text-gray-800">診療画像 ({urls.length}枚)</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {urls.map((u, i) => (
            <div key={i} className="relative group">
              <img
                src={u}
                alt={`診療画像 ${i + 1}`}
                className="w-full h-24 object-cover rounded-md border-2 border-gray-200 hover:border-blue-400 transition-colors cursor-pointer"
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                onClick={() => window.open(u, '_blank')}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-md flex items-center justify-center">
                <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">拡大表示</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 animate-fade-in">
      {/* デバッグ情報 - 開発時のみ表示 */}
      {process.env.NEXT_PUBLIC_SHOW_DEBUG === '1' && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
          <h4 className="font-bold text-yellow-800 mb-2">🔧 デバッグ情報 (最終更新: {renderTime})</h4>
          <details className="text-sm">
            <summary className="cursor-pointer text-yellow-700 font-medium mb-2">
              データ構造を確認 (クリックして展開)
            </summary>
            <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify({ animal, recordsCount: records.length, sampleRecord: records[0] }, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> 検索結果に戻る
        </button>
        <button
          onClick={onHome}
          className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
        >
          <Home className="mr-1 h-4 w-4" /> ホームへ
        </button>
      </div>

      {/* 動物詳細 */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6" data-testid="detail-view">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{animal?.name || 'データなし'}</h2>
            <div className="space-y-1 text-gray-600">
              <p>マイクロチップ: <span className="font-medium text-gray-800">{animal?.microchip_number || 'データなし'}</span></p>
              <p>所属: <span className="font-medium text-gray-800">{animal?.farm_id || 'データなし'}</span></p>
            </div>
          </div>

          {/* 病歴概要 */}
          <div className="lg:w-1/2">
            {process.env.NEXT_PUBLIC_E2E !== '1' && medicalSummary && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-bold flex items-center mb-3 text-blue-800">
                  <Activity className="mr-2 h-4 w-4" /> 病歴概要
                </h4>
                
                <div className="space-y-4 text-sm">
                  <div className="flex items-center text-blue-700">
                    <Clock className="mr-2 h-4 w-4" />
                    <span className="font-medium">総診療回数: {medicalSummary.totalRecords}回</span>
                  </div>

                  {medicalSummary.issues.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-blue-800 flex items-center mb-2">
                        <AlertTriangle className="mr-2 h-4 w-4 text-orange-600" />
                        主な診断
                      </h5>
                      <div className="space-y-2 ml-6">
                        {medicalSummary.issues.map((issue, index) => (
                          <p key={index} className="text-blue-700 text-sm leading-relaxed">• {issue}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {medicalSummary.treatments.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-blue-800 flex items-center mb-2">
                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                        主な治療方針
                      </h5>
                      <div className="space-y-2 ml-6">
                        {medicalSummary.treatments.map((treatment, index) => (
                          <p key={index} className="text-blue-700 text-sm leading-relaxed">• {treatment}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-blue-200">
                    <p className="text-sm text-blue-600 font-medium">
                      最終診療: {medicalSummary?.recentRecords[0]?.visit_date || '記録なし'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 新規記録フォーム */}
      <NewRecordForm
        onSave={(recordData) =>
          onSaveRecord(animal.microchip_number || '', recordData)
        }
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
        appointments={appointments}
        onSelectAnimal={onSelectAnimal}
        onAppointmentsUpdate={onAppointmentsUpdate}
      />

      {/* 記録一覧 */}
      <div className="mt-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          過去の診療記録
        </h3>
        <div className="space-y-4">
          {records.length > 0 ? (
            [...records]
              .sort(
                (a, b) =>
                  new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
              )
              .map((rec: any) => (
                <div
                  key={rec.id}
                  className={`bg-white p-5 rounded-lg shadow-sm border border-gray-200 transition-all ${
                    editingRecordId === rec.id
                      ? "bg-blue-50 border-blue-400 ring-2 ring-blue-300"
                      : ""
                  }`}
                >
                  {/* 記録ヘッダー */}
                  <div className="flex justify-between items-center mb-3">
                    <p className="font-bold text-lg text-gray-800">
                      {rec.visit_date}
                    </p>
                    {editingRecordId === rec.id ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleUpdateSave(rec.id, rec)}
                          disabled={isUpdating}
                          className="bg-green-600 text-white p-2 rounded-full shadow hover:bg-green-700 transition disabled:bg-green-300 flex items-center justify-center w-10 h-10"
                          data-testid="btn-save-record"
                        >
                          {isUpdating ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Check className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isUpdating}
                          className="bg-red-500 text-white p-2 rounded-full shadow hover:bg-red-600 transition disabled:bg-red-300"
                          data-testid="btn-cancel-edit"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(rec)}
                        className="bg-gray-200 text-gray-700 p-2 rounded-full shadow-sm hover:bg-gray-300 transition"
                        data-testid="btn-edit-record"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* 編集モード */}
                  {editingRecordId === rec.id ? (
                    <div className="space-y-4 animate-fade-in">
                      <div className="space-y-2">
                        {Object.entries(editedSoap || {}).map(([key, value]) => (
                          <div key={key}>
                            <label className="font-semibold text-gray-800 uppercase text-sm">
                              {key}
                            </label>
                            <textarea
                              value={value}
                              onChange={(e) =>
                                handleSoapEdit(
                                  key as keyof SoapNotes,
                                  e.target.value
                                )
                              }
                              className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-800"
                              data-testid={`edit-soap-${String(key)}`}
                              rows={key === "s" || key === "o" ? 3 : 2}
                            />
                          </div>
                        ))}
                      </div>
                      {/* 次回診療予定 */}
                      <div className="space-y-1">
                        <label
                          htmlFor="edit-next-visit-date"
                          className="font-semibold text-gray-800 flex items-center text-sm"
                        >
                          <Calendar className="mr-2 h-4 w-4" /> 次回診療予定日
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="date"
                            id="edit-next-visit-date"
                            value={editedNextVisitDate}
                            onChange={(e) =>
                              setEditedNextVisitDate(e.target.value)
                            }
                            className="w-1/2 p-2 border border-gray-300 rounded-md text-gray-800"
                          />
                          <select
                            id="edit-next-visit-time"
                            value={editedNextVisitTime}
                            onChange={(e) =>
                              setEditedNextVisitTime(e.target.value)
                            }
                            className="w-1/2 p-2 border border-gray-300 rounded-md text-gray-800"
                          >
                            <option value="">時間を選択</option>
                            {TIME_OPTIONS.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mt-2 space-y-2 text-sm">
                        <p className="text-gray-800">
                          <strong className="text-gray-800 uppercase font-bold">S:</strong>{" "}
                          <Translatable text={(rec.soap?.subjective || rec.soap?.s || '') as string} />
                        </p>
                        <p className="text-gray-800">
                          <strong className="text-gray-800 uppercase font-bold">O:</strong>{" "}
                          <Translatable text={(rec.soap?.objective || rec.soap?.o || '') as string} />
                        </p>
                        <p className="text-gray-800">
                          <strong className="text-gray-800 uppercase font-bold">A:</strong>{" "}
                          <Translatable text={(rec.soap?.assessment || rec.soap?.a || '') as string} />
                        </p>
                        <p className="text-gray-800">
                          <strong className="text-gray-800 uppercase font-bold">P:</strong>{" "}
                          <Translatable text={(rec.soap?.plan || rec.soap?.p || '') as string} />
                        </p>
                      </div>
                      
                      {/* 画像表示 - 新しい関数を使用 */}
                      {renderImagesV2(rec)}
                      
                      {rec.next_visit_date && (
                        <div className="mt-4 p-3 bg-purple-100 border-l-4 border-purple-500 rounded-r-lg">
                          <div className="flex items-center">
                            <Calendar className="h-5 w-5 text-purple-700 mr-2" />
                            <span className="text-sm font-semibold text-purple-900">
                              次回予定: {rec.next_visit_date.includes("T") ? rec.next_visit_date.replace("T", " ") : rec.next_visit_date}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <Bone className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-800">
                この個体の診療記録はまだありません。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnimalDetail;
