// SEO 2단계 §11-13에서 title/description 필드만 안전하게 교체하기 위한
// 순수 함수. front matter 전체를 matter.stringify로 재작성하지 않는다 —
// 1단계에서 "YAML을 통째로 재포맷하면 안 바뀐 파일까지 흔들린다"는 걸
// 실제로 겪었기 때문에, 정확히 그 필드 하나만 문자열 수준에서 바꾼다.
//
// 실제 파일에서 확인된 세 가지 형태를 모두 처리해야 한다:
//   1) 한 줄 따옴표: title: '...' 또는 title: "..."
//   2) 여러 줄 folded block scalar(description에서 흔함):
//        description: >-
//          문장1
//          문장2
//   3) 따옴표 없는 한 줄 값(특수문자가 없어 YAML이 안 감싼 경우):
//        description: 여름철 에어컨 냄새와 전기세 걱정? ...
export interface ReplaceResult {
  raw: string;
  changed: boolean;
}

// 이 저장소는 CRLF(\r\n)와 LF(\n)가 파일마다, 심지어 한 파일 안에서도
// 섞여 있다(실제로 확인됨 — git core.autocrlf와 여러 도구를 거치며 생김).
// "\s*$"처럼 \r을 암묵적으로 삼켜버리는 패턴을 쓰면 그 줄만 개행이
// \r\n → \n으로 조용히 바뀌어버린다(실제로 겪은 문제). 그래서 개행 문자를
// 항상 "(\\r\\n|\\n)" 형태로 명시적으로 캡처해서 그대로 되돌려준다.
const EOL = '(\\r\\n|\\n)';

/** 새 값은 항상 한 줄 큰따옴표 형식으로 통일해서 넣는다(표준 YAML, 두 형태 전부 대체 가능). */
export function replaceYamlStringField(raw: string, key: string, newValue: string): ReplaceResult {
  const escaped = newValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const newValueLine = `${key}: "${escaped}"`;

  // 형태 1: 한 줄 따옴표 값
  const singleLineRe = new RegExp(`^${key}:[ \\t]*(?:".*?"|'.*?')[ \\t]*(?:${EOL}|$)`, 'm');
  const singleMatch = singleLineRe.exec(raw);
  if (singleMatch) {
    const eol = singleMatch[1] ?? '';
    const newRaw = raw.slice(0, singleMatch.index) + newValueLine + eol + raw.slice(singleMatch.index + singleMatch[0].length);
    return { raw: newRaw, changed: true };
  }

  // 형태 2: block scalar(>-, >, |-, | 등) — key 줄부터 들여쓰기된 줄이
  // 끝나는 지점(다음 top-level 줄 또는 문서 끝)까지 전부 교체한다.
  const blockRe = new RegExp(`^${key}:[ \\t]*[>|][-+0-9]*[ \\t]*${EOL}((?:[ \\t]+\\S.*(?:${EOL}|$))*)`, 'm');
  const blockMatch = blockRe.exec(raw);
  if (blockMatch) {
    const eol = blockMatch[1] ?? '\n';
    const newRaw = raw.slice(0, blockMatch.index) + newValueLine + eol + raw.slice(blockMatch.index + blockMatch[0].length);
    return { raw: newRaw, changed: true };
  }

  // 형태 3: 따옴표 없는 한 줄 값. 형태 1/2에서 매치 안 됐을 때만 시도한다
  // (따옴표나 블록 지시자로 시작하지 않는 값만 대상으로 좁혀 오탐 방지).
  const bareRe = new RegExp(`^${key}:[ \\t]+(?!['">|])(\\S.*?)[ \\t]*(?:${EOL}|$)`, 'm');
  const bareMatch = bareRe.exec(raw);
  if (bareMatch) {
    const eol = bareMatch[2] ?? '';
    const newRaw = raw.slice(0, bareMatch.index) + newValueLine + eol + raw.slice(bareMatch.index + bareMatch[0].length);
    return { raw: newRaw, changed: true };
  }

  return { raw, changed: false };
}
