"use client";

import React, { useState, useRef, useEffect } from "react";
import {
    Loader2,
    AlertCircle,
    CheckCircle,
    Camera,
    Upload,
    Sparkles,
    ArrowLeft
} from "lucide-react";
import type { SoapNotes, Appointment } from "@/types";
import { useRouter } from "next/navigation";
import { formatFileSize, fileToBase64, getApiUrl } from "@/lib/utils"; // ユーティリティ関数の移動を想定（またはここで再定義）

// 型定義の再利用
interface NewRecordFormProps {
    onBack: () => void;
    onSave: (recordData: any) => Promise<void>;
    isLoading: boolean;
    error: string;
    setError: (error: string) => void;
    searchTerm?: string;
}

// ユーティリティ再定義（本来はlib/utils.tsへ移動推奨）
const isAudioFile = (filename: string): boolean => {
    const audioExtensions = ['.wav', '.mp3', '.ogg', '.webm', '.flac', '.m4a'];
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return audioExtensions.includes(extension);
};

// ... (NewRecordFormの内容をNext.jsページに適応)
// ここでは既存のNewRecordFormコンポーネントをimportして使う形にするのが綺麗ですが、
// ユーザーの要望は「構造の修正」なので、ページコンポーネントとしてラップします。

import NewAnimalForm from "@/components/animal/NewAnimalForm";
import { api } from "@/lib/api";
import { updateAppointments } from "@/lib/dataService";

export default function NewAnimalPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSaveNewAnimal = async (animalData: any) => {
        setIsLoading(true);
        setError("");
        try {
            await api.createAnimal(animalData);
            await updateAppointments();
            // 新規作成後はその動物の詳細ページへ遷移
            router.push(`/animal/${animalData.microchip_number}`);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <div className="container mx-auto px-4 py-8">
                <NewAnimalForm
                    onBack={() => router.push("/")}
                    onSave={handleSaveNewAnimal}
                    searchTerm=""
                    isLoading={isLoading}
                    error={error}
                    setError={setError}
                />
            </div>
        </div>
    );
}
