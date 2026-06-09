import { NextResponse } from 'next/server';
import { fetchAllCameras } from '@/lib/fetchers/cameras';

export async function GET() {
  const cameras = await fetchAllCameras();
  return NextResponse.json({ total: cameras.length, cameras });
}
