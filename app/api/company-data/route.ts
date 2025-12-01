import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

// Ensure this route runs in the Node.js runtime (fs is not available in edge)
export const runtime = 'nodejs';

// Map company names from the UI to their preferred Monthly Raw Timesheet CSV
const COMPANY_FILES: Record<string, string> = {
  'Ambica Pharma': 'Monthly Raw Timesheet - AMBICA PHARMA - 2025.11.01 to 2025.11.30.csv',
  Johnlee: 'Monthly Raw Timesheet - Johnlee  - 2025.11.01 to 2025.11.30.csv',
  'Yugrow Pharmacy': 'Monthly Raw Timesheet - YUGROW - 2025.11.01 to 2025.11.30.csv',
  'Baker & Davis Private Limited':
    'Monthly Raw Timesheet - Baker & Davis Private Limited - 2025.11.01 to 2025.11.30.csv',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const company = searchParams.get('company');

  if (!company) {
    return NextResponse.json({ error: 'Missing company parameter' }, { status: 400 });
  }

  const fileName = COMPANY_FILES[company];
  if (!fileName) {
    return NextResponse.json({ error: `No static file configured for ${company}` }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), fileName);

  try {
    const data = await fs.readFile(filePath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `inline; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Failed to read company CSV', { company, filePath, error });
    return NextResponse.json({ error: 'Failed to read company CSV on server' }, { status: 500 });
  }
}


