import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import puppeteer, { type Page } from "puppeteer";
import { extractJsonObject } from "@/lib/extractJson";
import { mapRawToAnalysisResult } from "@/lib/mapAnalysisResult";
import type { AnalysisResult } from "@/lib/types";

export const maxDuration = 120;

const GEMINI_MODEL = "gemini-2.5-flash";

const BODY_TEXT_MAX = 8000;
const FIX_RETRY_RAW_MAX = 12000;

const SYSTEM_PROMPT = `너는 10년차 퍼포먼스 마케터이자 디지털 광고 전략 컨설턴트다.
한국 시장 기준으로 실무에서 바로 쓸 수 있는 수준으로 답하라.

입력으로 데스크톱·모바일 스크린샷(PNG)과 구조화된 페이지 텍스트 JSON이 주어진다.
SEO 메타가 부족하거나 이미지·배너 중심 사이트일 수 있으므로, 시각적 레이아웃·톤·CTA·내비게이션을 적극 해석하라.

반드시 지킬 것:
- 모든 응답은 한국어로만 작성한다.
- 확실히 보이는 사실과 추정은 구분해 evidence에 반드시 "사실: " 또는 "추정: "으로 시작하는 문장만 넣는다 (접두어 누락 금지).
- 실행 가능한 개선안 중심으로 쓴다 (모호한 표현 최소화).
- recommendedChannels는 반드시 길이 4의 배열이며, 순서는 반드시 Meta → Criteo → 카카오모먼트 → 네이버 GFA 순서로만 출력한다 (다른 순서·누락 금지).
- 각 recommendedChannels 항목의 channel은 위 순서와 동일한 값이어야 하며, fit은 "상"|"중"|"하"만 사용한다. 적합하지 않으면 fit은 "하"로 낮추고 reason에 근거를 적는다.
- issues는 최소 3개 이상 반환한다. category는 반드시 "브랜딩" | "전환" | "콘텐츠" | "UX" 중 하나로만 사용한다.
- immediateActions는 정확히 3개의 문자열 배열로 반환한다.
- shortTermActions는 정확히 3개의 문자열 배열로 반환한다.
- evidence는 최소 4개 이상 반환한다. 각 항목은 반드시 "사실: " 또는 "추정: "으로 시작한다.
- confidence는 분석 근거의 충분함(0~100 정수).
- 오직 JSON 하나만 출력한다. 마크다운, 코드펜스, 주석, 앞뒤 설명 금지.`;

const JSON_SCHEMA_HINT = `다음 키를 가진 JSON 단일 객체로만 응답하라:
{
  "businessType": string,
  "productOrServiceType": string,
  "pricePositioning": string,
  "brandTone": string,
  "funnelStage": string,
  "primaryConversionGoal": string,
  "ctaClarity": string,
  "industrySummary": string,
  "targetAudience": string,
  "issues": [ { "category": "브랜딩"|"전환"|"콘텐츠"|"UX", "problem": string, "impact": string } ],
  "recommendedChannels": [
    { "channel": "Meta"|"Criteo"|"카카오모먼트"|"네이버 GFA", "fit": "상"|"중"|"하", "objective": string, "reason": string, "strategy": string }
  ],
  "immediateActions": string[],
  "shortTermActions": string[],
  "brandingScore": number,
  "conversionScore": number,
  "confidence": number,
  "evidence": string[]
}`;

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("URL을 입력해 주세요.");
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 공백·대소문자 기준 중복 제거, 첫 등장 순서 유지 */
function dedupePreserveOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of items) {
    const k = s.replace(/\s+/g, " ").trim();
    if (!k) continue;
    const key = k.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(k);
  }
  return out;
}

function isNoiseToken(s: string): boolean {
  if (s.length < 2) return true;
  if (/^[·\s.|\-_/]+$/.test(s)) return true;
  return false;
}

async function dismissCommonOverlays(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      const clickIfVisible = (el: Element) => {
        const h = el as HTMLElement;
        const style = window.getComputedStyle(h);
        if (style.display === "none" || style.visibility === "hidden") return false;
        if (style.opacity === "0") return false;
        h.click();
        return true;
      };

      const closeSelectors = [
        '[aria-label*="close" i]',
        '[aria-label*="닫기"]',
        'button[aria-label*="Close" i]',
        '[data-testid*="close" i]',
        '[class*="cookie" i] button',
        '[id*="cookie" i] button',
        '[class*="consent" i] button',
      ];
      for (const sel of closeSelectors) {
        const el = document.querySelector(sel);
        if (el && clickIfVisible(el)) return;
      }

      const keywords = [
        "동의하고 계속",
        "동의",
        "수락",
        "닫기",
        "Accept",
        "Close",
      ];
      const candidates = Array.from(
        document.querySelectorAll("button, [role='button'], a")
      );
      for (const kw of keywords) {
        for (const el of candidates) {
          const t = (el.textContent || "").trim();
          if (t.length < 2 || t.length > 20) continue;
          if (t.includes(kw)) {
            if (clickIfVisible(el)) return;
          }
        }
      }
    });
  } catch {
    /* ignore */
  }
}

