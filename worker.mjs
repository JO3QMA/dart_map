export default {
  /**
   * Cloudflare Workers entrypoint
   * - Serves static assets built into `dist` via the `assets` binding
   */
  async fetch(request, env) {
    // Delegate all requests to the static asset handler created by `assets` config
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('ASSETS binding is not configured.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  },
};

