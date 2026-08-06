import { getMaxSlotsForLength } from '../config/coupangAds';

export interface TocItem {
  id: string;
  text: string;
}

type BoxTag = 'SummaryBox' | 'ChecklistBox' | 'WarningBox';

// 본문 안의 특정 섹션(결론/체크리스트/주의사항)을 감지해 강조 박스 컴포넌트로 감싼다.
const BOX_RULES: { match: (heading: string) => boolean; tag: BoxTag }[] = [
  { match: h => h.includes('체크리스트'), tag: 'ChecklistBox' },
  { match: h => h.includes('오히려') || h.includes('악화'), tag: 'WarningBox' },
  { match: h => h.includes('결론'), tag: 'SummaryBox' },
];

function matchBoxTag(heading: string): BoxTag | null {
  return BOX_RULES.find(rule => rule.match(heading))?.tag ?? null;
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// remark-gfm 없이는 "- [ ] 항목"의 [ ]가 그대로 텍스트로 보이므로 제거한다.
// ChecklistBox가 자체 체크 아이콘을 붙여주므로 원본 마커는 필요 없다.
function stripTaskListMarker(line: string): string {
  return line.replace(/^(\s*[-*]\s+)\[[ xX]\]\s+/, '$1');
}

interface RawSection {
  heading: string;
  body: string;
}

// "## 소제목" 단위로 본문을 나눈다. 첫 소제목 이전에 나온 내용은 별도로 반환한다.
function parseSections(markdown: string): { leading: string; sections: RawSection[] } {
  const lines = markdown.split('\n');
  const sections: RawSection[] = [];
  const leadingBuffer: string[] = [];
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  function flush() {
    const body = buffer.join('\n').trim();
    if (currentHeading === null) {
      if (body) leadingBuffer.push(body);
    } else {
      sections.push({ heading: currentHeading, body });
    }
  }

  for (const line of lines) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      flush();
      currentHeading = heading[1];
      buffer = [];
    } else {
      buffer.push(stripTaskListMarker(line));
    }
  }
  flush();

  return { leading: leadingBuffer.join('\n\n'), sections };
}

// poolSize개의 후보(0-based 인덱스) 중 count개를 최대한 고르게 떨어뜨려 고른다.
// 광고 슬롯을 글 전체에 균등하게 분산 배치하기 위해 쓴다.
function pickEvenIndices(count: number, poolSize: number): number[] {
  if (count <= 0 || poolSize <= 0) return [];
  const result: number[] = [];
  for (let k = 1; k <= count; k++) {
    const idx = Math.min(poolSize - 1, Math.floor((k * poolSize) / (count + 1)));
    if (!result.includes(idx)) result.push(idx);
  }
  return result;
}

export interface ProcessArticleBodyOptions {
  // true여야 광고 삽입 로직 자체가 동작한다 (AI 매칭 + 자동 분산 배치 모두 포함).
  // 글별 AI 판단(shouldInsertAds)을 그대로 반영하기 위한 명시적 스위치 —
  // affiliateSlotAfterHeadings가 없거나 비어 있어도 이 값이 true면 아래
  // "자동 분산 배치"가 동작해 소제목 매칭 없이도 슬롯을 채운다.
  affiliateAdsEnabled?: boolean;
  // AI가 지정한, 광고를 배치할 섹션 제목들(최대 4개). 본문의 "## 소제목"과
  // (부분) 일치하면 그 섹션 바로 뒤에 CoupangPartnersCarousel 태그를 삽입한다.
  affiliateSlotAfterHeadings?: string[];
  // affiliateSlotAfterHeadings와 같은 순서·개수의 슬롯별 광고 제목.
  affiliateSlotTitles?: string[];
  affiliateSlotProps?: {
    category?: string;
    categoryName?: string;
  };
}

export interface ProcessArticleBodyResult {
  mdx: string;
  toc: TocItem[];
  // 실제로 본문 중간에 배치된 광고 슬롯 개수(AI 매칭 + 자동 분산 배치 합산).
  // 0이면 호출자가 글 맨 끝에 하나 배치하는 기본 동작으로 대체해야 한다.
  affiliateSlotsPlaced: number;
}

