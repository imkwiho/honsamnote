// SEO 3단계 §13-17 — 남은 MEDIUM 제목(라이브 재계산, ~457개) 전체를 한꺼번에
// 바꾸지 않는다. TITLE_OPTIMIZATION_SCORE로 우선순위 상위 100개만 골라
// 개별 재판정하고, 그중 새로 HIGH가 된 것만 실제로 적용한다(title+description
// 함께 — §17). 백업 먼저, front matter 필드만 안전 치환(matter.stringify
// 재작성 금지, 2단계에서 검증된 lib/yamlFieldReplace.ts 재사용).
import fs from 'fs';
import path from 'path';
import {
  type AuditPost,
  classifyClusterDetailed,
  findDuplicateCandidates,
  computeFactCheckFlag,
  primaryKeyword,
  suggestTitle,
  suggestDescription,
} from '../lib/seoAudit';
import { computeSeoMetadata, type TitleConfidence } from '../lib/seoMetadata';
import { getPillarForCluster } from '../lib/pillars';
import { buildLinkGraph } from '../lib/linkGraph';
import { replaceYamlStringField } from '../lib/yamlFieldReplace';
import { loadAllPosts, AUDIT_DIR, SITE_URL, BLOG_DIR, ensureAuditDir, toCsv } from './lib/seoPhase3Shared';

const TOP_N = 100;

