export type IssueCategory = "브랜딩" | "전환" | "콘텐츠" | "UX";

export type IssueItem = {
  category: IssueCategory;
  problem: string;
  impact: string;
};

export type ChannelName =
  | "Meta"
  | "Criteo"
  | "카카오모먼트"
  | "네이버 GFA";

export type ChannelFit = "상" | "중" | "하";

export type CTAClarity = "상" | "중" | "하" | "불명확";

export type RecommendedChannel = {
  channel: ChannelName;
  fit: ChannelFit;
  objective: string;
  reason: string;
  strategy: string;
};

export type AnalysisResult = {
  businessType: string;
  productOrServiceType: string;
  pricePositioning: string;
  brandTone: string;
  funnelStage: string;
  primaryConversionGoal: string;
  ctaClarity: CTAClarity;
  industrySummary: string;
  targetAudience: string;
  issues: IssueItem[];
  recommendedChannels: RecommendedChannel[];
  immediateActions: string[];
  shortTermActions: string[];
  brandingScore: number;
  conversionScore: number;
  confidence: number;
  evidence: string[];
  analyzedUrl: string;
};
