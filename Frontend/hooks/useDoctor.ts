"use client";
import { useEffect, useState } from "react";

export function useDoctor() {
  const [doctor, setDoctor] = useState<string>("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("doctorName");
      if (saved) setDoctor(saved);
    } catch {}
  }, []);

  const saveDoctor = (name: string) => {
    setDoctor(name);
    try { localStorage.setItem("doctorName", name); } catch {}
  };

  return { doctor, setDoctor: saveDoctor } as const;
}

