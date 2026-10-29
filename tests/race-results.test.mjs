import test from 'node:test';
import assert from 'node:assert/strict';
import {resultsPage} from '../race-results.js';

test('race details display final wave height, wind, weather, first 3 and trifecta payout',()=>{
 const html=resultsPage({date:'2026-10-28',venue:'01',raceId:'202610280101',
 results:[{'レースコード':'202610280101','1着_艇番':'1','1着_選手名':'選手一','2着_艇番':'2','2着_選手名':'選手二','3着_艇番':'3','3着_選手名':'選手三','波の高さ(cm)':'10','風速(m)':'5','天候':'晴','決まり手':'逃げ'}],
 payouts:[{'レースコード':'202610280101','3連単_組番':'1-2-3','3連単_払戻金':'1500'}],
 daily:{days:[{date:'2026-10-28',results:1,averageWaveCm:10,maxWaveCm:10,averageWindMps:5,winnerOneRate:100}]}
 });
 assert.match(html,/10 cm/);assert.match(html,/5 m\/s/);
 assert.match(html,/1-2-3/);assert.match(html,/1,500円/);
 assert.match(html,/選手一/);assert.match(html,/2026-10-28/);
});
test('race results HTML escapes source names and weather, never renders invalid markup from CSV',()=>{
 const html=resultsPage({date:'2026-10-28',venue:'01',
 results:[{'レースコード':'202610280101','1着_艇番':'1','1着_選手名':'<img src=x onerror=alert(1)>','2着_艇番':'2','3着_艇番':'3','天候':'<script>x</script>'}],
 payouts:[]});
 assert.doesNotMatch(html,/<script>/);
 assert.doesNotMatch(html,/<img src=x/);
 assert.match(html,/&lt;script&gt;/);
});
