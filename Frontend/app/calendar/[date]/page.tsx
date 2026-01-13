"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DailyAppointments from "@/components/calendar/DailyAppointments";
import { updateAppointments } from "@/lib/dataService";
import { Appointment } from "@/types";
import { Loader2 } from "lucide-react";

export default function DailyAppointmentsPage() {
    const params = useParams<{ date: string }>();
    const router = useRouter();
    const date = decodeURIComponent(params?.date || "");
    const [appointments, setAppointments] = useState<{ [key: string]: Appointment[] }>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await updateAppointments();
            setAppointments(data);
            setLoading(false);
        };
        load();
    }, []);

    if (loading) {
        return (
            <div className="bg-gray-100 min-h-screen font-sans flex justify-center items-center">
                <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <div className="container mx-auto px-4 py-8">
                <DailyAppointments
                    onBack={() => router.push("/calendar")}
                    onHome={() => router.push("/")}
                    appointments={appointments[date] || []}
                    selectedDate={date}
                    onSelectAnimal={(id) => router.push(`/animal/${id}`)}
                />
            </div>
        </div>
    );
}
