import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// 别名约定：@ -> src/，@shared -> shared/（冻结契约层）
// 前端可直接 import { CARD_TYPES, DEFAULT_STATS } from '@shared/contract'
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
});
