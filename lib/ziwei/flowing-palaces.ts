import type { ZiweiChart } from './types';
import { BRANCHES } from './constants';
import { getYearBranchIndex } from './sihua';

const PALACE_NAMES = ['命宫', '兄弟宫', '夫妻宫', '子女宫', '财帛宫', '疾厄宫', '迁移宫', '交友宫', '官禄宫', '田宅宫', '福德宫', '父母宫'] as const;
const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Twelve relative palaces rotate from the chosen Ming branch in decreasing earthly-branch order.
 * Natal stars stay at their natal positions; this is a palace-name overlay, not a relocated star chart.
 */
export function buildRelativePalaces(chart: ZiweiChart, mingBranch: number) {
  if (!Number.isInteger(mingBranch) || mingBranch < 0 || mingBranch > 11) {
    throw new RangeError('Invalid flowing Ming palace branch');
  }
  return PALACE_NAMES.map((name, index) => {
    const branch = mod12(mingBranch - index);
    const natal = chart.palaces.find(p => p.branch === branch);
    if (!natal) throw new Error('Natal chart missing branch ' + branch);
    return {
      name, branch, branchName: BRANCHES[branch],
      natalPalaceName: natal.name, natalStemIndex: natal.stem,
      natalStars: natal.stars,
      oppositeBranch: mod12(branch + 6),
    };
  });
}

export function buildDaXianPalaces(chart: ZiweiChart, index: number) {
  const period = chart.daXians[index];
  if (!period) return null;
  return {
    method: 'Da Xian Ming palace = selected period palace; twelve relative palaces rotate by descending earthly branches',
    period,
    mingBranch: period.palaceBranch,
    palaces: buildRelativePalaces(chart, period.palaceBranch),
  };
}

export function buildLiuNianPalaces(chart: ZiweiChart, lunarYear: number) {
  const mingBranch = getYearBranchIndex(lunarYear);
  return {
    method: 'Tai Sui convention: annual Ming palace at the lunar-year earthly branch; twelve relative palaces rotate by descending earthly branches',
    lunarYear, mingBranch,
    palaces: buildRelativePalaces(chart, mingBranch),
  };
}

/**
 * 斗君法（可选的流派口径）：
 * 流年太岁宫起正月，逆数到出生农历月，再顺数到出生时支；
 * 所得为该流年的正月流月命宫。流月逐月顺行，流日初一
 * 从当月流月命宫起，逐日顺行。
 * 闰月采用 sihua.ts 的前十五日算本月、十六日起算下月口径。
 * 这里只计算宫名叠层，不重新安星。
 */
export function buildLiuYuePalaces(
  chart: ZiweiChart,
  lunarYear: number,
  effectiveMonth: number,
) {
  if (!Number.isInteger(effectiveMonth) || effectiveMonth < 1 || effectiveMonth > 12) {
    throw new RangeError('Invalid effective lunar month');
  }
  const birthMonth = Math.abs(chart.lunarInfo.lunarMonth);
  const birthHour = chart.birthInfo.hour;
  const annualBranch = getYearBranchIndex(lunarYear);
  const firstMonthMingBranch = mod12(annualBranch - (birthMonth - 1) + birthHour);
  const mingBranch = mod12(firstMonthMingBranch + effectiveMonth - 1);
  return {
    method: 'Dou Jun convention: annual Tai Sui -> reverse-count natal lunar month -> forward-count natal hour; advance months forward',
    lunarYear, effectiveMonth, annualBranch, birthMonth, birthHour,
    firstMonthMingBranch, mingBranch,
    palaces: buildRelativePalaces(chart, mingBranch),
  };
}

export function buildLiuRiPalaces(
  chart: ZiweiChart,
  lunarYear: number,
  effectiveMonth: number,
  lunarDay: number,
) {
  if (!Number.isInteger(lunarDay) || lunarDay < 1 || lunarDay > 30) {
    throw new RangeError('Invalid lunar day');
  }
  const month = buildLiuYuePalaces(chart, lunarYear, effectiveMonth);
  const mingBranch = mod12(month.mingBranch + lunarDay - 1);
  return {
    method: 'Dou Jun convention: first lunar day at flowing-month Ming palace; advance one branch per day',
    lunarYear, effectiveMonth, lunarDay, monthMingBranch: month.mingBranch, mingBranch,
    palaces: buildRelativePalaces(chart, mingBranch),
  };
}
