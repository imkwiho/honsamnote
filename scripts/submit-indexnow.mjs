// 새로 발행되거나 수정된 글의 URL만 네이버 IndexNow에 즉시 제출한다.
// 전체 사이트맵을 반복 제출하지 않고, 이번에 실제로 바뀐 slug만 넘긴다.
//
// 사용법: node scripts/submit-indexnow.mjs <slug1> <slug2> ...
// 환경변수: INDEXNOW_KEY (없으면 조용히 건너뜀 — 글 발행 자체는 막지 않는다)
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://honsamnote.co.kr').replace(/\/+$/, '');
const KEY = process.env.INDEXNOW_KEY;

async function main() {
  const slugs = process.argv.slice(2).filter(Boolean);

  if (!KEY) {
    console.log('INDEXNOW_KEY가 설정되지 않아 IndexNow 제출을 건너뜁니다.');
    return;
  }
  if (slugs.length === 0) {
    console.log('제출할 새 글이 없어 IndexNow 요청을 보내지 않습니다.');
    return;
  }

  const urlList = slugs.map(slug => `${SITE_URL}/blog/${slug}/`);
  const host = new URL(SITE_URL).host;

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key: KEY, keyLocation: `${SITE_URL}/${KEY}.txt`, urlList }),
    });

    if (res.ok) {
      console.log(`IndexNow 제출 완료 (${urlList.length}개):`);
      urlList.forEach(u => console.log(' -', u));
    } else {
      console.warn(`IndexNow 제출 실패 (HTTP ${res.status}) — 발행 자체는 정상 진행됩니다.`);
    }
  } catch (err) {
    console.warn('IndexNow 제출 중 네트워크 오류 — 발행 자체는 정상 진행됩니다:', err.message);
  }
}

main();
