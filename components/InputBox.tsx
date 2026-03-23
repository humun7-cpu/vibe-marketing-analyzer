"use client";

import { useEffect, useRef, useState } from "react";

type InputBoxProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (currentValue: string) => void;
  disabled?: boolean;
  error?: string | null;
};

export default function InputBox({
  value,
  onChange,
  onSubmit,
  disabled = false,
  error,
}: InputBoxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const applyInput = (nextValue: string) => {
    setLocalValue(nextValue);
    onChange(nextValue);
  };

  const currentValue = (inputRef.current?.value ?? localValue ?? "").trim();
  const canSubmit = currentValue.length > 0 && !disabled;

  return (
    <div className="w-full max-w-xl space-y-3">
      <label
        htmlFor="site-url"
        className="block text-sm font-medium text-slate-700"
      >
        분석할 웹사이트 URL
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <input
          ref={inputRef}
          id="site-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="none"
          placeholder="https://example.com"
          value={localValue}
          onChange={(e) => applyInput(e.target.value)}
          onInput={(e) =>
            applyInput((e.target as HTMLInputElement).value)
          }
          className="min-h-[48px] flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none ring-indigo-500/0 transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/20"
        />

        <button
          type="button"
          disabled={!canSubmit}
          aria-busy={disabled}
          onClick={() => {
            const submitted = (inputRef.current?.value ?? localValue ?? "").trim();
            if (!submitted || disabled) return;
            onChange(submitted);
            onSubmit(submitted);
          }}
          className="min-h-[48px] shrink-0 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-3 text-base font-semibold text-white shadow-md transition hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {disabled ? "분석 중..." : "분석하기"}
        </button>
      </div>

      <p className="text-[11px] text-slate-400">
        debug: len={currentValue.length}, disabled={String(disabled)}, canSubmit={String(canSubmit)}
      </p>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}