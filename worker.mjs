export default {
  /**
   * Cloudflare Workers entrypoint
   * - Serves static assets built into `dist` via the `assets` binding
   * - Provides a proxy & cache API for OSM Nominatim boundary search
   */
  async fetch(request, env) {
    const url = new URL(request.url)

    // API: /api/boundary?q={query}
    if (url.pathname === '/api/boundary') {
      const query = url.searchParams.get('q')

      if (!query) {
        return new Response(JSON.stringify({ error: 'Missing required query parameter: q' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        })
      }

      const cache = caches.default

      // Use the original request URL as the cache key so that
      // identical frontend requests share the same cached response.
      const cacheKey = request
      const cachedResponse = await cache.match(cacheKey)
      if (cachedResponse) {
        return cachedResponse
      }

      // Build Nominatim request URL
      const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search')
      nominatimUrl.searchParams.set('q', query)
      nominatimUrl.searchParams.set('format', 'geojson')
      nominatimUrl.searchParams.set('polygon_geojson', '1')
      nominatimUrl.searchParams.set('polygon_threshold', '0.005')
      // 最も関連性の高い1件だけ取得する（複数フィーチャによる余計な境界表示を防ぐ）
      nominatimUrl.searchParams.set('limit', '1')

      const nominatimRequest = new Request(nominatimUrl.toString(), {
        method: 'GET',
        headers: {
          // Nominatim usage policy requires a descriptive User-Agent
          'User-Agent': 'DartMapApp/1.0',
        },
      })

      try {
        const upstreamResponse = await fetch(nominatimRequest)

        // Clone and normalize headers so we can inject Cache-Control
        const headers = new Headers(upstreamResponse.headers)
        headers.set('Cache-Control', 'public, max-age=2592000')
        headers.set('Content-Type', 'application/json; charset=utf-8')

        const responseToCacheAndReturn = new Response(upstreamResponse.body, {
          status: upstreamResponse.status,
          statusText: upstreamResponse.statusText,
          headers,
        })

        // Store in cache (fire and forget is acceptable here)
        await cache.put(cacheKey, responseToCacheAndReturn.clone())

        return responseToCacheAndReturn
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: 'Failed to fetch boundary data from Nominatim.',
          }),
          {
            status: 502,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
            },
          },
        )
      }
    }

    // Delegate all non-API requests to the static asset handler
    if (env.ASSETS) {
      return env.ASSETS.fetch(request)
    }

    return new Response('ASSETS binding is not configured.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  },
}
