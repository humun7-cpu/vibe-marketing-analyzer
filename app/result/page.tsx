"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ANALYSIS_STORAGE_KEY } from "@/lib/constants";
import type { AnalysisResult } from "@/lib/types";

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
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">결과를 불러오는 중입니다...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl bg-white px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold text-slate-900">마케팅 전략 진단</h1>
      <p className="mb-8 text-sm text-slate-500">{data.analyzedUrl}</p>

      <section className="mb-6 rounded-xl border border-slate-200 p-5">
        <h2 className="mb-3 text-xl font-semibold">기본 정보</h2>
        <p><strong>업종:</strong> {data.businessType}</p>
        <p><strong>상품/서비스:</strong> {data.productOrServiceType}</p>
        <p><strong>가격 포지셔닝:</strong> {data.pricePositioning}</p>
        <p><strong>브랜드 톤:</strong> {data.brandTone}</p>
        <p><strong>퍼널 단계:</strong> {data.funnelStage}</p>
        <p><strong>주요 전환 목표:</strong> {data.primaryConversionGoal}</p>
        <p><strong>CTA 명확도:</strong> {data.ctaClarity}</p>
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 p-5">
        <h2 className="mb-3 text-xl font-semibold">요약</h2>
        <p className="whitespace-pre-wrap">{data.industrySummary}</p>
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 p-5">
        <h2 className="mb-3 text-xl font-semibold">타겟 고객</h2>
        <p className="whitespace-pre-wrap">{data.targetAudience}</p>
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 p-5">
        <h2 className="mb-3 text-xl font-semibold">문제점 진단</h2>
        <ul className="list-disc space-y-2 pl-5">
          {data.issues.map((item, i) => (
            <li key={i}>
              <strong>[{item.category}]</strong> {item.problem} — {item.impact}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 p-5">
        <h2 className="mb-3 text-xl font-semibold">추천 광고 매체</h2>
        <ul className="space-y-4">
          {data.recommendedChannels.map((ch, i) => (
            <li key={i} className="rounded-lg border border-slate-100 p-4">
              <p><strong>{ch.channel}</strong> (적합도: {ch.fit})</p>
              <p><strong>목표:</strong> {ch.objective}</p>
              <p><strong>선정 이유:</strong> {ch.reason}</p>
              <p><strong>실행 전략:</strong> {ch.strategy}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-5">
          <h2 className="mb-3 text-xl font-semibold">즉시 실행 액션</h2>
          <ol className="list-decimal space-y-2 pl-5">
            {data.immediateActions.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl border border-slate-200 p-5">
          <h2 className="mb-3 text-xl font-semibold">단기 실행 액션</h2>
          <ol className="list-decimal space-y-2 pl-5">
            {data.shortTermActions.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 p-5">
        <h2 className="mb-3 text-xl font-semibold">근거·관찰</h2>
        <ul className="list-disc space-y-2 pl-5">
          {data.evidence.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="mb-3 text-xl font-semibold">점수</h2>
        <p><strong>브랜딩 점수:</strong> {data.brandingScore}</p>
        <p><strong>전환 구조 점수:</strong> {data.conversionScore}</p>
        <p><strong>분석 신뢰도:</strong> {data.confidence}</p>
      </section>
    </main>
  );
}
