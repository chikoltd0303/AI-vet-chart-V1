"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { AnimalDetailData, Appointment, Record } from "@/types";
import { api } from "@/lib/api";
import { updateAppointments } from "@/lib/dataService";
import AnimalDetail from "@/components/animal/AnimalDetail";
import { Loader2 } from "lucide-react";

export default function AnimalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const animalId = decodeURIComponent(params?.id || "");

  const [data, setData] = useState<AnimalDetailData | null>(null);
  const [appointments, setAppointments] = useState<{ [key: string]: Appointment[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [detail, appts] = await Promise.all([
        api.fetchAnimalDetail(animalId),
        updateAppointments(),
      ]);
      setData(detail);
      setAppointments(appts);
    } catch (e) {
      setError("詳細の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (animalId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animalId]);

  const handleSaveRecord = async (
    microchip_number: string,
    recordData: Omit<Record, "id" | "visit_date">
  ) => {
    setLoading(true);
    setError("");
    try {
      await api.createRecord({
        animalId: microchip_number,
        // @ts-ignore 既存型の差異はサーバ側で受付
        soap: recordData.soap,
      });
      const refreshed = await api.fetchAnimalDetail(microchip_number);
      setData(refreshed);
      setAppointments(await updateAppointments());
    } catch (e) {
      setError("記録の保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRecord = async (
    microchip_number: string,
    recordId: string,
    updatedRecordData: Record
  ) => {
    setLoading(true);
    setError("");
    try {
      await api.updateRecord(recordId, updatedRecordData as any);
      const refreshed = await api.fetchAnimalDetail(microchip_number);
      setData(refreshed);
      setAppointments(await updateAppointments());
    } catch (e) {
      setError("記録の更新に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-100 min-h-screen font-sans">
        <div className="container mx-auto px-4 py-8 flex justify-center items-center h-96">
          <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-100 min-h-screen font-sans">
        <div className="container mx-auto px-4 py-8">
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen font-sans">
      <div className="container mx-auto px-4 py-8">
        <AnimalDetail
          data={data}
          onBack={() => router.push("/")}
          onHome={() => router.push("/")}
          onSaveRecord={handleSaveRecord}
          onUpdateRecord={handleUpdateRecord}
          appointments={appointments}
          onSelectAnimal={(id) => router.push(`/animal/${encodeURIComponent(id)}`)}
        />
      </div>
    </div>
  );
}

