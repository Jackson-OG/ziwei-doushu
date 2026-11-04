
import { NextRequest, NextResponse } from 'next/server';
import { generateChart } from '@/lib/ziwei/algorithm';
import type { BirthInfo } from '@/lib/ziwei/types';

export async function POST(request: NextRequest) {
  const apiKey = process.env.CHART_API_KEY;
  const authorization = request.headers.get('authorization');

  if (!apiKey || authorization !== `Bearer ${apiKey}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const input = await request.json();

    const { year, month, day, hour, gender } = input ?? {};

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      year < 1900 || year > 2100 ||
      month < 1 || month > 12 ||
      day < 1 || day > 31 ||
      !Number.isInteger(hour) ||
      hour < 0 || hour > 11 ||
      (gender !== 'male' && gender !== 'female')
    ) {
      return NextResponse.json(
        { error: 'Invalid birth information' },
        { status: 400 }
      );
    }

    const birthInfo: BirthInfo = {
      year,
      month,
      day,
      hour,
      gender
    };

    const chart = generateChart(birthInfo);

    return NextResponse.json({
      success: true,
      chart
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error
          ? error.message
          : 'Chart calculation failed'
      },
      { status: 400 }
    );
  }
}
