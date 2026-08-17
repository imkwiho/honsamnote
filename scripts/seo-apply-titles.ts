// SEO 2단계 §11-13 — title-changes.csv에서 confidence=HIGH인 행만 골라
// 실제 content/blog/*.mdx의 title/description 필드에 적용한다.
// MEDIUM/LOW는 파일을 전혀 건드리지 않는다(보고서에만 남음).
//
// 안전장치:
// - front matter의 title/description "필드만" 정확히 교체한다(YAML 전체를
//   matter.stringify로 재작성하지 않음 — 1단계에서 검증된, 불필요한 서식
//   변경을 막는 방식).
// - 실행 전 반드시 백업이 있어야 한다(이미 생성됨:
//   backup/posts-before-seo-phase2-content-changes-YYYYMMDD.json).
// - title-changes.csv를 다시 파싱해서 쓴다(review 스크립트를 다시 계산하지
//   않음) — 사람이 CSV를 검토·수정한 뒤 이 스크립트를 돌릴 수 있게 하기
//   위함.
import fs from 'fs';
import path from 'path';
import { replaceYamlStringField } from '../lib/yamlFieldReplace';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const AUDIT_DIR = path.join(process.cwd(), 'seo-audit');

// --- 앞서 검증된 RFC 4180 CSV 파서 재사용 ---
function parseCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\r' && text[i + 1] === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 2;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

function main() {
  const csvPath = path.join(AUDIT_DIR, 'title-changes.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('seo-audit/title-changes.csv가 없습니다. 먼저 npm run seo:title-review를 실행하세요.');
    process.exit(1);
  }
  const rows = parseCsv(fs.readFileSync(csvPath, 'utf-8'));
  const header = rows[0];
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const dataRows = rows.slice(1);

  const highRows = dataRows.filter(r => r[idx.confidence] === 'HIGH');

  let titleApplied = 0;
  let descApplied = 0;
  let skipped = 0;

  for (const row of highRows) {
    const slug = row[idx.post_id];
    const newTitle = row[idx.new_title];
    const newDescription = row[idx.new_description];
    const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
      console.warn(`파일 없음, 건너뜀: ${slug}`);
      skipped++;
      continue;
    }
    let raw = fs.readFileSync(filePath, 'utf-8');
    let changedAny = false;

    if (newTitle && newTitle !== row[idx.old_title]) {
      const result = replaceYamlStringField(raw, 'title', newTitle);
      if (result.changed) {
        raw = result.raw;
        changedAny = true;
        titleApplied++;
      }
    }
    if (newDescription && newDescription !== row[idx.old_description]) {
      const result = replaceYamlStringField(raw, 'description', newDescription);
      if (result.changed) {
        raw = result.raw;
        changedAny = true;
        descApplied++;
      }
    }

    if (changedAny) fs.writeFileSync(filePath, raw, 'utf-8');
  }

  console.log(`HIGH 대상: ${highRows.length}개`);
  console.log(`title 적용: ${titleApplied}개, description 적용: ${descApplied}개, 건너뜀: ${skipped}개`);
  console.log('MEDIUM/LOW는 파일을 건드리지 않았습니다(추가 검토 대상, seo-audit/title-changes.csv 참고).');
}

main();
