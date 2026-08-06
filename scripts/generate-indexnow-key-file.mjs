// IndexNow는 소유권 증명으로 "https://사이트/{key}.txt" 파일에 키 값 자체가
// 그대로 있어야 한다고 요구한다. INDEXNOW_KEY가 설정된 경우에만 public/에
// 그 파일을 만들어 정적 빌드에 포함시킨다 (없으면 조용히 건너뛴다 — 아직
// 키를 설정하지 않은 상태에서도 빌드가 실패하지 않아야 하므로).
import fs from 'fs';
import path from 'path';

const KEY = process.env.INDEXNOW_KEY;

if (!KEY) {
  console.log('INDEXNOW_KEY가 설정되지 않아 IndexNow 키 파일 생성을 건너뜁니다.');
  process.exit(0);
}

if (!/^[a-zA-Z0-9-]{8,128}$/.test(KEY)) {
  console.warn('INDEXNOW_KEY 형식이 올바르지 않아(영숫자/하이픈, 8~128자) 키 파일 생성을 건너뜁니다.');
  process.exit(0);
}

const outPath = path.join(process.cwd(), 'public', `${KEY}.txt`);
fs.writeFileSync(outPath, KEY, 'utf-8');
console.log('IndexNow 키 파일 생성 완료:', outPath);
