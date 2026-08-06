// 대표 공유 이미지(og:image) 생성 스크립트. 1회성 자산 생성용이라 빌드에는 포함되지 않는다.
// 실행: node scripts/generate-og-image.mjs
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#faf6f0" />
      <stop offset="100%" stop-color="#f0ece2" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <circle cx="1060" cy="110" r="180" fill="#eef1e6" opacity="0.7" />
  <circle cx="120" cy="560" r="140" fill="#eef1e6" opacity="0.6" />
  <text x="100" y="260" font-family="Georgia, 'Nanum Myeongjo', serif" font-size="42" fill="#8a9a7a">✦</text>
  <text x="100" y="340" font-family="'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="88" font-weight="700" fill="#2f2c26">혼삶노트</text>
  <text x="100" y="410" font-family="'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="34" fill="#5c5749">1인 가구를 위한 생활비·주거·생활정보</text>
  <text x="100" y="470" font-family="'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="26" fill="#8a8377">생활비 · 식재료 · 수납 · 청소 · 안전 · 주거 · 제품 · 관계</text>
  <text x="100" y="560" font-family="'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="24" fill="#a39c8c">honsamnote.co.kr</text>
</svg>
`;

const outPath = path.join(__dirname, '..', 'public', 'og-default.png');

sharp(Buffer.from(svg))
  .png()
  .toFile(outPath)
  .then(() => console.log('생성 완료:', outPath))
  .catch(err => {
    console.error('실패:', err);
    process.exit(1);
  });
