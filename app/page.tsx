"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import InputBox from "@/components/InputBox";
import Loader from "@/components/Loader";
import { ANALYSIS_STORAGE_KEY } from "@/lib/constants";
import type { AnalysisResult } from "@/lib/types";

const FREE_LIMIT = 3;
const USAGE_STORAGE_KEY = "ai_marketing_analyzer_usage_count";

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageCount, setUsageCount] = useState(0);
  const [isUsageReady, setIsUsageReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USAGE_STORAGE_KEY);
      const parsed = Number(raw || "0");
      setUsageCount(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
    } catch {
      setUsageCount(0);
    } finally {
      setIsUsageReady(true);
    }
  }, []);

  useEffect(() => {
    console.log("[HomePage] 상태", {
      url,
      isLoading,
      disabledPropForInputBox: isLoading,
      usageCount,
      remainingCount: Math.max(0, FREE_LIMIT - usageCount),
    });
  }, [url, isLoading, usageCount]);

  const remainingCount = useMemo(
    () => Math.max(0, FREE_LIMIT - usageCount),
    [usageCount]
  );

  const isLimitReached = isUsageReady && usageCount >= FREE_LIMIT;

  function increaseUsageCount() {
    const next = usageCount + 1;
    setUsageCount(next);
    try {
      localStorage.setItem(USAGE_STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
  }

  async function handleAnalyze(submittedValue?: string) {
    const trimmed = (submittedValue ?? url).trim();
    setError(null);

    if (!trimmed) {
      setError("URL을 입력해 주세요.");
      return;
    }

    if (!isUsageReady) {
      setError("사용 가능 여부를 확인하는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    if (isLimitReached) {
      setError(
        "무료 분석 3회를 모두 사용했습니다. 다음 단계에서는 결과 저장/공유 또는 결제 기능을 붙여 확장할 수 있습니다."
      );
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        data?: AnalysisResult;
        error?: string;
        detail?: string;
      };

      if (!res.ok || !json.ok || !json.data) {
        const base =
          json.error ??
          (res.status === 502
            ? "분석 중 오류가 발생했습니다."
            : "요청을 처리하지 못했습니다.");
        const extra = json.detail ? ` (${json.detail})` : "";
        setError(base + extra);
        return;
      }

      increaseUsageCount();
      sessionStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(json.data));
      router.push("/result");
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-indigo-50/30 to-white">
      {isLoading ? <Loader /> : null}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.15),transparent)]" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
            AI Marketing Analyzer
          </p>

          <h1 className="mb-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            URL 하나로
            <br className="sm:hidden" /> 광고 전략까지 자동 진단
          </h1>

          <p className="mx-auto max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
            데스크톱·모바일 화면과 페이지 구조를 함께 분석해
            <span className="font-medium text-slate-800"> 업종</span>,
            <span className="font-medium text-slate-800"> 타깃 고객</span>,
            <span className="font-medium text-slate-800"> 전환 문제</span>,
            <span className="font-medium text-slate-800"> 추천 광고 매체 전략</span>까지
            한 번에 정리합니다.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 shadow-sm">
              URL 입력만으로 분석
            </span>
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 shadow-sm">
              데스크톱 · 모바일 동시 진단
            </span>
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 shadow-sm">
              Meta · Criteo · 카카오 · 네이버 GFA 제안
            </span>
          </div>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center pb-12">
          <div className="w-full max-w-2xl rounded-3xl border border-white/80 bg-white/90 p-8 shadow-xl shadow-indigo-100/50 backdrop-blur-sm sm:p-10">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-slate-900">
                분석할 사이트 URL을 입력해 주세요
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                상품 소개 페이지, 브랜드 사이트, 랜딩페이지, 쇼핑몰 메인 등
                공개된 웹페이지라면 분석할 수 있습니다.
              </p>
            </div>

            <div className="mb-5 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm">
              <span className="font-medium text-indigo-900">
                무료 분석 {FREE_LIMIT}회 제공
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-700">
                사용: <span className="font-semibold">{usageCount}</span>회
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-700">
                남은 횟수:{" "}
                <span className="font-semibold text-indigo-700">
                  {remainingCount}
                </span>
                회
              </span>
            </div>

            {isLimitReached ? (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
                무료 분석 가능 횟수를 모두 사용했습니다.
                <br />
                다음 단계에서는 결과 저장/공유 기능 또는 결제 기능을 붙여서 확장할 수
                있습니다.
              </div>
            ) : null}

            <InputBox
              value={url}
              onChange={setUrl}
              onSubmit={handleAnalyze}
              disabled={isLoading}
              error={error}
            />

            <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-center text-xs leading-6 text-slate-500">
              보통 분석에는 <span className="font-semibold text-slate-700">10~20초</span> 정도
              소요됩니다. 로그인이나 접근 권한이 필요한 페이지는 일부 제한될 수 있습니다.
            </div>
          </div>
        </section>

        <footer className="mt-auto border-t border-slate-200/80 pt-8 text-center text-sm text-slate-500">
          Google Gemini · Puppeteer · Next.js
        </footer>
      </div>
    </main>
  );
}