import type {
  AnalysisResult,
  ChannelFit,
  ChannelName,
  CTAClarity,
  IssueCategory,
  IssueItem,
  RecommendedChannel,
} from "@/lib/types";

const CHANNEL_ORDER: ChannelName[] = [
  "Meta",
  "Criteo",
  "카카오모먼트",
  "네이버 GFA",
];

const ISSUE_CATEGORIES: IssueCategory[] = [
  "브랜딩",
  "전환",
  "콘텐츠",
  "UX",
];

const FITS: ChannelFit[] = ["상", "중", "하"];

const STR_FALLBACK = {
  businessType:
    "스크린샷·텍스트만으로 업종이 명확히 특정되지 않았습니다. 추가 페이지(소개·상품) 확인이 필요합니다.",
  productOrServiceType:
    "핵심 상품·서비스 정의가 드러나지 않았습니다. 대표 오퍼와 카테고리를 페이지 상단에 명시하는 것을 권장합니다.",
  pricePositioning:
    "가격·혜택·프로모션 신호가 충분하지 않아 가격 포지셔닝을 판단하기 어렵습니다.",
  brandTone:
    "톤앤매너가 일관되게 드러나지 않았습니다. 카피·비주얼 기준을 통일해 브랜드 인지를 강화하세요.",
  industrySummary:
    "페이지에서 핵심 가치 제안이 한눈에 요약되지 않았습니다. 방문자가 10초 안에 이해할 수 있는 한 줄 요약을 보강하세요.",
  targetAudience:
    "타겟 페르소나가 명시적으로 드러나지 않았습니다. 연령·니즈·구매 맥락을 가정해 메시지를 재정렬하세요.",
  funnelStage:
    "퍼널 단계(인지·고려·전환) 신호가 혼재합니다. 주요 전환 목표에 맞춰 랜딩 구조를 단일화하는 것이 좋습니다.",
  primaryConversionGoal:
    "핵심 전환(구매·문의·가입 등)이 한 가지로 고정되어 있지 않습니다. 우선순위 전환 1개를 정하고 CTA를 정렬하세요.",
} as const;

/** 빈 문자열·공백이면 fallback 문구 사용 */
function strOrFallback(value: unknown, fallback: string): string {
  const s = String(value ?? "").trim();
  return s || fallback;
}

function isPlaceholder(s: string): boolean {
  const t = s.trim();
  return !t || t === "(미기재)";
}

function clamp0to100(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** 누락·NaN 시 중립값, 이후 0~100 클램프 */
function normalizeConfidence(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return 55;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function normalizeCTAClarity(v: unknown): CTAClarity {
  const s = String(v ?? "").trim();
  if (s === "상" || s === "중" || s === "하" || s === "불명확") return s;
  return "불명확";
}

function normalizeIssueCategory(v: unknown): IssueCategory {
  const s = String(v ?? "").trim();
  if (ISSUE_CATEGORIES.includes(s as IssueCategory)) return s as IssueCategory;
  return "UX";
}

function normalizeChannelName(v: unknown): ChannelName | null {
  const s = String(v ?? "").trim();
  if (CHANNEL_ORDER.includes(s as ChannelName)) return s as ChannelName;
  return null;
}

function normalizeFit(v: unknown): ChannelFit {
  const s = String(v ?? "").trim();
  if (FITS.includes(s as ChannelFit)) return s as ChannelFit;
  return "중";
}

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => String(x ?? "").trim()).filter(Boolean);
  }
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

const CHANNEL_COPY: Record<
  ChannelName,
  { objective: string; reason: string; strategy: string }
> = {
  Meta: {
    objective: "전환·리드 확보를 위한 관심사·행동 기반 타겟 캠페인 운영",
    reason:
      "메타 생태계 내 크리에이티브·오디언스 테스트가 비교적 빠르고 랜딩과 연계하기 쉬움",
    strategy:
      "카탈로그·리드폼·전환 캠페인을 병행하고 UGC·카피 A/B로 메시지 적합도를 검증",
  },
  Criteo: {
    objective: "리타겟팅·제품 피드 기반 재방문·구매 촉진",
    reason:
      "이커머스·카탈로그가 정비된 경우 리타겟 성과를 내기 유리한 구조",
    strategy:
      "피드 품질·재고·가격 일치를 먼저 점검하고 세그먼트별 입찰·소재 로테이션 적용",
  },
  카카오모먼트: {
    objective: "국내 모바일 환경에서 도달·빈도 기반 인지·전환 확대",
    reason:
      "카카오 터치포인트와 연계한 모먼트 타겟이 국내 사용자 행동과 궁합이 좋은 편",
    strategy:
      "오디언스 세분화와 소재 피로도 관리, 카카오 채널(비즈보드 등)과 메시지 톤 통일",
  },
  "네이버 GFA": {
    objective: "검색·디스플레이 통합으로 의도 기반 트래픽 확보",
    reason:
      "국내 검색 의도가 강한 카테고리에서 키워드·GFA 조합으로 효율을 조정하기 적합",
    strategy:
      "검색어 구조화·랜딩 일치도 점검 후 키워드 그룹별 입찰·소재를 분리 운영",
  },
};

