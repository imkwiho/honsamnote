import { defineConfig } from 'vitest/config';
import path from 'path';

// Next.js의 tsconfig "@/*" 경로 별칭을 vitest에서도 그대로 쓸 수 있게 맞춘다.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
});
