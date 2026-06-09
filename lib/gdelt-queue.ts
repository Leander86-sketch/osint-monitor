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
