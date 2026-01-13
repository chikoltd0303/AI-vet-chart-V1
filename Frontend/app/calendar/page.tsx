"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import VetCalendar from "@/components/calendar/VetCalendar";
import { updateAppointments } from "@/lib/dataService";
import { Appointment } from "@/types";
import { Loader2 } from "lucide-react";

export default function CalendarPage() {
    const router = useRouter();
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
                <VetCalendar
                    onBack={() => router.push("/")}
                    onHome={() => router.push("/")}
                    appointments={appointments}
                    onDateClick={(date) => router.push(`/calendar/${date}`)}
                    currentDate={new Date()}
                    showFarm={true}
                />
            </div>
        </div>
    );
}
