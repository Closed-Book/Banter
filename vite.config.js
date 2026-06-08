import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { createStepfunRoleplayProxy } from './server/stepfunRoleplayProxy.js';
import { createStepfunVoiceProxy } from './server/stepfunVoiceProxy.js';

// 别名约定：@ -> src/，@shared -> shared/（冻结契约层）
// 前端可直接 import { CARD_TYPES, DEFAULT_STATS } from '@shared/contract'
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      createStepfunRoleplayProxy({ ...process.env, ...env }),
      createStepfunVoiceProxy({ ...process.env, ...env }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      },
    },
  };
});
