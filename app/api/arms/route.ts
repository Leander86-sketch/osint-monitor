import { NextResponse } from 'next/server';

// SIPRI Arms Trade data — static dataset (updated annually)
// Source: https://www.sipri.org/databases/armstransfers

interface ArmsTransfer {
  exporter: string;
  importer: string;
  value: number; // SIPRI TIV (Trend Indicator Value) in millions
  period: string;
}

interface ArmsExporter {
  country: string;
  totalTIV: number;
  share: number; // percentage of global exports
  topClients: string[];
}

// Top 10 arms exporters 2019-2023 (latest SIPRI data)
const TOP_EXPORTERS: ArmsExporter[] = [
  { country: 'USA', totalTIV: 42000, share: 42, topClients: ['Saudi Arabia', 'Japan', 'Australia', 'South Korea', 'Qatar'] },
  { country: 'France', totalTIV: 11000, share: 11, topClients: ['India', 'Qatar', 'Egypt', 'UAE', 'Greece'] },
  { country: 'Russia', totalTIV: 10500, share: 11, topClients: ['India', 'China', 'Egypt', 'Algeria', 'Kazakhstan'] },
  { country: 'China', totalTIV: 5800, share: 5.8, topClients: ['Pakistan', 'Bangladesh', 'Thailand', 'Myanmar', 'Algeria'] },
  { country: 'Germany', totalTIV: 5600, share: 5.6, topClients: ['Egypt', 'South Korea', 'Israel', 'Greece', 'Norway'] },
  { country: 'Italy', totalTIV: 4500, share: 4.5, topClients: ['Egypt', 'Turkey', 'Qatar', 'Kuwait', 'Pakistan'] },
  { country: 'UK', totalTIV: 3700, share: 3.7, topClients: ['Saudi Arabia', 'Qatar', 'Oman', 'USA', 'Indonesia'] },
  { country: 'Spain', totalTIV: 2900, share: 2.9, topClients: ['Australia', 'Turkey', 'Saudi Arabia', 'Egypt', 'UK'] },
  { country: 'Israel', totalTIV: 2600, share: 2.6, topClients: ['India', 'Germany', 'Philippines', 'Azerbaijan', 'USA'] },
  { country: 'South Korea', totalTIV: 2400, share: 2.4, topClients: ['Poland', 'Indonesia', 'Philippines', 'Iraq', 'Norway'] },
];

// Major arms flows (conflict-relevant)
const CONFLICT_FLOWS: ArmsTransfer[] = [
  { exporter: 'USA', importer: 'Saudi Arabia', value: 8200, period: '2019-2023' },
  { exporter: 'USA', importer: 'Israel', value: 3800, period: '2019-2023' },
  { exporter: 'USA', importer: 'Japan', value: 4100, period: '2019-2023' },
  { exporter: 'USA', importer: 'Australia', value: 3600, period: '2019-2023' },
  { exporter: 'USA', importer: 'Taiwan', value: 2400, period: '2019-2023' },
  { exporter: 'France', importer: 'India', value: 3200, period: '2019-2023' },
  { exporter: 'France', importer: 'Qatar', value: 2800, period: '2019-2023' },
  { exporter: 'France', importer: 'Egypt', value: 2100, period: '2019-2023' },
  { exporter: 'Russia', importer: 'India', value: 3500, period: '2019-2023' },
  { exporter: 'Russia', importer: 'China', value: 2200, period: '2019-2023' },
  { exporter: 'Russia', importer: 'Egypt', value: 1800, period: '2019-2023' },
  { exporter: 'China', importer: 'Pakistan', value: 3100, period: '2019-2023' },
  { exporter: 'China', importer: 'Bangladesh', value: 800, period: '2019-2023' },
  { exporter: 'Germany', importer: 'Egypt', value: 1400, period: '2019-2023' },
  { exporter: 'UK', importer: 'Saudi Arabia', value: 2600, period: '2019-2023' },
  { exporter: 'Italy', importer: 'Egypt', value: 2200, period: '2019-2023' },
  { exporter: 'South Korea', importer: 'Poland', value: 1800, period: '2019-2023' },
  { exporter: 'Israel', importer: 'India', value: 1200, period: '2019-2023' },
  { exporter: 'Israel', importer: 'Germany', value: 800, period: '2019-2023' },
];

export async function GET() {
  return NextResponse.json({
    exporters: TOP_EXPORTERS,
    flows: CONFLICT_FLOWS,
    source: 'SIPRI Arms Transfers Database',
    period: '2019-2023',
    note: 'Values in SIPRI Trend Indicator Values (TIV), millions USD',
  });
}
