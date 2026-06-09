import { NextRequest, NextResponse } from 'next/server';
import { getAlerts, addAlert, removeAlert, toggleAlert, getRecentAlertEvents, resetAlerts } from '@/lib/store';

export async function GET() {
  const alerts = getAlerts();
  const recentEvents = getRecentAlertEvents(200);
  return NextResponse.json({ alerts, recentEvents });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, keyword, id } = body;

    switch (action) {
      case 'add': {
        if (!keyword) {
          return NextResponse.json({ error: 'Keyword required' }, { status: 400 });
        }
        const alert = addAlert(keyword);
        return NextResponse.json({ success: true, alert });
      }
      case 'remove': {
        if (!id) {
          return NextResponse.json({ error: 'Alert ID required' }, { status: 400 });
        }
        removeAlert(id);
        return NextResponse.json({ success: true });
      }
      case 'toggle': {
        if (!id) {
          return NextResponse.json({ error: 'Alert ID required' }, { status: 400 });
        }
        const alert = toggleAlert(id);
        return NextResponse.json({ success: true, alert });
      }
      case 'reset': {
        const alerts = resetAlerts();
        return NextResponse.json({ success: true, alerts });
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
