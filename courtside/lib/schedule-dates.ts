// Calendar arithmetic uses UTC so DST never skips or duplicates a schedule date.
export function scheduleDates(today:string){
 const start=new Date(`${today}T12:00:00Z`);
 return Array.from({length:7},(_,offset)=>{const day=new Date(start);day.setUTCDate(day.getUTCDate()+offset);return day.toISOString().slice(0,10);});
}
export function scheduleDateLabel(date:string,options:Intl.DateTimeFormatOptions={weekday:'long',month:'long',day:'numeric'}){
 return new Intl.DateTimeFormat('en-US',{...options,timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
}
