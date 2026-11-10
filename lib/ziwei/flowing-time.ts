export interface FlowingTime { hour: number; minute: number; timezone: string; ziDayRule: 'civil_midnight' | 'zi_at_23' }
/** Input is local civil time in the explicitly supplied zone, not an instant in another zone. */
export function resolveFlowingTime(date: {year:number;month:number;day:number}, input: unknown) {
  if (input === undefined) return null;
  const t = input as FlowingTime;
  if (!t || typeof t !== 'object' || Object.keys(t).some(k => !['hour','minute','timezone','ziDayRule'].includes(k)) ||
      !Number.isInteger(t.hour) || t.hour < 0 || t.hour > 23 || !Number.isInteger(t.minute) || t.minute < 0 || t.minute > 59 ||
      typeof t.timezone !== 'string' || !['civil_midnight','zi_at_23'].includes(t.ziDayRule)) throw new Error('Invalid targetTime');
  try { new Intl.DateTimeFormat('en', {timeZone:t.timezone}); } catch { throw new Error('Invalid targetTime timezone'); }
  const d = new Date(Date.UTC(date.year,date.month-1,date.day));
  if (t.hour === 23 && t.ziDayRule === 'zi_at_23') d.setUTCDate(d.getUTCDate()+1);
  if (d.getUTCFullYear() > 2100) throw new Error('Effective target date exceeds 2100');
  return {...t, hourBranch:Math.floor((t.hour+1)/2)%12,
    effectiveDate:{year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate()},
    method:'Explicit local civil time; timezone labels the input location; no timezone conversion, DST ambiguity resolution or true-solar correction'};
}
