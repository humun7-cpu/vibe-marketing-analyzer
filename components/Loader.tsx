"use client";

export default function Loader() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-white px-10 py-12 shadow-xl">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-indigo-600 border-r-violet-500" />
        </div>
        <p className="text-center text-lg font-medium text-slate-800">
          AI가 사이트를 분석 중입니다...
        </p>
        <p className="max-w-sm text-center text-sm text-slate-500">
          데스크톱·모바일 화면을 캡처하고, Gemini가 페이지 신호를 읽어 실무형
          전략을 정리하고 있어요. 잠시만 기다려 주세요.
        </p>
      </div>
    </div>
  );
}
