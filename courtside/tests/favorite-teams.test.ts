import {test} from 'node:test';
import assert from 'node:assert/strict';
import {followsGame,initialPreferences,validPreferences} from '../lib/preferences.ts';
import {api} from '../lib/sports.ts';
import type {Game} from '../lib/catalog.ts';
const team={id:'7',league:'nhl',name:'Carolina Hurricanes'};
test('team follows match either competitor within the saved league',()=>{
 const game={league:'nhl',teams:[{id:'8'},{id:'7'}]} as Game;
 assert.equal(followsGame(game,[team]),true);
 assert.equal(followsGame({...game,league:'nba'},[team]),false);
 assert.equal(followsGame({...game,teams:[{id:'8'}]} as Game,[team]),false);
 assert.equal(followsGame(game,[]),false);
});
test('favorite team preferences reject malformed entries and duplicates',()=>{
 assert.ok(validPreferences({...initialPreferences,favoriteTeams:[team]}));
 for(const favoriteTeams of [[null],[{...team,league:'unknown'}],[{...team,id:''}],[{...team,name:''}],[team,team],[{...team,token:'secret'}]])assert.equal(validPreferences({favoriteTeams},true),false);
});
test('team directory validates leagues and returns selectable teams',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async input=>{calls++;assert.match(String(input),/hockey\/nhl\/teams\?limit=1000$/);return Response.json({sports:[{leagues:[{teams:[{team:{id:'7',displayName:'Carolina Hurricanes'}},{team:{id:'bad',displayName:'Invalid'}}]}]}]});};
 try{
  assert.equal((await api(new Request('http://localhost/api/v1/teams?league=unknown'))).status,400);
  assert.equal(calls,0);
  const response=await api(new Request('http://localhost/api/v1/teams?league=nhl'));
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{teams:[team]});
 }finally{globalThis.fetch=original;}
});
