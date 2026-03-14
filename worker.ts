/**
 * Cloudflare Workers entrypoint
 * - Serves static assets from `dist` via ASSETS binding
 * - API: /api/regions, /api/draw, /api/boundary (Nominatim proxy)
 */
import app, { type Env } from './src/api/presentation/router';

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
};
