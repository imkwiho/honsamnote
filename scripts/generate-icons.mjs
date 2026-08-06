// 파비콘/애플 터치 아이콘 생성 스크립트(1회성 자산 생성용, 빌드에 포함되지 않음).
// 실행: node scripts/generate-icons.mjs
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function iconSvg(size) {
  const fontSize = Math.round(size * 0.42);
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="#7c8f6e" />
  <text x="50%" y="56%" text-anchor="middle" dominant-baseline="middle"
    font-family="'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="${fontSize}" font-weight="700"
    fill="#faf6f0">혼</text>
</svg>`;
}

const targets = [
  { file: '../app/icon.png', size: 512 },
  { file: '../app/apple-icon.png', size: 180 },
];

await Promise.all(
  targets.map(({ file, size }) =>
    sharp(Buffer.from(iconSvg(size)))
      .png()
      .toFile(path.join(__dirname, file))
      .then(() => console.log('생성 완료:', file))
  )
).catch(err => {
  console.error('실패:', err);
  process.exit(1);
});
