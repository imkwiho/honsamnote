import { describe, it, expect } from 'vitest';
import { buildContextualSentence, insertBeforeLastHeading, hasContextualLinkAlready } from '../contextualLinks';

describe('buildContextualSentence', () => {
  it('마크다운 링크 문법으로 앵커 텍스트를 감싼다', () => {
    const sentence = buildContextualSentence('배수구 냄새 제거 방법', 'some-slug', 0);
    expect(sentence).toContain('[배수구 냄새 제거 방법](/blog/some-slug/)');
  });

  it('templateIndex가 다르면 다른 문장 형태를 반환한다(동일 문장 반복 방지)', () => {
    const s1 = buildContextualSentence('앵커', 'a', 0);
    const s2 = buildContextualSentence('앵커', 'a', 1);
    expect(s1).not.toBe(s2);
  });

  it('templateIndex가 범위를 넘거나 음수여도 항상 유효한 템플릿을 고른다', () => {
    expect(() => buildContextualSentence('앵커', 'a', 999)).not.toThrow();
    expect(() => buildContextualSentence('앵커', 'a', -3)).not.toThrow();
  });
});

describe('insertBeforeLastHeading', () => {
  it('마지막 "## " 소제목 바로 앞에 새 문단으로 삽입한다', () => {
    const content = '## 첫 섹션\n내용1\n\n## 마지막 섹션\n내용2';
    const result = insertBeforeLastHeading(content, '[링크](/blog/x/)');
    expect(result.inserted).toBe(true);
    expect(result.content).toBe('## 첫 섹션\n내용1\n\n[링크](/blog/x/)\n\n## 마지막 섹션\n내용2');
  });

  it('소제목이 없으면 건너뛰고 원본을 그대로 반환한다', () => {
    const content = '그냥 평범한 문단입니다.';
    const result = insertBeforeLastHeading(content, '[링크](/blog/x/)');
    expect(result.inserted).toBe(false);
    expect(result.content).toBe(content);
    expect(result.reason).toBeTruthy();
  });

  it('마지막 소제목이 문서 맨 앞이면(삽입할 앞 내용이 없으면) 건너뛴다', () => {
    const content = '## 유일한 섹션\n내용';
    const result = insertBeforeLastHeading(content, '[링크](/blog/x/)');
    expect(result.inserted).toBe(false);
  });

  it('소제목이 여러 개면 반드시 마지막 것 앞에만 삽입한다', () => {
    const content = '## A\n내용A\n\n## B\n내용B\n\n## C\n내용C';
    const result = insertBeforeLastHeading(content, '[링크](/blog/x/)');
    expect(result.content).toBe('## A\n내용A\n\n## B\n내용B\n\n[링크](/blog/x/)\n\n## C\n내용C');
  });
});

describe('hasContextualLinkAlready', () => {
  it('실제로 삽입한 문장 형태(줄이 마크다운 링크로 시작)를 감지한다', () => {
    const sentence = buildContextualSentence('배수구 냄새 제거', 'target', 0);
    const content = `## 체크리스트\n내용\n\n${sentence}\n\n## 마지막\n끝`;
    expect(hasContextualLinkAlready(content)).toBe(true);
  });

  it('/blog/ 링크가 전혀 없는 일반 본문에는 반응하지 않는다', () => {
    const content = '## 문제 상황\n평범한 문단입니다. 아무 링크도 없습니다.';
    expect(hasContextualLinkAlready(content)).toBe(false);
  });

  it('삽입 후 재실행 가드로 쓸 수 있다 — 이미 삽입된 글은 다시 삽입 대상에서 제외해야 한다', () => {
    const original = '## 첫 섹션\n내용\n\n## 체크리스트\n마지막';
    const sentence = buildContextualSentence('앵커', 'target-slug', 2);
    const { content: afterFirstInsert } = insertBeforeLastHeading(original, sentence);
    expect(hasContextualLinkAlready(afterFirstInsert)).toBe(true);
  });
});
