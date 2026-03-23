"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ANALYSIS_STORAGE_KEY } from "@/lib/constants";
import type { AnalysisResult } from "@/lib/types";
import ResultCard from "@/components/ResultCard";

export default function ResultPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(ANALYSIS_STORAGE_KEY);

    if (!raw) {
      router.replace("/");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as AnalysisResult;
      setData(parsed);
    } catch {
      router.replace("/");
    }
  }, [router]);

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>결과를 불러오는 중입니다...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">마케팅 전략 진단</h1>
      <ResultCard data={data} />
    </main>
  );
}
