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

export interface ProcessArticleBodyOptions {
  // AI가 지정한, 광고를 배치할 섹션 제목. 본문의 "## 소제목"과 (부분) 일치하면
  // 그 섹션 바로 뒤에 CoupangPartnersCarousel 태그를 삽입한다.
  affiliateSlotAfterHeading?: string | null;
  affiliateSlotProps?: {
    category?: string;
    categoryName?: string;
    aiTitle?: string;
  };
}

export interface ProcessArticleBodyResult {
  mdx: string;
  toc: TocItem[];
  // affiliateSlotAfterHeading이 지정되었고 실제로 본문 중간에 배치됐는지 여부.
  // false면 호출자가 글 맨 끝에 광고를 배치하는 기본 동작으로 대체해야 한다.
  affiliateSlotPlaced: boolean;
}

/**
 * "## 소제목" 단위로 본문을 나눠 목차를 추출하고, 결론/체크리스트/주의사항 섹션은
 * 강조 박스 JSX 태그로 감싼 MDX 문자열을 만들어 반환한다.
 */
export function processArticleBody(markdown: string, options: ProcessArticleBodyOptions = {}): ProcessArticleBodyResult {
  const lines = markdown.split('\n');
  const toc: TocItem[] = [];
  const blocks: string[] = [];
  const targetHeading = options.affiliateSlotAfterHeading?.trim();
  let affiliateSlotPlaced = false;

  let currentHeading: string | null = null;
  let buffer: string[] = [];
  let index = 0;

  function flush() {
    const body = buffer.join('\n').trim();
    if (currentHeading === null) {
      if (body) blocks.push(body);
      return;
    }
    const id = `section-${index}`;
    const boxTag = matchBoxTag(currentHeading);
    toc.push({ id, text: currentHeading });
    if (boxTag) {
      blocks.push(`<${boxTag} id="${id}" title="${escapeAttr(currentHeading)}">\n\n${body}\n\n</${boxTag}>`);
    } else {
      blocks.push(`<h2 id="${id}">${escapeAttr(currentHeading)}</h2>\n\n${body}`);
    }

    if (!affiliateSlotPlaced && targetHeading && currentHeading.includes(targetHeading)) {
      const p = options.affiliateSlotProps ?? {};
      const attrs = [
        p.category ? `category="${escapeAttr(p.category)}"` : '',
        p.categoryName ? `categoryName="${escapeAttr(p.categoryName)}"` : '',
        p.aiTitle ? `aiTitle="${escapeAttr(p.aiTitle)}"` : '',
      ].filter(Boolean).join(' ');
      blocks.push(`<CoupangPartnersCarousel ${attrs} />`);
      affiliateSlotPlaced = true;
    }

    index += 1;
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

  return { mdx: blocks.join('\n\n'), toc, affiliateSlotPlaced };
}
