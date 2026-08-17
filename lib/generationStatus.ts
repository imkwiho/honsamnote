// SEO 마이그레이션처럼 게시글 수가 일시적으로 고정되어야 하는 작업 동안
// scripts/generate-post.ts를 안전하게 멈추기 위한 최소한의 feature flag.
// content/generation-status.json 파일 하나로 제어한다 — 코드를 지우거나
// topics.json 예약 데이터를 건드리지 않고, 값만 바꾸면 즉시 켜고 끌 수 있다.
import fs from 'fs';
import path from 'path';

export interface GenerationStatus {
  paused: boolean;
  pausedAt?: string;
  reason?: string;
  resumeNote?: string;
}

const STATUS_PATH = path.join(process.cwd(), 'content', 'generation-status.json');

/** 파일이 없으면 "일시정지 아님"으로 취급한다(기본 동작을 막지 않기 위함). */
export function readGenerationStatus(): GenerationStatus {
  if (!fs.existsSync(STATUS_PATH)) return { paused: false };
  try {
    const raw = fs.readFileSync(STATUS_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return { paused: parsed.paused === true, pausedAt: parsed.pausedAt, reason: parsed.reason, resumeNote: parsed.resumeNote };
  } catch {
    // 파일이 손상되어도 발행 자체를 막지는 않는다 — 안전한 기본값.
    return { paused: false };
  }
}
