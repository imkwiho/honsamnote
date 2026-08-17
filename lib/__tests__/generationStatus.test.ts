import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs';
import { readGenerationStatus } from '../generationStatus';

describe('readGenerationStatus', () => {
  const existsSpy = vi.spyOn(fs, 'existsSync');
  const readSpy = vi.spyOn(fs, 'readFileSync');

  afterEach(() => {
    existsSpy.mockReset();
    readSpy.mockReset();
  });

  it('상태 파일이 없으면 일시정지 아님으로 취급한다', () => {
    existsSpy.mockReturnValue(false);
    expect(readGenerationStatus()).toEqual({ paused: false });
  });

  it('paused: true인 파일을 정확히 읽는다', () => {
    existsSpy.mockReturnValue(true);
    readSpy.mockReturnValue(JSON.stringify({ paused: true, reason: '점검 중', resumeNote: '켜면 됨' }));
    const status = readGenerationStatus();
    expect(status.paused).toBe(true);
    expect(status.reason).toBe('점검 중');
    expect(status.resumeNote).toBe('켜면 됨');
  });

  it('파일이 깨져 있어도 발행을 막지 않는다(안전한 기본값)', () => {
    existsSpy.mockReturnValue(true);
    readSpy.mockReturnValue('{ 잘못된 JSON');
    expect(readGenerationStatus()).toEqual({ paused: false });
  });

  it('paused 필드가 없거나 false면 일시정지 아님으로 처리한다', () => {
    existsSpy.mockReturnValue(true);
    readSpy.mockReturnValue(JSON.stringify({}));
    expect(readGenerationStatus().paused).toBe(false);
  });
});
