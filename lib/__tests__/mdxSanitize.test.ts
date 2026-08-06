import { describe, it, expect } from 'vitest';
import { sanitizeMdxContent, selfCloseVoidElements } from '../mdxSanitize';

describe('sanitizeMdxContent', () => {
  it('"<->" 같은 화살표 표기는 이스케이프한다(실제 빌드 실패 사례)', () => {
    const input = '자주 <-> 거의 안 씀';
    expect(sanitizeMdxContent(input)).toBe('자주 &lt;-> 거의 안 씀');
  });

  it('"<5분"처럼 숫자가 바로 따라오는 경우도 이스케이프한다', () => {
    expect(sanitizeMdxContent('설치 시간은 <5분 소요됩니다')).toBe('설치 시간은 &lt;5분 소요됩니다');
  });

  it('공백이나 기호가 바로 따라오는 경우도 이스케이프한다', () => {
    expect(sanitizeMdxContent('가격이 < 1만원')).toBe('가격이 &lt; 1만원');
  });

  it('영문/한글로 시작하는 정상적인 태그처럼 보이는 텍스트는 건드리지 않는다', () => {
    expect(sanitizeMdxContent('<div>내용</div>')).toBe('<div>내용</div>');
    // <br/>은 selfCloseVoidElements가 <br />로 정규화한다(둘 다 유효한 자기 닫힘 형태).
    expect(sanitizeMdxContent('설명 <br/> 다음 줄')).toBe('설명 <br /> 다음 줄');
  });

  it('닫는 태그(/), 프래그먼트(>), 주석(!), $, _ 로 시작하면 건드리지 않는다', () => {
    expect(sanitizeMdxContent('</div>')).toBe('</div>');
    expect(sanitizeMdxContent('<>fragment</>')).toBe('<>fragment</>');
    expect(sanitizeMdxContent('<!-- comment -->')).toBe('<!-- comment -->');
  });

  it('"<"가 없는 일반 텍스트는 그대로 반환한다', () => {
    const text = '평범한 문장입니다.';
    expect(sanitizeMdxContent(text)).toBe(text);
  });

  it('여러 번 등장해도 전부 처리한다', () => {
    expect(sanitizeMdxContent('a <-1 b <-2 c')).toBe('a &lt;-1 b &lt;-2 c');
  });
});

describe('selfCloseVoidElements', () => {
  it('닫히지 않은 <br>을 자기 닫힘 형태로 고친다(실제 빌드 실패 사례)', () => {
    expect(selfCloseVoidElements('첫째 줄<br>둘째 줄')).toBe('첫째 줄<br />둘째 줄');
  });

  it('표 셀 안에서 여러 번 등장해도 전부 고친다', () => {
    const input = '| 항목 | 내용 |\n| --- | --- |\n| 비용 | 초기 수만원<br>추후 수십만원 |';
    const result = selfCloseVoidElements(input);
    expect(result).not.toContain('<br>');
    expect((result.match(/<br \/>/g) ?? []).length).toBe(1);
  });

  it('이미 자기 닫힘 형태면 그대로 둔다(중복 처리 방지)', () => {
    expect(selfCloseVoidElements('줄1<br/>줄2')).toBe('줄1<br />줄2');
    expect(selfCloseVoidElements('줄1<br />줄2')).toBe('줄1<br />줄2');
  });

  it('속성이 있는 void 요소도 올바르게 처리한다', () => {
    expect(selfCloseVoidElements('<hr class="divider">')).toBe('<hr class="divider" />');
  });

  it('void 요소가 아닌 일반 태그는 건드리지 않는다', () => {
    expect(selfCloseVoidElements('<strong>굵게</strong>')).toBe('<strong>굵게</strong>');
  });
});

describe('sanitizeMdxContent (통합)', () => {
  it('두 문제가 함께 있어도 둘 다 고친다', () => {
    const input = '자주 <-> 거의, 줄바꿈<br>다음 줄';
    const result = sanitizeMdxContent(input);
    expect(result).toBe('자주 &lt;-> 거의, 줄바꿈<br />다음 줄');
  });
});