function main() {
  const posts = loadAllPosts();
  const graph = buildLinkGraph(posts);
  const dupCandidates = findDuplicateCandidates(posts);
  const riskySlugs = new Set<string>();
  for (const c of dupCandidates) { riskySlugs.add(c.mainPost); riskySlugs.add(c.duplicatePost); }

  const membersByCluster = new Map<string, number>();
  for (const p of posts) {
    const { clusterSlug } = classifyClusterDetailed(p);
    membersByCluster.set(clusterSlug, (membersByCluster.get(clusterSlug) ?? 0) + 1);
  }

  // 1) MEDIUM 등급인 글 전체에 대해 TITLE_OPTIMIZATION_SCORE 계산.
  // 가중치: 의도명확성(2) + keyword구체성(2) + 클러스터중요도(2) +
  // 내부링크중심성(2) + Pillar연결(1) + 현재제목심각도(2) − 중복/역할분리위험(2) − factcheck위험(1)
  const scored = posts
    .map(p => ({ post: p, meta: computeSeoMetadata(p) }))
    .filter(x => x.meta.titleConfidence === 'MEDIUM')
    .map(({ post, meta }) => {
      const { clusterSlug } = classifyClusterDetailed(post);
      const hasExplicitSignal = /\?|까요\??$|될까|괜찮을까|체크리스트|점검|vs\.?|비교|어떤 것이|어느 쪽|비용|얼마|요금|가격|기준|판단|해도 될까|버려야|방법|법$|하는 법|고르는 법/.test(post.title);
      const intentClarity = hasExplicitSignal ? 1 : 0;
      const kw = primaryKeyword(post);
      const keywordSpecificity = kw ? (kw.length >= 4 ? 1 : 0.6) : 0;
      const clusterImportance = Math.min(1, (membersByCluster.get(clusterSlug) ?? 0) / 30);
      const linkCount = (graph.outgoing.get(post.slug)?.size ?? 0) + (graph.incoming.get(post.slug)?.size ?? 0);
      const internalLinkCentrality = Math.min(1, linkCount / 10);
      const pillarConnection = getPillarForCluster(clusterSlug) ? 1 : 0;
      // 현재 제목이 얼마나 문제가 있는지(길수록/상투어일수록 심각).
      const lengthOverflow = Math.max(0, post.title.length - 45) / 20;
      const titleSeverity = Math.min(1, lengthOverflow) + (/^(혼자 사는 당신,|1인 가구 직장인,|혼자 사는 직장인,)/.test(post.title) ? 0.5 : 0);
      const cannibalizationRisk = riskySlugs.has(post.slug) ? 1 : 0;
      const factcheckRisk = computeFactCheckFlag(post).flagged ? 1 : 0;

      const score = intentClarity * 2 + keywordSpecificity * 2 + clusterImportance * 2 + internalLinkCentrality * 2
        + pillarConnection * 1 + Math.min(1, titleSeverity) * 2 - cannibalizationRisk * 2 - factcheckRisk * 1;

      return { post, meta, clusterSlug, score: Math.round(score * 100) / 100 };
    })
    .sort((a, b) => b.score - a.score);

  const top100 = scored.slice(0, TOP_N);

  // 2) top100 개별 재판정: suggestTitle() 결과물이 (a) 대표 키워드를 포함하고
  // (b) role-split 후보가 아니고 (c) 실제로 달라지고 (d) 다른 글의 현재
  // 제목이나 이 배치 내 다른 제안 제목과 충돌하지 않으면 새로 HIGH로 승격.
  // 2단계 HIGH 기준(원제목에 이미 keyword가 있어야 함)보다는 "결과물 품질"
  // 기준으로 재판정한다는 점이 다르다 — top100은 이미 우선순위 검증을
  // 거쳤으므로 이 정도 재확인이면 안전하다고 판단.
  const allTitlesLower = new Set(posts.map(p => p.title.trim().toLowerCase()));
  const proposedTitlesThisBatch = new Set<string>();

  const rows: Record<string, unknown>[] = [];
  let newlyHighCount = 0;
  const backupPosts: AuditPost[] = [];

  top100.forEach((item, i) => {
    const { post, meta, clusterSlug, score } = item;
    const proposedTitle = suggestTitle(post);
    const proposedDescription = suggestDescription(post);

    const collides = proposedTitle.trim().toLowerCase() !== post.title.trim().toLowerCase()
      && (allTitlesLower.has(proposedTitle.trim().toLowerCase()) || proposedTitlesThisBatch.has(proposedTitle.trim().toLowerCase()));

    let newConfidence: TitleConfidence = meta.titleConfidence;
    let reason = meta.titleConfidenceReason;
    const kw = primaryKeyword(post);
    if (!kw) {
      reason = '대표 키워드 없음 — 재판정 불가, MEDIUM 유지';
    } else if (proposedTitle.trim() === post.title.trim()) {
      reason = '제안 제목이 원제목과 동일 — 변경할 것이 없음';
    } else if (collides) {
      reason = '제안 제목이 다른 글의 제목과 충돌 — 새 중복 위험 발생시키므로 승격 보류';
    } else if (meta.titleConfidenceReason.startsWith('role-split')) {
      reason = meta.titleConfidenceReason; // role-split은 그대로 LOW 유지
    } else {
      newConfidence = 'HIGH';
      reason = '재판정: 제안 제목이 대표 키워드+명확한 검색의도를 포함하고, 다른 글과 충돌하지 않아 안전하게 적용 가능';
      proposedTitlesThisBatch.add(proposedTitle.trim().toLowerCase());
      newlyHighCount++;
    }

    rows.push({
      rank: i + 1,
      post_id: post.slug,
      url: `${SITE_URL}/blog/${post.slug}/`,
      category: post.categoryName ?? post.category ?? '',
      cluster: clusterSlug,
      old_title: post.title,
      proposed_title: proposedTitle,
      primary_keyword: kw,
      search_intent: meta.searchIntent,
      optimization_score: score,
      reason: `${meta.titleConfidenceReason} → 재판정: ${reason} [${newConfidence}]`,
    });

    if (newConfidence === 'HIGH') {
      backupPosts.push(post);
      const filePath = path.join(BLOG_DIR, `${post.slug}.mdx`);
      let raw = fs.readFileSync(filePath, 'utf-8');
      let changed = false;
      if (proposedTitle !== post.title) {
        const r = replaceYamlStringField(raw, 'title', proposedTitle);
        if (r.changed) { raw = r.raw; changed = true; }
      }
      if (proposedDescription && proposedDescription !== post.description) {
        const r = replaceYamlStringField(raw, 'description', proposedDescription);
        if (r.changed) { raw = r.raw; changed = true; }
      }
      if (changed) fs.writeFileSync(filePath, raw, 'utf-8');
    }
  });

  ensureAuditDir();
  const columns = ['rank', 'post_id', 'url', 'category', 'cluster', 'old_title', 'proposed_title', 'primary_keyword', 'search_intent', 'optimization_score', 'reason'];
  fs.writeFileSync(path.join(AUDIT_DIR, 'title-phase3-top100.csv'), toCsv(columns, rows), 'utf-8');

  const backupDir = path.join(process.cwd(), 'backup');
  fs.mkdirSync(backupDir, { recursive: true });
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  fs.writeFileSync(path.join(backupDir, `posts-before-title-phase3-${dateStr}.json`), JSON.stringify(backupPosts, null, 2), 'utf-8');

  console.log(`MEDIUM ${scored.length}개 중 상위 ${top100.length}개 선정 완료`);
  console.log(`재판정 결과: 새로 HIGH ${newlyHighCount}개 → 실제 적용, 나머지 ${top100.length - newlyHighCount}개는 MEDIUM/LOW 유지(파일 미수정)`);
  console.log(`백업: backup/posts-before-title-phase3-${dateStr}.json (${backupPosts.length}개)`);
  console.log('출력: seo-audit/title-phase3-top100.csv');
}

main();
