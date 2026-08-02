import { NextResponse } from 'next/server';
import { getBskyPosts, OSINT_ACCOUNTS } from '@/lib/fetchers/bluesky';

export async function GET() {
  const posts = await getBskyPosts();
  return NextResponse.json({ total: posts.length, accounts: OSINT_ACCOUNTS.length, posts });
}
