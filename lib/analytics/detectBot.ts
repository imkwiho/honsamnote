// User-Agent 문자열만으로 명확한 자동화 트래픽을 걸러내는 유틸.
// 단어 하나 포함됐다고 무조건 차단하지 않도록, 알려진 봇 서명(대개 자체적으로
// "bot"/"crawler"/"spider" 등을 명시하는 UA 관례)만 매칭한다.
const BOT_PATTERNS: RegExp[] = [
  /googlebot/i,
  /bingbot/i,
  /yeti/i, // 네이버
  /daumoa/i, // 다음
  /baiduspider/i,
  /yandex(bot)?/i,
  /duckduckbot/i,
  /crawler/i,
  /spider/i,
  /\bbot\b/i, // "bot"을 독립된 단어로만 매칭 (예: "Bothell" 같은 오탐 방지)
  /lighthouse/i,
  /pagespeed/i,
  /headlesschrome/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /slackbot/i,
  /discordbot/i,
  /telegrambot/i,
  /whatsapp/i,
  /applebot/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /petalbot/i,
  /bytespider/i,
  /gptbot/i,
  /ccbot/i,
];

/** User-Agent가 알려진 봇/크롤러/자동화 도구 패턴과 일치하는지 판단한다. */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false; // UA가 없는 경우는 봇 단정 대신 통과(모바일 인앱 브라우저 등도 UA 누락 가능)
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}
