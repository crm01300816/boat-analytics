import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregateCourseTechniques,determineExpectedCourses,normalizeMove,renderCourseTechniques,techniqueMetric} from '../course-techniques.js';

const entrants=[1,2,3,4,5,6].map(lane=>({lane,id:String(5100+lane),name:'選手'+lane}));
function race({venue='19',first=4,second=1,third=2,move='まくり',courses=[1,2,3,4,5,6]}={}){
 const card={'レース場コード':venue,'レースコード':'2026110319'+'01'};
 for(let lane=1;lane<=6;lane++)card['艇'+lane+'_登録番号']=String(5100+lane);
 const result={'1着_艇番':String(first),'2着_艇番':String(second),'3着_艇番':String(third),'決まり手':move};
 courses.forEach((lane,i)=>{result[(i+1)+'コース_艇番']=String(lane)});
 return {card,result};
}
test('まくり系の勝利と1コースの被まくり系敗戦を数える',()=>{
 const data=aggregateCourseTechniques([race(),race({first:1,second:2,third:3,move:'逃　げ'})],entrants);
 const fourth=data['5104'].courses[3],inner=data['5101'].courses[0];
 assert.equal(fourth.starts,2);assert.equal(fourth.wins,1);assert.equal(fourth.byMove['まくり'],1);
 assert.equal(inner.starts,2);assert.equal(inner.wins,1);assert.equal(inner.byMove['逃げ'],1);assert.equal(inner.beatenByAttack,1);
});
test('差しとまくり差しを区別し、実進入と枠を混同しない',()=>{
 const data=aggregateCourseTechniques([race({first:2,second:3,third:1,move:'差し',courses:[3,2,1,4,5,6]}),race({first:3,second:2,third:1,move:'まくり 差し',courses:[3,2,1,4,5,6]})],entrants);
 assert.equal(data['5102'].courses[1].byMove['差し'],1);
 assert.equal(data['5103'].courses[0].byMove['まくり差し'],1);
 assert.equal(data['5101'].courses[2].starts,2);
 assert.equal(data['5101'].courses[0].starts,0);
});
test('当地フィルタと結果/進入欠損時の除外',()=>{
 const bad=race();delete bad.result['6コース_艇番'];
 const all=aggregateCourseTechniques([race(),race({venue:'20'}),bad],entrants);
 const local=aggregateCourseTechniques([race(),race({venue:'20'}),bad],entrants,'19');
 assert.equal(all['5104'].courses[3].starts,2);
 assert.equal(local['5104'].courses[3].starts,1);
});
test('2コース逃がし率の分母は2コース実出走数',()=>{
 const data=aggregateCourseTechniques([race({first:1,second:2,third:3,move:'逃げ'}),race({first:2,second:1,third:3,move:'差し'})],entrants);
 assert.equal(data['5102'].courses[1].starts,2);
 assert.equal(data['5102'].courses[1].allowedEscape,1);
});
test('展示進入が完全な並びの場合のみ採用する',()=>{
 const swap={entries:entrants,previews:{stt:{'艇1_コース':2,'艇2_コース':1,'艇3_コース':3,'艇4_コース':4,'艇5_コース':5,'艇6_コース':6}}};
 assert.deepEqual(determineExpectedCourses(swap),{confirmed:true,courses:[2,1,3,4,5,6]});
 delete swap.previews.stt['艇6_コース'];
 assert.deepEqual(determineExpectedCourses(swap),{confirmed:false,courses:[1,2,3,4,5,6]});
});
test('登録番号がない場合は他人の結果で補わない',()=>{
 const data=aggregateCourseTechniques([race()], [{lane:1,id:''}]);
 assert.deepEqual(data,{});
 assert.equal(normalizeMove('捲り 差し'),'まくり差し');
});


test('6艇を1画面で比較でき、複勝率・3連対率・決まり手を正しく切り替える',()=>{
 const history={raceId:'r1',date:'2026-11-04',days:30,loaded:2,techniqueRecords:[
   race({first:4,second:1,third:2,move:'まくり'}),
   race({first:1,second:2,third:3,move:'逃げ'})
 ]};
 const selected={id:'r1',venue:'19',entries:entrants,previews:{}};
 const basic=renderCourseTechniques(selected,history);
 assert.equal((basic.match(/<tr class="/g)||[]).length,6);
 assert.match(basic,/6艇のコース別成績一覧/);
 assert.match(basic,/2連対/);
 assert.match(basic,/3連対/);
 assert.match(basic,/まくり系/);
 const row2=basic.split('<tr class="')[2];
 assert.match(row2,/50\.0%/);
 assert.match(row2,/100\.0%/);
 assert.doesNotMatch(basic,/tech-selected-detail/);
 const moves=renderCourseTechniques(selected,history,{view:'moves'});
 assert.match(moves,/<th scope="col">まくり差し<\/th>/);
 assert.match(moves,/<th scope="col">差し<\/th>/);
 assert.doesNotMatch(moves,/<th scope="col">2連対<\/th>/);
 const details=renderCourseTechniques(selected,history,{selectedLane:2});
 assert.match(details,/tech-selected-detail/);
 assert.match(details,/複勝率/);
 assert.match(details,/3連対率/);
 assert.match(details,/1\/2走/);
 const defense=renderCourseTechniques(selected,history,{view:'tactics'});
 assert.match(defense,/被まくり系/);
 assert.match(defense,/逃がし/);
});
test('コースに適用不能な逃げ・被まくり系・逃がしは正しく空欄にする',()=>{
 const data=aggregateCourseTechniques([race({first:1,second:2,third:3,move:'逃げ'})],entrants);
 const course1=data['5101'].courses[0],course2=data['5102'].courses[1];
 assert.equal(techniqueMetric(course1,1,'escape'),1);
 assert.equal(techniqueMetric(course2,2,'escape'),null);
 assert.equal(techniqueMetric(course1,1,'allow'),null);
 assert.equal(techniqueMetric(course2,2,'allow'),1);
 assert.equal(techniqueMetric(course1,1,'top3'),1);
});
test('公開3年統計も同じ6艇一覧で表示し、対象期間を明示',()=>{
 const races={id:'r1',venue:'19',entries:entrants,previews:{}};
 const values=Array.from({length:6},()=>Array(13).fill(0));
 values[0]=[20,10,5,2,10,0,0,0,0,0,0,3,0];
 const published={raceId:'r1',index:{start:'2023-11-01',end:'2026-10-28',validRaces:152795},racers:{
 '5101':{all:values,venues:{'19':values}}
 }};
 const html=renderCourseTechniques(races,null,{published});
 assert.match(html,/3年実績/);
 assert.match(html,/50\.0%/);
 assert.match(html,/75\.0%/);
 assert.match(html,/85\.0%/);
 assert.equal((html.match(/<tr class="/g)||[]).length,6);
 assert.match(html,/2023-11-01/);
});
