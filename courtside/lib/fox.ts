export function isFoxWebUrl(value:string){
 try{const url=new URL(value);return ['foxsports.com','fox.com'].some(host=>url.hostname===host||url.hostname.endsWith('.'+host));}catch{return false;}
}
// Preserve provider-issued program IDs and query parameters; never derive them from ESPN IDs.
export function isFoxOneEventUrl(value:string){
 try{const url=new URL(value);return url.protocol==='https:'&&['fox.com','www.fox.com'].includes(url.hostname)&&!url.username&&!url.password&&!url.port&&/^\/watch\/epg\/[A-Za-z0-9_-]+\/[a-z0-9-]+\/?$/i.test(url.pathname);}catch{return false;}
}
