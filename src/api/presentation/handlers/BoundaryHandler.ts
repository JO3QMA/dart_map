import type { Context } from 'hono';

export async function boundaryHandler(c: Context) {
  const query = c.req.query('q');
  if (!query) {
    return c.json({ error: 'Missing required query parameter: q' }, 400);
  }

  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = c.req.raw;
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) return cachedResponse;

  const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
  nominatimUrl.searchParams.set('q', query);
  nominatimUrl.searchParams.set('format', 'geojson');
  nominatimUrl.searchParams.set('polygon_geojson', '1');
  nominatimUrl.searchParams.set('polygon_threshold', '0.005');
  nominatimUrl.searchParams.set('limit', '1');

  const nominatimRequest = new Request(nominatimUrl.toString(), {
    method: 'GET',
    headers: { 'User-Agent': 'DartMapApp/1.0' },
  });

  try {
    const upstreamResponse = await fetch(nominatimRequest);
    const headers = new Headers(upstreamResponse.headers);
    headers.set('Cache-Control', 'public, max-age=2592000');
    headers.set('Content-Type', 'application/json; charset=utf-8');

    const responseToCacheAndReturn = new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
    await cache.put(cacheKey, responseToCacheAndReturn.clone());
    return responseToCacheAndReturn;
  } catch {
    return c.json({ error: 'Failed to fetch boundary data from Nominatim.' }, 502);
  }
}
