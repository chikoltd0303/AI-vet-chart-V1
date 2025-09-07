"use client";
import React, { useState, useEffect } from "react";
import { useDoctor } from "@/hooks/useDoctor";

export default function DoctorSelector() {
  const { doctor, setDoctor } = useDoctor();
  const [value, setValue] = useState(doctor);
  useEffect(() => setValue(doctor), [doctor]);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-900 font-medium">担当獣医:</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => setDoctor(value.trim())}
        placeholder="例: Dr. Sato"
        className="border border-gray-500 rounded px-2 py-1 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {doctor && <span className="text-gray-900">（保存済み）</span>}
    </div>
  );
}
