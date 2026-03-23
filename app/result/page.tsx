"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ResultCard from "@/components/ResultCard";
import { ANALYSIS_STORAGE_KEY } from "@/lib/constants";
import type {
  AnalysisResult,
  ChannelFit,
  IssueCategory,
} from "@/lib/types";

function isAnalysisResult(v: unknown): v is AnalysisResult {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.analyzedUrl === "string" &&
    typeof o.businessType === "string" &&
    typeof o.productOrServiceType === "string" &&
    typeof o.pricePositioning === "string" &&
    typeof o.brandTone === "string" &&
    typeof o.funnelStage === "string" &&
    typeof o.primaryConversionGoal === "string" &&
    typeof o.ctaClarity === "string" &&
    typeof o.industrySummary === "string" &&
    typeof o.targetAudience === "string" &&
    Array.isArray(o.recommendedChannels) &&
    Array.isArray(o.issues) &&
    Array.isArray(o.immediateActions) &&
    Array.isArray(o.shortTermActions) &&
    Array.isArray(o.evidence)
  );
}

function ScoreBar({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular-nums font-semibold text-slate-900">
          {value}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

const issueCategoryStyles: Record<IssueCategory, string> = {
  브랜딩: "bg-violet-100 text-violet-800 ring-violet-200",
  전환: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  콘텐츠: "bg-amber-100 text-amber-900 ring-amber-200",
  UX: "bg-slate-100 text-slate-800 ring-slate-200",
};

const fitStyles: Record<ChannelFit, string> = {
  상: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  중: "bg-amber-50 text-amber-900 ring-amber-200",
  하: "bg-slate-100 text-slate-700 ring-slate-200",
};

function encodeAnalysisResult(data: AnalysisResult): string {
  const json = JSON.stringify(data);
  const utf8Bytes = new TextEncoder().encode(json);
  let binary = "";
  utf8Bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  const base64 = btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return base64;
}

function decodeAnalysisResult(encoded: string): AnalysisResult | null {
  try {
    const normalized = encoded
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(encoded.length / 4) * 4, "=");

    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const parsed: unknown = JSON.parse(json);

    if (!isAnalysisResult(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function ResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">(
    "idle"
  );

  const sharedParam = searchParams.get("share");

  useEffect(() => {
    if (sharedParam) {
      const decoded = decodeAnalysisResult(sharedParam);
      if (!decoded) {
        router.replace("/");
        return;
      }
      setData(decoded);
      return;
    }

    const raw = sessionStorage.getItem(ANALYSIS_STORAGE_KEY);
    if (!raw) {
      router.replace("/");
      return;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isAnalysisResult(parsed)) {
        router.replace("/");
        return;
      }
      setData(parsed);
    } catch {
      router.replace("/");
    }
  }, [router, sharedParam]);

  const shareUrl = useMemo(() => {
    if (!data || typeof window === "undefined") return "";
    const encoded = encodeAnalysisResult(data);
    return `${window.location.origin}/result?share=${encoded}`;
  }, [data]);

  async function handleCopyShareLink() {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("success");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        불러오는 중...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-4 text-center sm:text-left">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 transition hover:text-indigo-500"
            >
              ← 새 분석하기
            </Link>

            <button
              type="button"
              onClick={handleCopyShareLink}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
            >
              공유 링크 복사
            </button>
          </div>

          <div>
            <p className="text-sm font-medium text-indigo-600">분석 결과</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              마케팅 전략 진단
            </h1>
            <p className="mt-2 break-all text-sm text-slate-500">
              {data.analyzedUrl}
            </p>

            {copyState === "success" ? (
              <p className="mt-3 text-sm font-medium text-emerald-600">
                공유 링크가 복사되었습니다.
              </p>
            ) : null}

            {copyState === "error" ? (
              <p className="mt-3 text-sm font-medium text-red-600">
                링크 복사에 실패했습니다. 다시 시도해 주세요.
              </p>
            ) : null}
          </div>
        </header>

        <section className="grid gap-4 rounded-xl border border-slate-100 bg-white p-6 shadow-md sm:grid-cols-3">
          <ScoreBar
            label="브랜딩 점수"
            value={data.brandingScore}
            colorClass="bg-gradient-to-r from-indigo-500 to-violet-500"
          />
          <ScoreBar
            label="전환 구조 점수"
            value={data.conversionScore}
            colorClass="bg-gradient-to-r from-emerald-500 to-teal-500"
          />
          <ScoreBar
            label="분석 신뢰도"
            value={data.confidence}
            colorClass="bg-gradient-to-r from-sky-500 to-indigo-500"
          />
        </section>

        <ResultCard title="업종 · 상품 · 가격 포지셔닝 · 브랜드 톤" emoji="📌">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                업종 / 비즈니스
              </dt>
              <dd className="mt-1 text-[15px] text-slate-800">
                {data.businessType || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                상품·서비스 유형
              </dt>
              <dd className="mt-1 text-[15px] text-slate-800">
                {data.productOrServiceType || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                가격 포지셔닝
              </dt>
              <dd className="mt-1 text-[15px] text-slate-800">
                {data.pricePositioning || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                브랜드 톤
              </dt>
              <dd className="mt-1 text-[15px] text-slate-800">
                {data.brandTone || "—"}
              </dd>
            </div>
          </dl>

          <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                퍼널 단계
              </dt>
              <dd className="mt-1 text-[15px] text-slate-800">
                {data.funnelStage || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                주요 전환 목표
              </dt>
              <dd className="mt-1 text-[15px] text-slate-800">
                {data.primaryConversionGoal || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                CTA 명확도
              </dt>
              <dd className="mt-1 text-[15px] text-slate-800">
                {data.ctaClarity || "—"}
              </dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-slate-100 pt-6">
            <h3 className="text-sm font-semibold text-slate-900">요약</h3>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">
              {data.industrySummary || "—"}
            </p>
          </div>
        </ResultCard>

        <ResultCard title="타겟 고객" emoji="🧠">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">
            {data.targetAudience || "—"}
          </p>
        </ResultCard>

        <ResultCard title="문제점 진단" emoji="⚠️">
          {data.issues.length === 0 ? (
            <p className="text-slate-500">표시할 이슈가 없습니다.</p>
          ) : (
            <ul className="space-y-4">
              {data.issues.map((item, i) => (
                <li
                  key={`${item.category}-${i}`}
                  className="rounded-lg border border-slate-100 bg-slate-50/80 p-4"
                >
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      issueCategoryStyles[item.category] ?? issueCategoryStyles.UX
                    }`}
                  >
                    {item.category}
                  </span>
                  <p className="mt-2 font-medium text-slate-900">
                    {item.problem}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-medium text-slate-700">영향: </span>
                    {item.impact}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ResultCard>

        <ResultCard title="추천 광고 매체" emoji="🎯">
          <div className="space-y-4">
            {data.recommendedChannels.map((ch) => (
              <div
                key={ch.channel}
                className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-slate-900">
                    {ch.channel}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                      fitStyles[ch.fit]
                    }`}
                  >
                    적합도 {ch.fit}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-indigo-900/90">
                  목표: {ch.objective}
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  <span className="font-medium text-slate-800">선정 이유: </span>
                  {ch.reason}
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  <span className="font-medium text-slate-800">실행 전략: </span>
                  {ch.strategy}
                </p>
              </div>
            ))}
          </div>
        </ResultCard>

        <div className="grid gap-6 sm:grid-cols-2">
          <ResultCard title="즉시 실행 액션" emoji="⚡">
            {data.immediateActions.length === 0 ? (
              <p className="text-slate-500">항목이 없습니다.</p>
            ) : (
              <ol className="list-decimal space-y-2 pl-5 text-[15px] text-slate-700">
                {data.immediateActions.map((line, i) => (
                  <li key={i} className="leading-relaxed">
                    {line}
                  </li>
                ))}
              </ol>
            )}
          </ResultCard>

          <ResultCard title="단기 실행 액션" emoji="📅">
            {data.shortTermActions.length === 0 ? (
              <p className="text-slate-500">항목이 없습니다.</p>
            ) : (
              <ol className="list-decimal space-y-2 pl-5 text-[15px] text-slate-700">
                {data.shortTermActions.map((line, i) => (
                  <li key={i} className="leading-relaxed">
                    {line}
                  </li>
                ))}
              </ol>
            )}
          </ResultCard>
        </div>

        <ResultCard title="근거·관찰 (사실·추정)" emoji="🔎">
          {data.evidence.length === 0 ? (
            <p className="text-slate-500">근거 목록이 비어 있습니다.</p>
          ) : (
            <ul className="list-disc space-y-2 pl-5 text-[15px] text-slate-700">
              {data.evidence.map((line, i) => (
                <li key={i} className="leading-relaxed">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </ResultCard>

        <footer className="border-t border-slate-200/80 pt-6 text-center text-xs text-slate-500">
          Google Gemini · 데스크톱·모바일 캡처 · Puppeteer
        </footer>
      </div>
    </main>
  );
}