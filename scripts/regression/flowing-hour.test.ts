import assert from 'node:assert/strict';
import { Solar } from 'lunar-javascript';
import { resolveFlowingTime } from '../../lib/ziwei/flowing-time';
import { buildLiuShiPalaces } from '../../lib/ziwei/flowing-palaces';
import { getLiuShiSiHua } from '../../lib/ziwei/sihua';
import type { ZiweiChart } from '../../lib/ziwei/types';
const date={year:2026,month:11,day:13};
const time={hour:0,minute:0,timezone:'Asia/Shanghai',ziDayRule:'civil_midnight' as const};
assert.equal(resolveFlowingTime(date,undefined),null);
for(let hour=0;hour<24;hour++){
 const t=resolveFlowingTime(date,{...time,hour})!;
 assert.equal(t.hourBranch,Math.floor((hour+1)/2)%12);
 assert.deepEqual(t.effectiveDate,date);
 for(let dayStem=0;dayStem<10;dayStem++){
  const lunar=(Solar as unknown as {fromYmdHms:(y:number,m:number,d:number,h:number,mi:number,s:number)=>{getLunar:()=>{getDayGanExact:()=>string;getTimeGan:()=>string}}}).fromYmdHms(2026,11,13+dayStem,hour,0,0).getLunar();
  const stem=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'].indexOf(lunar.getDayGanExact());
  // At 23 civil-midnight uses the same civil day's stem, while library Exact advances.
  if(hour!==23)assert.equal(getLiuShiSiHua(stem,t.hourBranch).stemName,lunar.getTimeGan());
 }
}
assert.deepEqual(resolveFlowingTime({year:2026,month:12,day:31},{...time,hour:23,ziDayRule:'zi_at_23'})!.effectiveDate,{year:2027,month:1,day:1});
for(const bad of [{...time,hour:24},{...time,minute:60},{...time,timezone:'bad-zone'},{...time,ziDayRule:'unknown'}])assert.throws(()=>resolveFlowingTime(date,bad));
const chart={birthInfo:{hour:3},lunarInfo:{lunarMonth:3},palaces:Array.from({length:12},(_,branch)=>({branch,stem:0,name:'宫'+branch,stars:[]}))} as unknown as ZiweiChart;
for(let branch=0;branch<12;branch++){
 const p=buildLiuShiPalaces(chart,2026,10,5,branch);
 assert.equal(p.mingBranch,(8+branch)%12);
 assert.equal(new Set(p.palaces.map(x=>x.branch)).size,12);
 assert.equal(p.palaces[0].branch,p.mingBranch);
}
assert.throws(()=>buildLiuShiPalaces(chart,2026,10,5,12));
console.log('PASS: flowing hour, calendar-library stems, 24 civil hours, date rollover, validation and twelve palaces');
