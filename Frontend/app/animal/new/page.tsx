"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