type PageExtract = {
  title: string;
  metaDescription: string;
  h1: string[];
  h2: string[];
  buttonTexts: string[];
  linkTexts: string[];
  imgAlts: string[];
  bodyText: string;
};

async function extractPageSignals(page: Page): Promise<PageExtract> {
  const raw = await page.evaluate(() => {
    const clean = (s: string) => s.replace(/\s+/g, " ").trim();
    const take = (els: NodeListOf<Element> | Element[], limit: number) =>
      Array.from(els)
        .map((el) => clean(el.textContent || ""))
        .filter(Boolean)
        .slice(0, limit);

    const metaDesc =
      document.querySelector('meta[name="description"]')?.getAttribute("content") ||
      document.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
      "";

    const buttons = Array.from(
      document.querySelectorAll('button, [role="button"], input[type="submit"]')
    );
    const links = Array.from(document.querySelectorAll("a[href]"));

    return {
      title: clean(document.title || ""),
      metaDescription: clean(metaDesc),
      h1: take(document.querySelectorAll("h1"), 30),
      h2: take(document.querySelectorAll("h2"), 50),
      buttonTextsRaw: Array.from(buttons)
        .map((el) => clean(el.textContent || ""))
        .filter(Boolean),
      linkTextsRaw: Array.from(links)
        .map((el) => clean(el.textContent || ""))
        .filter((t) => t.length > 0),
      imgAltsRaw: Array.from(document.querySelectorAll("img[alt]"))
        .map((img) => clean((img as HTMLImageElement).alt))
        .filter(Boolean),
      bodyText: clean(document.body?.innerText || ""),
    };
  });

  const filterButtons = dedupePreserveOrder(
    raw.buttonTextsRaw
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && t.length <= 40 && !isNoiseToken(t))
  ).slice(0, 45);

  const filterLinks = dedupePreserveOrder(
    raw.linkTextsRaw
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && t.length <= 60 && !isNoiseToken(t))
  ).slice(0, 55);

  const filterAlts = dedupePreserveOrder(
    raw.imgAltsRaw.filter((t) => t.length >= 2 && !isNoiseToken(t))
  ).slice(0, 45);

  const bodyText = raw.bodyText.slice(0, BODY_TEXT_MAX);

  return {
    title: raw.title,
    metaDescription: raw.metaDescription,
    h1: dedupePreserveOrder(raw.h1).slice(0, 25),
    h2: dedupePreserveOrder(raw.h2).slice(0, 40),
    buttonTexts: filterButtons,
    linkTexts: filterLinks,
    imgAlts: filterAlts,
    bodyText,
  };
}

function parseJsonSafe(raw: string): Record<string, unknown> {
  return JSON.parse(extractJsonObject(raw)) as Record<string, unknown>;
}

async function captureDesktop(
  browser: Awaited<ReturnType<typeof puppeteer.launch>>,
  targetUrl: string
): Promise<{ extracted: PageExtract; desktopB64: string }> {
  const page = await browser.newPage();
  try {
    await page.setViewport({
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
    });

    await page.goto(targetUrl, {
      waitUntil: "networkidle2",
      timeout: 45000,
    });

    await delay(1500);
    await dismissCommonOverlays(page);
    await delay(350);

    const extracted = await extractPageSignals(page);

    const deskBuf = await page.screenshot({
      type: "png",
      fullPage: true,
      encoding: "base64",
    });
    const desktopB64 =
      typeof deskBuf === "string"
        ? deskBuf
        : Buffer.from(deskBuf).toString("base64");

    return { extracted, desktopB64 };
  } finally {
    await page.close().catch(() => {});
  }
}

