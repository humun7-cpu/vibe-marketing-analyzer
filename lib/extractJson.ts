/** 모델이 ```json ... ``` 로 감싸는 경우 제거 */
export function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i.exec(trimmed);
  if (fence) return fence[1].trim();
  return trimmed;
}
