/** Admin key for Argus write endpoints (15 sep 2026). Set ARGUS_ADMIN_KEY in .env.local.
 *  Send as header `x-argus-key` (the AlertPanel stores it in localStorage) or `?key=` for scripts. */
export function isAdmin(req: Request): boolean {
  const key = process.env.ARGUS_ADMIN_KEY;
  if (!key) return false;
  const given = req.headers.get('x-argus-key') || new URL(req.url).searchParams.get('key') || '';
  if (given.length !== key.length) return false;
  let r = 0;
  for (let i = 0; i < key.length; i++) r |= key.charCodeAt(i) ^ given.charCodeAt(i);
  return r === 0;
}
