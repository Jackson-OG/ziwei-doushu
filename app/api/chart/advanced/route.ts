import { NextRequest, NextResponse } from 'next/server';
import { Solar } from 'lunar-javascript';
import { generateChart } from '@/lib/ziwei/algorithm';
import { getDaXianIndexForYear } from '@/lib/ziwei/yunxian-context';
import { getSiHuaByStem, getDaXianSiHua, getLiuNianSiHua, getLiuYueSiHua, getLiuRiSiHua, detectSelfSihua } from '@/lib/ziwei/sihua';
import type { BirthInfo, ZiweiChart, SiHua } from '@/lib/ziwei/types';

const HUA: SiHua[] = ['禄', '权', '科', '忌'];
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

function locate(chart: ZiweiChart, transforms: Record<SiHua, string>) {
  return HUA.map(kind => {
    const star = transforms[kind];
    const palace = chart.palaces.find(p => p.stars.some(s => s.name === star));
    return { type: kind, star, palace: palace ? { name: palace.name, branch: BRANCHES[palace.branch] } : null };
  });
}

export async function POST(request: NextRequest) {
  const key = process.env.CHART_API_KEY;
  if (!key || request.headers.get('authorization') !== `Bearer ${key}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const input = await request.json();
    const { year, month, day, hour, gender, targetDate } = input ?? {};
    const birth = { year, month, day, hour, gender } as BirthInfo;
    if (![year, month, day, hour].every(Number.isInteger) || year < 1900 || year > 2100 ||
        month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 11 ||
        (gender !== 'male' && gender !== 'female')) {
      return NextResponse.json({ success: false, error: 'Invalid birth information' }, { status: 400 });
    }
    if (!targetDate || !Number.isInteger(targetDate.year) || !Number.isInteger(targetDate.month) ||
        !Number.isInteger(targetDate.day) || targetDate.year < 1900 || targetDate.year > 2100 ||
        targetDate.month < 1 || targetDate.month > 12 || targetDate.day < 1 || targetDate.day > 31) {
      return NextResponse.json({ success: false, error: 'Invalid targetDate' }, { status: 400 });
    }
    const check = new Date(Date.UTC(targetDate.year, targetDate.month - 1, targetDate.day));
    if (check.getUTCFullYear() !== targetDate.year || check.getUTCMonth() !== targetDate.month - 1 || check.getUTCDate() !== targetDate.day) {
      return NextResponse.json({ success: false, error: 'Target date does not exist' }, { status: 400 });
    }
    const chart = generateChart(birth);
    const lunar = Solar.fromYmd(targetDate.year, targetDate.month, targetDate.day).getLunar();
    const lunarYear = Number(lunar.getYear());
    const lunarMonthRaw = Number(lunar.getMonth());
    const lunarMonth = Math.abs(lunarMonthRaw);
    const lunarDay = Number(lunar.getDay());
    const isLeapMonth = lunarMonthRaw < 0;
    // Diagnostic only: retain the natal iztro markers without silently rewriting them.
    const natalTable = getSiHuaByStem(chart.lunarInfo.yearStem);
    const natalMarkers = chart.palaces.flatMap(p =>
      p.stars.filter(star => star.siHua).map(star => ({
        star: star.name, type: star.siHua, palace: p.name, branch: BRANCHES[p.branch],
      }))
    );
    const natalExpected = HUA.map(type => ({
      type, star: natalTable[type],
      markers: natalMarkers.filter(marker => marker.type === type).map(marker => marker.star),
    }));
    const natalDiscrepancies = natalExpected.filter(row =>
      row.markers.length !== 1 || row.markers[0] !== row.star
    );
    const dxIndex = getDaXianIndexForYear(chart, lunarYear);
    const daXian = dxIndex >= 0 ? getDaXianSiHua(chart, dxIndex, lunarYear) : null;
    const liuNian = getLiuNianSiHua(lunarYear);
    const liuYue = getLiuYueSiHua(liuNian.stemIndex, lunarMonth, { isLeapMonth, liuriDay: lunarDay, nextYearStem: getLiuNianSiHua(lunarYear + 1).stemIndex });
    const liuRi = getLiuRiSiHua(lunarYear, lunarMonth, lunarDay, isLeapMonth);
    const layer = (value: { stemIndex: number; stemName: string; transforms: Record<SiHua, string> } | null) =>
      value ? { ...value, placements: locate(chart, value.transforms) } : null;
    return NextResponse.json({
      success: true,
      method: { natal: 'existing generateChart', flying: 'independent sihua.ts overlay', note: 'Four-transformation layers are not a complete flowing palace chart.' },
      targetDate: { ...targetDate, lunarYear, lunarMonth, lunarDay, isLeapMonth },
      chart,
      natalSiHuaAudit: {
        natalYearStemIndex: chart.lunarInfo.yearStem,
        sourceOfChartMarkers: 'iztro astrolabe mutagen',
        sourceOfExpectedTable: 'lib/ziwei/constants.ts SI_HUA_TABLE',
        expectedFromProjectTable: natalExpected,
        actualNatalMarkers: natalMarkers,
        consistent: natalDiscrepancies.length === 0,
        discrepancies: natalDiscrepancies,
        note: 'Diagnostic comparison only. Different school configurations may explain differences; natal chart markers are unchanged.',
      },
      advanced: {
        palaceFlying: chart.palaces.map(p => ({
          palace: p.name, branch: BRANCHES[p.branch], stemIndex: p.stem,
          transforms: getSiHuaByStem(p.stem),
          placements: locate(chart, getSiHuaByStem(p.stem)),
          selfTransformations: detectSelfSihua(p),
        })),
        daXian: { index: dxIndex, period: dxIndex >= 0 ? chart.daXians[dxIndex] : null, siHua: layer(daXian) },
        liuNian: layer(liuNian),
        liuYue: { ...layer(liuYue), lunarMonth: liuYue.month },
        liuRi: layer(liuRi),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Advanced chart failed' }, { status: 400 });
  }
}
