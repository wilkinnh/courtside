import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scheduleDates,scheduleDateLabel} from '../lib/schedule-dates.ts';
test('seven schedule dates cross month and year boundaries',()=>{
 assert.deepEqual(scheduleDates('2026-12-29'),['2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03','2027-01-04']);
});
test('calendar dates stay consecutive through both daylight saving changes',()=>{
 for(const start of ['2026-03-06','2026-10-30']){
  const dates=scheduleDates(start);assert.equal(new Set(dates).size,7);
  dates.forEach((date,i)=>assert.equal(Date.parse(date)-Date.parse(start),i*86400000));
 }
 assert.equal(scheduleDateLabel('2026-11-22'),'Sunday, November 22');
});
