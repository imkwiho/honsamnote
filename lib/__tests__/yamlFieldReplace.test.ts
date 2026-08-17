import { describe, it, expect } from 'vitest';
import matter from 'gray-matter';
import { replaceYamlStringField } from '../yamlFieldReplace';

describe('replaceYamlStringField', () => {
  it('작은따옴표 한 줄 형식(title에서 흔함)을 교체한다', () => {
    const raw = `---\ntitle: '기존 제목'\ndate: '2026-08-01'\n---\n본문`;
    const result = replaceYamlStringField(raw, 'title', '새 제목');
    expect(result.changed).toBe(true);
    expect(result.raw).toContain('title: "새 제목"');
    expect(result.raw).not.toContain('기존 제목');
  });

  it('큰따옴표 한 줄 형식도 교체한다', () => {
    const raw = `---\ntitle: "기존 제목"\n---\n본문`;
    const result = replaceYamlStringField(raw, 'title', '새 제목');
    expect(result.changed).toBe(true);
    expect(result.raw).toContain('title: "새 제목"');
  });

  it('실제 파일에서 확인된 folded block scalar 형식(description)을 교체한다', () => {
    const raw = [
      '---',
      "title: '테스트'",
      'description: >-',
      '  계절마다 옷 정리로 고생하는 1인 가구 직장인 주목! 좁은 원룸에서도 시간과 돈 아끼며 계절옷을 깔끔하고 효율적으로 보관하는 현실적인 팁을',
      '  알려드립니다.',
      "date: '2026-07-30'",
      'tags:',
      '  - 1인 가구',
      '---',
      '본문 시작',
    ].join('\n');
    const result = replaceYamlStringField(raw, 'description', '새로운 짧은 설명입니다.');
    expect(result.changed).toBe(true);
    expect(result.raw).toContain('description: "새로운 짧은 설명입니다."');
    expect(result.raw).not.toContain('계절마다');
    expect(result.raw).not.toContain('알려드립니다');
    // block scalar 다음 필드(date)는 그대로 남아 있어야 한다.
    expect(result.raw).toContain("date: '2026-07-30'");
  });

  it('실제 버그 재현: CRLF(\\r\\n) 줄바꿈을 쓰는 block scalar도 정확히 교체한다', () => {
    // 실제 사례: description: >-\r\n 처럼 ">-"와 "\n" 사이에 "\r"이 끼어
    // 있어서, \r을 고려하지 않은 정규식은 전혀 매치하지 못하고 조용히
    // changed:false를 반환했다(41건 전부 description 미적용).
    const raw =
      '---\r\n' +
      'title: "냉장고 냄새 방법｜냉장고 청소법"\r\n' +
      'description: >-\r\n' +
      '  퇴근 후 지친 몸으로 냉장고 문을 열었을 때, 역한 냄새가 난다면? 1인 가구를 위한 냉장고 악취의 원인부터 빠르고 확실하게 해결하는 청소\r\n' +
      '  및 관리 팁을 알려드립니다.\r\n' +
      "date: '2026-07-30'\r\n" +
      'tags:\r\n' +
      '  - 냉장고 청소\r\n' +
      '---\r\n' +
      '\r\n' +
      '## 문제 상황\r\n';
    const result = replaceYamlStringField(raw, 'description', '냉장고 냄새 제거 순서를 정리했습니다.');
    expect(result.changed).toBe(true);
    expect(result.raw).toContain('description: "냉장고 냄새 제거 순서를 정리했습니다."');
    expect(result.raw).not.toContain('퇴근 후 지친 몸');
    // date/tags 등 뒤따르는 필드가 CRLF 그대로 안전하게 보존되어야 한다.
    expect(result.raw).toContain("date: '2026-07-30'\r\n");
    const parsed = matter(result.raw);
    expect(parsed.data.description).toBe('냉장고 냄새 제거 순서를 정리했습니다.');
    expect(parsed.data.date).toBe('2026-07-30');
  });

  it('CRLF 한 줄 따옴표 title을 교체해도 뒤따르는 줄의 개행 스타일을 그대로 유지한다', () => {
    const raw = '---\r\n' + "title: '기존 제목'\r\n" + "date: '2026-08-01'\r\n" + '---\r\n' + '본문\r\n';
    const result = replaceYamlStringField(raw, 'title', '새 제목');
    expect(result.raw).toContain('title: "새 제목"\r\n');
    expect(result.raw).toContain("date: '2026-08-01'\r\n");
  });

  it('실제 버그 재현: 따옴표 없는 한 줄 값(특수문자가 없어 YAML이 안 감싼 경우)도 교체한다', () => {
    // 실제 사례: description: 여름철 에어컨 냄새와 전기세 걱정? ... — 따옴표도
    // block scalar도 아닌 형태라 앞의 두 패턴 모두 매치하지 못해 41건 중
    // 1건만 description이 조용히 적용 안 됐다.
    const raw =
      "title: '테스트'\n" +
      'description: 여름철 에어컨 냄새와 전기세 걱정? 1인 가구를 위한 에어컨 필터 직접 청소와 전문 서비스 비교 가이드로 시간과 돈을 최적화하세요.\n' +
      "date: '2026-08-06'\n" +
      'tags:\n' +
      '  - 에어컨 청소\n';
    const result = replaceYamlStringField(raw, 'description', '에어컨 필터 청소 방법을 정리했습니다.');
    expect(result.changed).toBe(true);
    expect(result.raw).toContain('description: "에어컨 필터 청소 방법을 정리했습니다."');
    expect(result.raw).not.toContain('여름철 에어컨');
    expect(result.raw).toContain("date: '2026-08-06'");
    const parsed = matter(`---\n${result.raw}---\n본문`);
    expect(parsed.data.description).toBe('에어컨 필터 청소 방법을 정리했습니다.');
  });

  it('따옴표 없는 값 뒤에 목록(tags:)이 바로 이어져도 그 목록을 값의 일부로 삼키지 않는다', () => {
    const raw = 'description: 특수문자 없는 짧은 설명\ntags:\n  - 태그1\n  - 태그2\n';
    const result = replaceYamlStringField(raw, 'description', '새 설명');
    expect(result.raw).toContain('tags:\n  - 태그1\n  - 태그2');
  });

  it('교체 후에도 gray-matter로 정상 파싱 가능해야 한다(실제 사용성 검증)', () => {
    const raw = [
      '---',
      "title: '기존 제목'",
      'description: >-',
      '  기존 설명 문장입니다.',
      "date: '2026-08-01'",
      '---',
      '## 본문',
      '내용',
    ].join('\n');
    const { raw: titleReplaced } = replaceYamlStringField(raw, 'title', '새 제목입니다');
    const { raw: bothReplaced } = replaceYamlStringField(titleReplaced, 'description', '새 설명, 쉼표와 "따옴표" 포함');
    const parsed = matter(bothReplaced);
    expect(parsed.data.title).toBe('새 제목입니다');
    expect(parsed.data.description).toBe('새 설명, 쉼표와 "따옴표" 포함');
    expect(parsed.data.date).toBe('2026-08-01');
    expect(parsed.content.trim()).toBe('## 본문\n내용');
  });

  it('큰따옴표나 백슬래시가 포함된 새 값을 안전하게 이스케이프한다', () => {
    const raw = `---\ntitle: '기존'\n---\n본문`;
    const result = replaceYamlStringField(raw, 'title', '따옴표 "포함" 제목');
    const parsed = matter(result.raw);
    expect(parsed.data.title).toBe('따옴표 "포함" 제목');
  });

  it('필드가 존재하지 않으면 변경 없이 원본을 그대로 반환한다', () => {
    const raw = `---\ntitle: '기존'\n---\n본문`;
    const result = replaceYamlStringField(raw, 'nonexistent', '값');
    expect(result.changed).toBe(false);
    expect(result.raw).toBe(raw);
  });

  it('본문(front matter 밖)의 비슷한 텍스트는 건드리지 않는다', () => {
    const raw = `---\ntitle: '기존'\n---\ntitle: 이것은 본문에 등장하는 단어일 뿐입니다`;
    const result = replaceYamlStringField(raw, 'title', '새 제목');
    // front matter의 title만 바뀌고 본문 텍스트는 그대로여야 한다.
    const parsed = matter(result.raw);
    expect(parsed.data.title).toBe('새 제목');
    expect(parsed.content).toContain('title: 이것은 본문에 등장하는 단어일 뿐입니다');
  });
});
