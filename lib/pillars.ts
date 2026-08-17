// SEO 2단계 §3 — A등급 Pillar 정의. seo-audit/pillar-plan.csv에서 "A" 판정을
// 받은 3개 클러스터(oneroom-storage/laundry-clothing/loneliness-isolation)만
// 다룬다. intro/whatItSolves 문구는 실제 하위 글 목록을 직접 훑어보고 쓴
// 것이며, 존재하지 않는 통계나 효과를 지어내지 않는다.
import { type AuditPost } from './seoAudit';

export interface PillarSubTopic {
  name: string;
  matchHints: string[]; // title/keywords/tags에서 찾는 힌트 표현
}

export interface Pillar {
  id: string;
  slug: string;
  clusterId: string; // lib/seoAudit.ts CLUSTER_TAXONOMY의 클러스터 slug
  name: string;
  intro: string;
  whatItSolves: string;
  subTopics: PillarSubTopic[];
}

export const PILLARS: Pillar[] = [
  {
    id: 'oneroom-storage-guide',
    slug: 'oneroom-storage',
    clusterId: 'oneroom-storage',
    name: '좁은 원룸 수납 가이드',
    intro:
      '좁은 원룸에서는 물건 하나하나의 자리보다 "무엇을 어떻게 숨기고, 필요할 때 바로 꺼내 쓸지"가 더 중요합니다. 옷과 계절용품부터 청소도구, 자주 안 쓰는 짐, 수납 가구 선택까지 — 실제로 공간을 넓게 만들어주는 방법을 주제별로 모았습니다.',
    whatItSolves:
      '물건은 계속 느는데 공간은 그대로인 원룸에서, 눈에 보이는 답답함을 줄이고 필요한 물건을 빠르게 찾을 수 있게 합니다.',
    subTopics: [
      { name: '옷·의류 수납', matchHints: ['옷장', '의류', '리프레시', '계절옷', '이불', '한 번 입은 옷'] },
      { name: '주방·욕실 주변 수납', matchHints: ['냉장고', '싱크대', '하부장', '욕실 물건', '식료품', '팬트리', '신발장'] },
      { name: '책상·소품 정리', matchHints: ['서류', '영수증', '지갑', '열쇠', '소품', '잡동사니', '케이블'] },
      { name: '자주 안 쓰는 물건·부피 큰 짐', matchHints: ['부피 큰', '캐리어', '홈트', '청소 도구', '공구', '틈새 공간', '계절 가전', '추억의 물건'] },
      { name: '벽면·공간 활용', matchHints: ['벽면', '벽 선반', '페그보드', '못 박기', '스툴', '다기능 수납 가구'] },
      { name: '수납 용품 선택 기준', matchHints: ['압축팩', '수납함', '수납장', '수납 용품', '오픈형', '문 있는'] },
    ],
  },
  {
    id: 'laundry-guide',
    slug: 'laundry',
    clusterId: 'laundry-clothing',
    name: '1인 가구 세탁·옷 관리 가이드',
    intro:
      '세탁기 냄새부터 얼룩 제거, 건조 방법, 소재별 세탁법까지 — 혼자 살면서 반복되는 빨래 고민을 한 곳에 모았습니다.',
    whatItSolves:
      '세탁기 관리를 소홀히 해서 생기는 냄새, 잘못된 세탁으로 옷을 망치는 일, 건조 공간 부족 문제를 실제로 줄일 수 있습니다.',
    subTopics: [
      { name: '세탁기 관리·냄새 제거', matchHints: ['세탁기', '곰팡이', '냄새', '고무패킹', '세제 투입구'] },
      { name: '얼룩·옷감 손상 대처', matchHints: ['얼룩', '보풀', '옷걸이 자국', '줄어들', '늘어났'] },
      { name: '건조 방법 비교', matchHints: ['건조기', '제습기', '건조대', '건조 시트', '드라이볼'] },
      { name: '세제·세탁법 선택', matchHints: ['세제', '드라이클리닝', '분리 세탁', '침구', '커튼'] },
    ],
  },
  {
    id: 'loneliness-guide',
    slug: 'loneliness',
    clusterId: 'loneliness-isolation',
    name: '혼자 사는 삶의 외로움·고립감 관리 가이드',
    intro:
      '혼자 사는 삶에서 자연스럽게 찾아오는 무기력함과 외로움을 다루는 방법을 모았습니다. 완전히 없애는 것이 아니라, 나에게 맞는 방식으로 관리하는 데 초점을 맞췄습니다.',
    whatItSolves:
      '퇴근 후·주말의 무기력, 명절이나 기념일에 유독 크게 느껴지는 외로움, 관계 유지의 피로감을 스스로 점검하고 다룰 수 있게 합니다.',
    subTopics: [
      { name: '무기력·생활 리듬 회복', matchHints: ['무기력', '생활 리듬', '루틴', '재택'] },
      { name: '관계·소셜 에너지 관리', matchHints: ['소셜 에너지', '친구', '관계', '커뮤니티', '약속'] },
      { name: '특별한 날 대처', matchHints: ['명절', '기념일', '연말연시', '이별'] },
      { name: '전문적인 도움 찾기', matchHints: ['상담', '반려동물', 'AI 스피커', '감정'] },
    ],
  },
];

export function getPillarForCluster(clusterId: string): Pillar | undefined {
  return PILLARS.find(p => p.clusterId === clusterId);
}

export function getPillarBySlug(slug: string): Pillar | undefined {
  return PILLARS.find(p => p.slug === slug);
}

/** 클러스터 안의 한 게시글을 Pillar의 하위 주제 중 가장 잘 맞는 것으로 배정한다. 매칭 실패 시 "기타". */
export function assignSubTopic(post: AuditPost, pillar: Pillar): string {
  const haystack = [post.title, ...post.keywords, ...post.tags].join(' ');
  let best: PillarSubTopic | undefined;
  let bestScore = 0;
  for (const sub of pillar.subTopics) {
    const score = sub.matchHints.reduce((acc, hint) => (haystack.includes(hint) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      best = sub;
    }
  }
  return best?.name ?? '기타';
}