/**
 * "## 소제목" 단위로 본문을 나눠 목차를 추출하고, 결론/체크리스트/주의사항 섹션은
 * 강조 박스 JSX 태그로 감싼 MDX 문자열을 만들어 반환한다.
 *
 * 광고가 활성화된 글(affiliateAdsEnabled: true)은 AI가 지정한 소제목 뒤에
 * 우선 배치하고, 그래도 목표 개수(글 길이에 따라 최대 3개, config의
 * getMaxSlotsForLength가 정하는 상한 이내)를 못 채우면 나머지 소제목 중에서
 * 고르게 떨어진 위치를 자동으로 골라 채운다 — 그래야 AI 매칭 데이터가 없는
 * 글도 "본문 끝에 광고 1개만" 뜨는 대신 글 전체에 걸쳐 여러 개가 분산된다.
 */
export function processArticleBody(markdown: string, options: ProcessArticleBodyOptions = {}): ProcessArticleBodyResult {
  const { leading, sections } = parseSections(markdown);
  const toc: TocItem[] = sections.map((s, i) => ({ id: `section-${i}`, text: s.heading }));

  // 섹션 인덱스 → 그 섹션 뒤에 넣을 광고의 aiTitle(없으면 undefined, 카테고리 기본 문구 사용).
  const insertAfter = new Map<number, string | undefined>();

  if (options.affiliateAdsEnabled) {
    const targetHeadings = (options.affiliateSlotAfterHeadings ?? []).map(h => h.trim()).filter(Boolean);
    const usedTargetIndexes = new Set<number>();

    sections.forEach((section, i) => {
      const matchedIndex = targetHeadings.findIndex((t, ti) => !usedTargetIndexes.has(ti) && section.heading.includes(t));
      if (matchedIndex !== -1) {
        usedTargetIndexes.add(matchedIndex);
        insertAfter.set(i, options.affiliateSlotTitles?.[matchedIndex]);
      }
    });

    const desiredSlots = Math.min(3, getMaxSlotsForLength(markdown.length));
    const remaining = desiredSlots - insertAfter.size;
    if (remaining > 0 && sections.length > 2) {
      // 첫 섹션(도입부) 바로 뒤, 마지막 섹션(보통 체크리스트/마무리) 뒤는 제외한다.
      const eligible = sections
        .map((_, i) => i)
        .filter(i => i !== 0 && i !== sections.length - 1 && !insertAfter.has(i));
      const pickCount = Math.min(remaining, eligible.length);
      for (const pos of pickEvenIndices(pickCount, eligible.length)) {
        insertAfter.set(eligible[pos], undefined);
      }
    }
  }

  const blocks: string[] = [];
  if (leading) blocks.push(leading);

  sections.forEach((section, i) => {
    const id = `section-${i}`;
    const boxTag = matchBoxTag(section.heading);
    if (boxTag) {
      blocks.push(`<${boxTag} id="${id}" title="${escapeAttr(section.heading)}">\n\n${section.body}\n\n</${boxTag}>`);
    } else {
      blocks.push(`<h2 id="${id}">${escapeAttr(section.heading)}</h2>\n\n${section.body}`);
    }

    if (insertAfter.has(i)) {
      const p = options.affiliateSlotProps ?? {};
      const slotTitle = insertAfter.get(i);
      const attrs = [
        p.category ? `category="${escapeAttr(p.category)}"` : '',
        p.categoryName ? `categoryName="${escapeAttr(p.categoryName)}"` : '',
        slotTitle ? `aiTitle="${escapeAttr(slotTitle)}"` : '',
      ].filter(Boolean).join(' ');
      blocks.push(`<CoupangPartnersCarousel ${attrs} />`);
    }
  });

  return { mdx: blocks.join('\n\n'), toc, affiliateSlotsPlaced: insertAfter.size };
}
