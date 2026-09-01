const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const MAX_BYTES = 2_000_000; // 2 MB cap on the fetched page
const FETCH_TIMEOUT_MS = 10_000;

// Very small in-memory rate limiter (per instance, best effort)
const hits = new Map<string, number[]>();
const RATE_LIMIT = 10; // requests
const RATE_WINDOW_MS = 60_000;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_LIMIT;
}

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    h === 'localhost' ||
    h.endsWith('.localhost') ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    h === 'metadata.google.internal'
  ) return true;

  // IPv6 loopback / unique-local / link-local
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;

  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 0 || a === 10 || a === 127) return true;              // this-network, private, loopback
    if (a === 169 && b === 254) return true;                        // link-local (cloud metadata)
    if (a === 172 && b >= 16 && b <= 31) return true;               // private
    if (a === 192 && b === 168) return true;                        // private
    if (a === 100 && b >= 64 && b <= 127) return true;              // CGNAT
    if (a >= 224) return true;                                      // multicast / reserved
  }
  return false;
}

function validateUrl(raw: string): { url: URL } | { error: string } {
  let candidate = raw.trim();
  if (candidate.length > 2048) return { error: 'URL is too long' };
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { error: 'Invalid URL' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { error: 'Only http(s) URLs are supported' };
  }
  if (url.username || url.password) return { error: 'Credentials in URLs are not allowed' };
  if (isBlockedHost(url.hostname)) return { error: 'That host is not allowed' };
  if (!url.hostname.includes('.')) return { error: 'That host is not allowed' };
  return { url };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  const clientKey =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (rateLimited(clientKey)) {
    return json({ success: false, error: 'Too many requests. Please wait a minute.' }, 429);
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ success: false, error: 'Invalid JSON body' }, 400);
    }

    const rawUrl = (body as { url?: unknown } | null)?.url;
    if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
      return json({ success: false, error: 'URL is required' }, 400);
    }

    const validated = validateUrl(rawUrl);
    if ('error' in validated) {
      return json({ success: false, error: validated.error }, 400);
    }
    const formattedUrl = validated.url.toString();

    console.log('Fetching recipe URL:', formattedUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(formattedUrl, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RecipeFetcher/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
    } catch (e) {
      clearTimeout(timeout);
      const aborted = e instanceof DOMException && e.name === 'AbortError';
      return json(
        { success: false, error: aborted ? 'The site took too long to respond' : 'Could not reach that URL' },
        400,
      );
    }
    clearTimeout(timeout);

    // Re-validate after redirects
    const finalCheck = validateUrl(response.url || formattedUrl);
    if ('error' in finalCheck) {
      return json({ success: false, error: 'Redirected to a disallowed host' }, 400);
    }

    if (!response.ok) {
      return json({ success: false, error: `Failed to fetch URL (${response.status})` }, 400);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType && !/text\/html|application\/xhtml|text\/plain/i.test(contentType)) {
      return json({ success: false, error: 'That URL is not a web page' }, 400);
    }

    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_BYTES) {
      return json({ success: false, error: 'That page is too large to import' }, 400);
    }

    // Stream with a hard byte cap
    const reader = response.body?.getReader();
    if (!reader) return json({ success: false, error: 'Empty response' }, 400);

    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    const buffer = new Uint8Array(received > MAX_BYTES ? MAX_BYTES : received);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const html = new TextDecoder('utf-8', { fatal: false }).decode(buffer);

    // Try to extract JSON-LD recipe data first
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    let recipeData: Record<string, unknown> | null = null;

    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        try {
          const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
          const parsed = JSON.parse(jsonContent);
          const items = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of items) {
            if (item['@type'] === 'Recipe') {
              recipeData = item;
              break;
            }
            if (Array.isArray(item['@graph'])) {
              const recipe = item['@graph'].find((g: Record<string, unknown>) => g['@type'] === 'Recipe');
              if (recipe) {
                recipeData = recipe;
                break;
              }
            }
          }
          if (recipeData) break;
        } catch (err) {
          console.warn('Skipping malformed JSON-LD block:', (err as Error).message);
        }
      }
    }

    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, 8000);

    return json({ success: true, jsonLd: recipeData, text: textContent });
  } catch (error) {
    console.error('Error fetching recipe URL:', error);
    return json({ success: false, error: 'Failed to fetch that page' }, 500);
  }
});