const ISSUE_PAD: IssueItem[] = [
  {
    category: "전환",
    problem:
      "핵심 CTA가 복수로 분산되어 전환 경로가 불명확할 수 있습니다.",
    impact:
      "사용자가 다음 행동을 한 가지로 고정하지 못하면 이탈과 비용 낭비로 이어질 수 있습니다.",
  },
  {
    category: "콘텐츠",
    problem:
      "혜택·차별점이 한눈에 드러나지 않아 신뢰·관심 형성이 약할 수 있습니다.",
    impact:
      "첫 화면에서 가치 제안이 약하면 광고 유입 대비 전환률이 낮아질 수 있습니다.",
  },
  {
    category: "UX",
    problem:
      "모바일·데스크톱 간 정보 위계와 스크롤 부담이 달라 일관된 경험이 깨질 수 있습니다.",
    impact:
      "디바이스별 이탈률·스크롤 깊이 차이가 커질 수 있어 크리에이티브·LP 정합성 점검이 필요합니다.",
  },
];

const IMMEDIATE_FALLBACKS = [
  "핵심 전환 1개를 정하고 히어로 영역 CTA를 그 목표에 맞게 단일화하세요.",
  "메타 설명·H1·버튼 카피를 동일한 가치 제안 키워드로 맞춰 인지 혼선을 줄이세요.",
  "모바일에서 첫 화면(Above the fold)에 핵심 혜택과 CTA가 동시에 보이도록 레이아웃을 조정하세요.",
];

const SHORT_TERM_FALLBACKS = [
  "랜딩별 전환 이벤트(클릭·스크롤·제출)를 정의하고 GA4 등으로 퍼널 리포트를 구성하세요.",
  "크리에이티브 2안 이상으로 A/B 테스트 계획을 세우고 주간 단위로 성과를 비교하세요.",
  "카탈로그·피드가 있다면 상품명·가격·이미지 일치 여부를 점검한 뒤 리타겟 캠페인을 설계하세요.",
];

const EVIDENCE_FALLBACKS = [
  "사실: 공개 페이지에서 추출한 텍스트·메타·헤딩 신호를 근거로 진단했습니다.",
  "추정: 모델 출력이 불완전할 경우 자동 보완 문장이 포함될 수 있습니다.",
  "추정: 스크린샷 상 CTA·내비게이션의 시각적 위계를 교차 검증할 필요가 있습니다.",
  "추정: 산업·경쟁 맥락은 별도 리서치 없이 일반적 퍼포먼스 관점에서 해석되었습니다.",
];

function mapIssues(raw: unknown): IssueItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row): IssueItem | null => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      return {
        category: normalizeIssueCategory(o.category),
        problem: String(o.problem ?? "").trim() || "(미기재)",
        impact: String(o.impact ?? "").trim() || "(미기재)",
      };
    })
    .filter((x): x is IssueItem => x !== null);
}

function ensureMinIssues(issues: IssueItem[]): IssueItem[] {
  const out = [...issues];
  let i = 0;
  while (out.length < 3 && i < ISSUE_PAD.length) {
    out.push(ISSUE_PAD[i]);
    i += 1;
  }
  while (out.length < 3) {
    out.push({
      category: "브랜딩",
      problem:
        "브랜드 일관성·시각적 신뢰 요소가 페이지 전반에 충분히 반영되지 않았을 수 있습니다.",
      impact:
        "광고 유입 후 체류·전환에 부정적 영향을 줄 수 있어 톤·디자인 시스템 점검이 필요합니다.",
    });
  }
  return out;
}

function normalizeEvidenceLine(line: string): string {
  const t = line.trim();
  if (!t) return "";
  if (t.startsWith("사실:") || t.startsWith("추정:")) return t;
  return `추정: ${t}`;
}

