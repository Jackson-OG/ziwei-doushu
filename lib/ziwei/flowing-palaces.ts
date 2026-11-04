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
