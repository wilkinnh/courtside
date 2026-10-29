export function sportLabel(name:string){const label=name.replace(/^Men's /,'');return label.charAt(0).toUpperCase()+label.slice(1);}
export const sportCategories = [
 {name:"Men's pro football",icon:'◈',leagues:['nfl']},
 {name:"Men's college football",icon:'◈',leagues:['ncaaf']},
 {name:"Men's pro basketball",icon:'◉',leagues:['nba']},
 {name:"Men's college basketball",icon:'◉',leagues:['ncaam']},
 {name:"Men's baseball",icon:'◇',leagues:['mlb']},
 {name:"Men's hockey",icon:'✳',leagues:['nhl']},
 {name:"Men's soccer",icon:'⚽',leagues:['epl','mls','ucl','seriea','eflcup','eflchampionship']},
 {name:"Women's soccer",icon:'⚽',leagues:['uwcl']},
];
export function sportCategory(league:string){return sportCategories.find(c=>c.leagues.includes(league))?.name||'';}
export function migrateHiddenSports(hidden:unknown):string[]{
 const values=Array.isArray(hidden)?hidden:['Basketball'];
 const previous:Record<string,string[]>={
  Football:["Men's pro football","Men's college football"],
  Basketball:["Men's pro basketball","Men's college basketball"],
  'Pro football':["Men's pro football"], 'College football':["Men's college football"],
  'Pro basketball':["Men's pro basketball"], 'College basketball':["Men's college basketball"],
  Baseball:["Men's baseball"],Hockey:["Men's hockey"],Soccer:["Men's soccer","Women's soccer"],
 };
 return [...new Set(values.flatMap(s=>typeof s==='string'?(previous[s]||[s]):[]).filter(s=>sportCategories.some(c=>c.name===s)))];
}
export const leagues = [
 {id:'seriea', name:'Serie A', sport:'Soccer', path:'soccer/ita.1', icon:'⚽'},
 {id:'eflcup', name:'Carabao Cup', sport:'Soccer', path:'soccer/eng.league_cup', icon:'⚽'},
 {id:'uwcl', name:"Women's Champions League", sport:'Soccer', path:'soccer/uefa.wchampions', icon:'⚽'},
 {id:'eflchampionship', name:'EFL Championship', sport:'Soccer', path:'soccer/eng.2', icon:'⚽'},
 {id:'nba', name:'NBA', sport:'Basketball', path:'basketball/nba', icon:'◉'},
 {id:'nfl', name:'NFL', sport:'Football', path:'football/nfl', icon:'◈'},
 {id:'nhl', name:'NHL', sport:'Hockey', path:'hockey/nhl', icon:'✳'},
 {id:'mlb', name:'MLB', sport:'Baseball', path:'baseball/mlb', icon:'◇'},
 {id:'ncaaf', name:'College football', sport:'Football', path:'football/college-football', icon:'◈'},
 {id:'ncaam', name:'College basketball', sport:'Basketball', path:'basketball/mens-college-basketball', icon:'◉'},
 {id:'epl', name:'Premier League', sport:'Soccer', path:'soccer/eng.1', icon:'⚽'},
 {id:'mls', name:'MLS', sport:'Soccer', path:'soccer/usa.1', icon:'⚽'},
 {id:'ucl', name:'Champions League', sport:'Soccer', path:'soccer/uefa.champions', icon:'⚽'},
];
export const services = [
 {id:'prime-hhn',name:'HHN on Prime Video',short:'Prime · HHN',color:'#6dc9f4',url:'https://www.primevideo.com/channel/17edab23-eb9f-95f2-999a-31e09e70f7d3',channels:['HHN','Hurricanes Hockey Network'],note:'Separate Hurricanes Hockey Network subscription for eligible in-market viewers. Base Prime alone does not include HHN.'},
 {id:'xfinity',name:'Xfinity TV',short:'Xfinity',color:'#d2b3ff',url:'https://www.xfinity.com/stream/',channels:[],note:'Select your included channels below. Apple TV streaming normally requires your in-home Xfinity network.'},
 {id:'disney',name:'Disney+',short:'Disney+',color:'#89d7de',url:'https://www.disneyplus.com/',channels:['Disney+'],note:'Disney+ alone does not prove ESPN access. Select the ESPN tier included in your bundle separately.'},
 {id:'max',name:'HBO Max Standard / Premium',short:'HBO Max',color:'#a5a9ff',url:'https://www.hbomax.com/sports',channels:['HBO Max','Max'],note:'US live sports require an eligible tier. TNT/TBS broadcasts do not automatically imply Max availability.'},
 {id:'ota',name:'Over-the-air antenna',short:'Antenna / OTA',color:'#a4d69b',url:'',channels:[],note:'Select channels received locally. Apple TV needs a separate network tuner and compatible app to watch antenna TV.'},
 {id:'espn',name:'ESPN Unlimited / TV login',short:'ESPN',color:'#ff5656',url:'https://www.espn.com/watch/',channels:['ESPN','ESPN2','ESPNU','ESPNEWS','SEC Network','ACC Network','ESPN Deportes'],note:'Select this for Unlimited or an eligible TV provider login. ESPN Select alone does not include every ESPN channel.'},
 {id:'espn-plus',name:'ESPN Select (ESPN+)',short:'ESPN+',color:'#efb346',url:'https://www.espn.com/watch/espnplus/',channels:['ESPN+','ESPN Select'],note:'ESPN+ library. Blackouts and event restrictions may apply.'},
 {id:'peacock',name:'Peacock Premium',short:'peacock',color:'#f6d963',url:'https://www.peacocktv.com/watch/sports',channels:['Peacock'],note:'Only explicit Peacock broadcasts are matched. NBC coverage does not automatically imply Peacock access.'},
 {id:'prime',name:'Prime Video',short:'prime video',color:'#6dc9f4',url:'https://www.amazon.com/gp/video/sports',channels:['Prime Video','Amazon Prime Video','Amazon','Prime'],note:'Add-on subscriptions are separate from Prime.'},
 {id:'paramount',name:'Paramount+',short:'Paramount+',color:'#739fff',url:'https://www.paramountplus.com/sports/',channels:['Paramount+'],note:'CBS broadcasts require the appropriate plan and market; add CBS as a TV channel if available.'},
 {id:'nba',name:'NBA League Pass',short:'NBA LP',color:'#80a8ff',url:'https://www.nba.com/watch/league-pass',channels:['NBA League Pass'],note:'Out-of-market access only. Local and national blackouts apply.'},
 {id:'apple',name:'Apple TV / MLS subscription',short:'Apple TV',color:'#e2e4e9',url:'https://tv.apple.com/channel/tvs.sbd.7000',channels:['Apple TV','Apple TV+','MLS Season Pass'],note:'Choose the subscription that includes the listed event.'},
 {id:'fox',name:'FOX / FOX One / TV login',short:'FOX',color:'#b1c7ff',url:'https://www.foxsports.com/live',channels:['FOX','FS1','FS2','FOX One'],note:'Confirm the listed channel is included in your plan.'},
];
export const tvChannels=['ABC','CBS','NBC','ESPN','ESPN2','FS1','FS2','TNT','TBS','truTV','USA Network','NBA TV','NFL Network','SEC Network','ACC Network'];
export type WatchLink={service:string;label:string;url:string;kind:'event'|'service';source:string;verifiedAt:string;access:'subscription_required';appUrl?:string;sourceUrl?:string;playbackTarget?:'browser_only'|'provider_app_candidate';language?:string;feed?:string;authTypes?:string[];packages?:string[];outOfMarketOnly?:boolean;deviceVerified?:boolean;};
export type Game={id:string;league:string;name:string;date:string;state:string;detail:string;venue:string;teams:{id:string;name:string;shortName?:string;abbreviation:string;logo:string;score:string;homeAway:string;record:string}[];broadcasts:string[];links:WatchLink[];eventUrl:string;};