function ensureEvidence(ev: string[]): string[] {
  let items = ev.map(normalizeEvidenceLine).filter(Boolean);
  let k = 0;
  while (items.length < 4 && k < EVIDENCE_FALLBACKS.length) {
    const add = EVIDENCE_FALLBACKS[k];
    if (!items.includes(add)) items.push(add);
    k += 1;
  }
  while (items.length < 4) {
    items.push(
      "추정: 제공된 신호만으로는 근거가 부족하여 자동 보완된 문장입니다."
    );
  }
  if (items.length > 6) items = items.slice(0, 6);
  return items;
}

function ensureThreeActions(
  arr: string[],
  fallbacks: string[]
): string[] {
  const base = arr.slice(0, 3);
  let i = 0;
  while (base.length < 3 && i < fallbacks.length) {
    const next = fallbacks[i];
    if (!base.includes(next)) base.push(next);
    i += 1;
  }
  while (base.length < 3) {
    base.push(
      "우선순위가 높은 개선 과제를 1개 선정하고, 측정 지표와 함께 실행 계획을 문서화하세요."
    );
  }
  return base.slice(0, 3);
}

function fillChannelFields(rc: RecommendedChannel): RecommendedChannel {
  const fb = CHANNEL_COPY[rc.channel];
  return {
    channel: rc.channel,
    fit: normalizeFit(rc.fit),
    objective: isPlaceholder(rc.objective) ? fb.objective : rc.objective.trim(),
    reason: isPlaceholder(rc.reason) ? fb.reason : rc.reason.trim(),
    strategy: isPlaceholder(rc.strategy) ? fb.strategy : rc.strategy.trim(),
  };
}

function mapRecommendedChannels(raw: unknown): RecommendedChannel[] {
  const fromModel: RecommendedChannel[] = [];
  if (Array.isArray(raw)) {
    for (const row of raw) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const ch = normalizeChannelName(o.channel);
      if (!ch) continue;
      fromModel.push(
        fillChannelFields({
          channel: ch,
          fit: normalizeFit(o.fit),
          objective: String(o.objective ?? "").trim(),
          reason: String(o.reason ?? "").trim(),
          strategy: String(o.strategy ?? "").trim(),
        })
      );
    }
  }

  const byChannel = new Map<ChannelName, RecommendedChannel>();
  for (const c of fromModel) {
    byChannel.set(c.channel, c);
  }

  return CHANNEL_ORDER.map((channel) => {
    const existing = byChannel.get(channel);
    if (existing) return fillChannelFields(existing);
    const fb = CHANNEL_COPY[channel];
    return fillChannelFields({
      channel,
      fit: "하",
      objective: fb.objective,
      reason:
        "모델이 해당 매체를 명시하지 않았거나 신호가 부족해 기본 안내로 보완했습니다.",
      strategy: fb.strategy,
    });
  });
}

export function mapRawToAnalysisResult(
  parsed: Record<string, unknown>,
  analyzedUrl: string
): AnalysisResult {
  return {
    businessType: strOrFallback(parsed.businessType, STR_FALLBACK.businessType),
    productOrServiceType: strOrFallback(
      parsed.productOrServiceType,
      STR_FALLBACK.productOrServiceType
    ),
    pricePositioning: strOrFallback(
      parsed.pricePositioning,
      STR_FALLBACK.pricePositioning
    ),
    brandTone: strOrFallback(parsed.brandTone, STR_FALLBACK.brandTone),
    funnelStage: strOrFallback(parsed.funnelStage, STR_FALLBACK.funnelStage),
    primaryConversionGoal: strOrFallback(
      parsed.primaryConversionGoal,
      STR_FALLBACK.primaryConversionGoal
    ),
    ctaClarity: normalizeCTAClarity(parsed.ctaClarity),
    industrySummary: strOrFallback(
      parsed.industrySummary,
      STR_FALLBACK.industrySummary
    ),
    targetAudience: strOrFallback(
      parsed.targetAudience,
      STR_FALLBACK.targetAudience
    ),
    issues: ensureMinIssues(mapIssues(parsed.issues)),
    recommendedChannels: mapRecommendedChannels(parsed.recommendedChannels),
    immediateActions: ensureThreeActions(
      toStringArray(parsed.immediateActions),
      IMMEDIATE_FALLBACKS
    ),
    shortTermActions: ensureThreeActions(
      toStringArray(parsed.shortTermActions),
      SHORT_TERM_FALLBACKS
    ),
    brandingScore: clamp0to100(parsed.brandingScore),
    conversionScore: clamp0to100(parsed.conversionScore),
    confidence: normalizeConfidence(parsed.confidence),
    evidence: ensureEvidence(toStringArray(parsed.evidence)),
    analyzedUrl,
  };
}
