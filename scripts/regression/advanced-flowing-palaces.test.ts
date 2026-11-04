import assert from 'node:assert/strict';
import { Solar } from 'lunar-javascript';
import type { ZiweiChart } from '../../lib/ziwei/types';
import { buildDaXianPalaces, buildLiuNianPalaces, buildLiuYuePalaces, buildLiuRiPalaces } from '../../lib/ziwei/flowing-palaces';
import { getLiuYueSiHua } from '../../lib/ziwei/sihua';

const chart = {
  birthInfo: { year: 2000, month: 4, day: 11, hour: 3, gender: 'male' },
  lunarInfo: { lunarYear: 2000, lunarMonth: 3, lunarDay: 7, yearStem: 6, yearBranch: 4, isLeapMonth: false },
  palaces: Array.from({length:12},(_,branch)=>({branch,stem:branch%10,name:'本命'+branch,stars:[{name:'星'+branch,type:'minor'}]})),
  daXians: [{startAge:26,endAge:35,palaceBranch:3,palaceName:'福德'}],
} as ZiweiChart;

function validate(label:string, data:{mingBranch:number;palaces:ReturnType<typeof buildLiuYuePalaces>['palaces']}) {
  assert.equal(data.palaces.length,12,label+' palace count');
  assert.equal(new Set(data.palaces.map(p=>p.branch)).size,12,label+' branch uniqueness');
  assert.equal(data.palaces[0].branch,data.mingBranch,label+' Ming branch');
  for (let i=0;i<12;i++){
    const p=data.palaces[i];
    assert.equal(p.branch,(data.mingBranch-i+12)%12,label+' ordering');
    assert.equal(p.natalPalaceName,'本命'+p.branch,label+' natal mapping');
    assert.equal(p.natalStars[0].name,'星'+p.branch,label+' natal stars unchanged');
    assert.equal(p.oppositeBranch,(p.branch+6)%12,label+' opposite');
  }
}
validate('Da Xian',buildDaXianPalaces(chart,0)!);
validate('Liu Nian',buildLiuNianPalaces(chart,2026));
const month=buildLiuYuePalaces(chart,2026,10);
const day=buildLiuRiPalaces(chart,2026,10,5);
validate('Liu Yue',month);
validate('Liu Ri',day);
assert.equal(month.firstMonthMingBranch,7);
assert.equal(month.mingBranch,4);
assert.equal(day.mingBranch,8);
for(let m=1;m<=12;m++) {
  const a=buildLiuYuePalaces(chart,2026,m);
  validate('month '+m,a);
  for(let d=1;d<=30;d++)validate('day '+m+'/'+d,buildLiuRiPalaces(chart,2026,m,d));
}
for (const date of [[2026,1,1],[2026,2,16],[2026,2,17],[2026,11,13]] as const){
  const lunar=Solar.fromYmd(...date).getLunar();
  const year=lunar.getYear(), rawMonth=lunar.getMonth(), lunarDay=lunar.getDay();
  const annual=buildLiuNianPalaces(chart,year);
  validate('annual '+date.join('-'),annual);
  const monthNum=Math.abs(rawMonth);
  const monthSiHua=getLiuYueSiHua((year-4+10000)%10,monthNum,{
    isLeapMonth:rawMonth<0,liuriDay:lunarDay,nextYearStem:(year+1-4+10000)%10
  });
  const monthly=buildLiuYuePalaces(chart,year,monthSiHua.month);
  validate('lunar month '+date.join('-'),monthly);
  validate('lunar day '+date.join('-'),buildLiuRiPalaces(chart,year,monthSiHua.month,lunarDay));
}
console.log('PASS: structural invariants, sample date, month/day sweep and lunar boundary smoke tests');
