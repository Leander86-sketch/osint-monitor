/**
 * Global GDELT request queue — serializes all GDELT API calls
 * to avoid 429 rate limits (GDELT allows ~1 req per 5 seconds).
 */

let queue: Array<() => Promise<void>> = [];
let running = false;
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 6000; // 6s between GDELT requests

async function processQueue() {
  if (running) return;
  running = true;

  while (queue.length > 0) {
    const task = queue.shift()!;
    const elapsed = Date.now() - lastRequestTime;
    if (elapsed < MIN_INTERVAL_MS) {
      await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - elapsed));
    }
    lastRequestTime = Date.now();
    await task();
  }

  running = false;
}

export function enqueueGdeltRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    queue.push(async () => {
      try {
        resolve(await fn());
      } catch (err) {
        reject(err);
      }
    });
    processQueue();
  });
}

/**
 * GDELT via node:https in plaats van fetch().
 *
 * Waarom: GDELT doet er 11-15 seconden over om te antwoorden, en undici — de
 * fetch-implementatie van Node — kapt de verbinding na 10s af met
 * UND_ERR_CONNECT_TIMEOUT. Die grens staat los van AbortSignal.timeout(), dus
 * een ruimere signal-timeout hielp niet: gemeten 7 sep 2026 faalde 3 van de 6
 * pogingen op precies 10,5s terwijl dezelfde query via curl gewoon 250
 * artikelen opleverde. Een eigen dispatcher zou het ook oplossen, maar undici
 * is hier niet importeerbaar en een extra productie-dependency is dat niet waard.
 */
export interface GdeltResponse { status: number; body: string }

export function gdeltGet(url: string, timeoutMs = 40000): Promise<GdeltResponse> {
  return new Promise((resolve, reject) => {
    import('https').then(({ request }) => {
      const req = request(url, {
        headers: { 'user-agent': 'ARGUS/1.0 (argus.prototipo.nl)', accept: 'application/json' },
        timeout: timeoutMs,
      }, res => {
        const chunks: Buffer[] = [];
        res.on('data', c => chunks.push(c as Buffer));
        res.on('end', () => resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString('utf8') }));
      });
      req.on('timeout', () => { req.destroy(new Error('GDELT timeout')); });
      req.on('error', reject);
      req.end();
    }).catch(reject);
  });
}
