import { NextResponse } from 'next/server';
import { NUCLEAR_FACILITIES, MILITARY_BASES, UNDERSEA_CABLES } from '@/lib/geo-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const layer = searchParams.get('layer');

  if (layer === 'nuclear') {
    return NextResponse.json({ facilities: NUCLEAR_FACILITIES });
  }
  if (layer === 'military') {
    return NextResponse.json({ bases: MILITARY_BASES });
  }
  if (layer === 'cables') {
    return NextResponse.json({ cables: UNDERSEA_CABLES });
  }

  return NextResponse.json({
    nuclear: NUCLEAR_FACILITIES,
    military: MILITARY_BASES,
    cables: UNDERSEA_CABLES,
  });
}
