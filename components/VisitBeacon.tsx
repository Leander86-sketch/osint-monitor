'use client';

// Bezoekersmeting op situatiepagina's (6 okt 2026): dezelfde beacon als de homepage, één per sessie.
// Zonder dit telden klikken uit replies naar /s/<slug> nergens mee. ?ref= (bv. xr = X-reply, br = Bluesky-reply) telt apart.
import { useEffect } from 'react';

export default function VisitBeacon() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem('argus_v')) return;
      sessionStorage.setItem('argus_v', '1');
      fetch('/api/visit', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ref: document.referrer || '', q: new URLSearchParams(window.location.search).get('ref') || '' }) }).catch(() => {});
    } catch { /* privémodus */ }
  }, []);
  return null;
}
