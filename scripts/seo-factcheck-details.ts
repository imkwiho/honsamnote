// SEO 4단계 §2-4 — Fact-check 91개 게시글의 구체적 주장 추출.
// factcheck-priority.csv의 P1/P2/P3 게시글에서 검증 필요 문장을 추출하여
// factcheck-details.csv로 출력한다.
// 외부 검증은 이 스크립트에서 수행하지 않는다 — verification_status는
// 모두 NEEDS_EXTERNAL_VERIFICATION으로 시작한다.
import fs from 'fs';
import path from 'path';
import {
  loadAllPosts, AUDIT_DIR, SITE_URL, ensureAuditDir, toCsv,
  extractPlainText, extractClaims, CLAIM_PATTERNS,
} from './lib/seoPhase4Shared';

function main() {
  const posts = loadAllPosts();

  // factcheck-priority.csv에서 대상 목록 읽기
  const priorityCsvPath = path.join(AUDIT_DIR, 'factcheck-priority.csv');
  if (!fs.existsSync(priorityCsvPath)) {
    console.error('factcheck-priority.csv 없음 — seo-factcheck-priority.ts 먼저 실행 필요');
    process.exit(1);
  }
  const priorityLines = fs.readFileSync(priorityCsvPath, 'utf-8')
    .replace(/^﻿/, '')
    .split('\n')
    .slice(1) // 헤더 제거
    .filter(l => l.trim());

  const priorityMap = new Map<string, string>(); // slug → priority
  for (const line of priorityLines) {
    // CSV: post_id,url,category,matched_patterns,snippet_sample,priority,reason
    const parts = line.split(',');
    const slug = parts[0]?.trim();
    const priority = parts[5]?.replace(/"/g, '').trim();
    if (slug && priority) priorityMap.set(slug, priority);
  }

  const postBySlug = new Map(posts.map(p => [p.slug, p]));
  const rows: Record<string, unknown>[] = [];
  let rowId = 0;

  for (const [slug, priority] of priorityMap) {
    const post = postBySlug.get(slug);
    if (!post) continue;

    const plain = extractPlainText(post.content);
    const claims = extractClaims(plain, CLAIM_PATTERNS);

    if (claims.length === 0) {
      // 패턴 미매칭이지만 리스트에 포함된 글: 위험 표시
      rows.push({
        id: ++rowId,
        post_id: slug,
        url: `${SITE_URL}/blog/${slug}/`,
        title: post.title,
        risk_level: priority,
        claim: '(패턴 미매칭 — 수동 검토 필요)',
        claim_type: '기타수치',
        current_value: '',
        verification_required: 'yes',
        verification_status: 'NEEDS_EXTERNAL_VERIFICATION',
        recommended_action: '수동 본문 검토 후 판단',
        source_required: '공식기관',
        source_used: '',
        checked_date: '',
      });
      continue;
    }

    for (const c of claims) {
      // 리스트의 priority(P1/P2/P3)와 패턴의 riskLevel 중 더 높은 쪽 사용
      const effectiveRisk = (priority === 'P1' || c.riskLevel === 'P1') ? 'P1'
        : (priority === 'P2' || c.riskLevel === 'P2') ? 'P2' : 'P3';

      const recommendedAction = effectiveRisk === 'P1'
        ? '공식기관(정부·지자체·법령) 확인 후 수정 또는 "관련 기준 변경 가능 — 공식기관 최신 내용 확인 권장" 안내 추가'
        : effectiveRisk === 'P2'
          ? '수치·가격 변동 여부 확인. 확인 불가 시 "이용 전 최신 정보 확인 필요" 안내 추가'
          : '단정 표현 여부 확인. 과도한 단정이면 완화 검토';

      const sourceRequired = effectiveRisk === 'P1'
        ? '정부기관·법령 원문·지자체'
        : effectiveRisk === 'P2'
          ? '공공기관·제조사·서비스 공식 페이지'
          : '공신력 있는 기관';

      rows.push({
        id: ++rowId,
        post_id: slug,
        url: `${SITE_URL}/blog/${slug}/`,
        title: post.title,
        risk_level: effectiveRisk,
        claim: c.claim.replace(/,/g, '，').replace(/\n/g, ' '),
        claim_type: c.claimType,
        current_value: c.currentValue,
        verification_required: 'yes',
        verification_status: 'NEEDS_EXTERNAL_VERIFICATION',
        recommended_action: recommendedAction,
        source_required: sourceRequired,
        source_used: '',
        checked_date: '',
      });
    }
  }

  // P1 → P2 → P3 순 정렬
  const order: Record<string, number> = { P1: 0, P2: 1, P3: 2 };
  rows.sort((a, b) => (order[a.risk_level as string] ?? 3) - (order[b.risk_level as string] ?? 3));

  ensureAuditDir();
  const columns = [
    'id', 'post_id', 'url', 'title', 'risk_level', 'claim', 'claim_type',
    'current_value', 'verification_required', 'verification_status',
    'recommended_action', 'source_required', 'source_used', 'checked_date',
  ];
  fs.writeFileSync(path.join(AUDIT_DIR, 'factcheck-details.csv'), toCsv(columns, rows), 'utf-8');

  const p1 = rows.filter(r => r.risk_level === 'P1').length;
  const p2 = rows.filter(r => r.risk_level === 'P2').length;
  const p3 = rows.filter(r => r.risk_level === 'P3').length;
  console.log(`Fact-check 상세 추출 완료 — 총 ${rows.length}개 주장`);
  console.log(`  P1(고위험): ${p1}건 / P2(변동성): ${p2}건 / P3(일반): ${p3}건`);
  console.log(`  대상 게시글: ${priorityMap.size}개`);
  console.log('출력: seo-audit/factcheck-details.csv');
}

main();