async function captureMobile(
  browser: Awaited<ReturnType<typeof puppeteer.launch>>,
  targetUrl: string
): Promise<string> {
  const page = await browser.newPage();
  try {
    await page.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    await page.goto(targetUrl, {
      waitUntil: "networkidle2",
      timeout: 45000,
    });

    await delay(1400);
    await dismissCommonOverlays(page);
    await delay(350);

    const mobBuf = await page.screenshot({
      type: "png",
      fullPage: true,
      encoding: "base64",
    });
    return typeof mobBuf === "string"
      ? mobBuf
      : Buffer.from(mobBuf).toString("base64");
  } finally {
    await page.close().catch(() => {});
  }
}

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "서버에 GEMINI_API_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  let targetUrl: string;
  try {
    targetUrl = normalizeUrl(body.url ?? "");
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "URL이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  if (!isValidHttpUrl(targetUrl)) {
    return NextResponse.json(
      { error: "http 또는 https 형식의 URL을 입력해 주세요." },
      { status: 400 }
    );
  }

  const startedAt = Date.now();

  console.log("[analyze] 시작", {
    analyzedUrl: targetUrl,
    startedAt: new Date(startedAt).toISOString(),
  });

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  let desktopB64: string;
  let mobileB64: string;
  let pageJson: string;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const { extracted, desktopB64: dB64 } = await captureDesktop(
      browser,
      targetUrl
    );
    desktopB64 = dB64;
    pageJson = JSON.stringify(extracted, null, 2);

    mobileB64 = await captureMobile(browser, targetUrl);
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    const detail =
      e instanceof Error ? e.message : "페이지를 불러오지 못했습니다.";
    console.log("[analyze] Puppeteer 실패", {
      analyzedUrl: targetUrl,
      detail,
      elapsedMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      {
        error:
          "해당 URL에 접속하거나 스크린샷을 저장하지 못했습니다. 주소가 맞는지, 차단·타임아웃 여부를 확인해 주세요.",
        detail,
      },
      { status: 502 }
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const userText = `${SYSTEM_PROMPT}

${JSON_SCHEMA_HINT}

아래 pageSignals는 데스크톱 페이지에서 추출한 구조화 정보다 (JSON 문자열):
${pageJson}`;

  const contents = [
    {
      inlineData: {
        mimeType: "image/png",
        data: desktopB64,
      },
    },
    {
      inlineData: {
        mimeType: "image/png",
        data: mobileB64,
      },
    },
    {
      text: `첫 번째 이미지: 데스크톱 화면 캡처. 두 번째 이미지: 모바일(약 390×844 뷰포트) 화면 캡처.\n\n${userText}`,
    },
  ];

  console.log("[analyze] Gemini 호출 직전", {
    analyzedUrl: targetUrl,
    elapsedMs: Date.now() - startedAt,
  });

  let raw: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        temperature: 0.35,
      },
    });

    raw = response.text;
    const len = raw?.length ?? 0;
    console.log("[analyze] Gemini 호출 직후", {
      analyzedUrl: targetUrl,
      responseLength: len,
      elapsedMs: Date.now() - startedAt,
    });

    if (!raw) {
      console.log("[analyze] 실패: 빈 응답", {
        analyzedUrl: targetUrl,
        elapsedMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        {
          error:
            "AI가 빈 응답을 반환했습니다. 잠시 후 다시 시도하거나 다른 URL을 이용해 주세요.",
        },
        { status: 502 }
      );
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = parseJsonSafe(raw);
    } catch (firstErr) {
      const rawSnippet =
        raw.length > FIX_RETRY_RAW_MAX ? raw.slice(0, FIX_RETRY_RAW_MAX) : raw;

      console.log("[analyze] JSON 1차 파싱 실패, 보정 재시도", {
        analyzedUrl: targetUrl,
        detail: firstErr instanceof Error ? firstErr.message : String(firstErr),
        elapsedMs: Date.now() - startedAt,
      });

      const fixResponse = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            text: `직전 응답에서 JSON 외 텍스트를 제거하고, 동일 내용을 유지한 채 유효한 JSON 하나만 다시 출력하라.

${JSON_SCHEMA_HINT}

직전 응답(일부):
${rawSnippet}

파싱 오류: ${firstErr instanceof Error ? firstErr.message : String(firstErr)}`,
          },
        ],
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          temperature: 0.05,
        },
      });

      const fixed = fixResponse.text;
      const fixedLen = fixed?.length ?? 0;
      console.log("[analyze] 보정 응답 수신", {
        analyzedUrl: targetUrl,
        responseLength: fixedLen,
        elapsedMs: Date.now() - startedAt,
      });

      if (!fixed) {
        console.log("[analyze] 실패: 보정 응답 없음", {
          analyzedUrl: targetUrl,
          elapsedMs: Date.now() - startedAt,
        });
        return NextResponse.json(
          {
            error:
              "AI 응답을 JSON으로 해석하지 못했습니다. 잠시 후 다시 시도해 주세요.",
            detail:
              firstErr instanceof Error
                ? firstErr.message
                : "1차 파싱 실패 후 보정 응답도 비어 있음",
          },
          { status: 502 }
        );
      }

      try {
        parsed = parseJsonSafe(fixed);
        raw = fixed;
      } catch (secondErr) {
        console.log("[analyze] 실패: JSON 2차 파싱도 실패", {
          analyzedUrl: targetUrl,
          detail: secondErr instanceof Error ? secondErr.message : String(secondErr),
          elapsedMs: Date.now() - startedAt,
        });
        return NextResponse.json(
          {
            error:
              "AI 응답을 JSON으로 해석하지 못했습니다. 모델 출력 형식 오류일 수 있습니다.",
            detail:
              secondErr instanceof Error
                ? secondErr.message
                : String(secondErr),
          },
          { status: 502 }
        );
      }
    }

    const result: AnalysisResult = mapRawToAnalysisResult(parsed, targetUrl);
    console.log("[analyze] 성공", {
      analyzedUrl: targetUrl,
      elapsedMs: Date.now() - startedAt,
    });
    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.log("[analyze] 실패: 예외", {
      analyzedUrl: targetUrl,
      detail,
      elapsedMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      {
        error:
          "Gemini API 호출 또는 분석 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        detail,
      },
      { status: 502 }
    );
  }
}
