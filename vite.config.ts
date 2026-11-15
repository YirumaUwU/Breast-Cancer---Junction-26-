import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { createDraftHandler } from './server/draft.ts';

/** Mounts /api/draft on `npm run dev` and `npm run preview`. Not part of the static build. */
function draftRoute(env: Record<string, string>): Plugin {
  const handler = createDraftHandler({ ...process.env, ...env });
  return {
    name: 'kaari-draft-route',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), draftRoute(loadEnv(mode, process.cwd(), '')), viteSingleFile()],
}));
