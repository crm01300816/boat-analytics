// 結果CSVの「実進入コース」と「決まり手」からのみ算出。握りの試行回数は推定しない。
import {publishedRaceCourseStats} from './published-course-stats.js';
const MOVES=['逃げ','差し','まくり','まくり差し','抜き','恵まれ'];
const blank=()=>({starts:0,wins:0,second:0,third:0,byMove:Object.fromEntries(MOVES.map(k=>[k,0])),otherWins:0,beatenByAttack:0,allowedEscape:0});
const clean=x=>String(x??'').trim();
export function normalizeMove(value){
  const s=clean(value).replace(/[\s\u3000]/g,'').replace(/捲り差し|捲差し/g,'まくり差し').replace(/捲り/g,'まくり');
  return s==='まくりざし'?'まくり差し':s;
}
const validLane=n=>Number.isInteger(n)&&n>=1&&n<=6;
function actualCourses(result){
  const lanes=Array.from({length:6},(_,i)=>Number(result[(i+1)+'コース_艇番']));
  if(!lanes.every(validLane)||new Set(lanes).size!==6)return null;
  return new Map(lanes.map((lane,i)=>[lane,i+1]));
}
export function aggregateCourseTechniques(records=[],entries=[],venue=null){
  const ids=new Set(entries.map(e=>clean(e.id)).filter(Boolean));
  const table=Object.fromEntries([...ids].map(id=>[id,{courses:Array.from({length:6},blank)}]));
  for(const {card,result} of records){
    if(!card||!result)continue;
    const code=clean(card['レース場コード']||clean(card['レースコード']).slice(8,10)).padStart(2,'0');
    if(venue!=null&&code!==clean(venue).padStart(2,'0'))continue;
    const positions=[1,2,3].map(n=>Number(result[n+'着_艇番']));
    if(!positions.every(validLane)||new Set(positions).size!==3)continue;
    const courseByLane=actualCourses(result);
    if(!courseByLane)continue;
    const move=normalizeMove(result['決まり手']);
    const first=positions[0],firstCourseLane=[...courseByLane].find(([,c])=>c===1)?.[0];
    for(let lane=1;lane<=6;lane++){
      const id=clean(card['艇'+lane+'_登録番号']);
      if(!ids.has(id))continue;
      const course=courseByLane.get(lane),s=table[id].courses[course-1];
      s.starts++;
      if(first===lane){s.wins++;if(Object.hasOwn(s.byMove,move))s.byMove[move]++;else s.otherWins++;}
      if(positions[1]===lane)s.second++;
      if(positions[2]===lane)s.third++;
      if(course===1&&first!==lane&&(move==='まくり'||move==='まくり差し'))s.beatenByAttack++;
      if(course===2&&first===firstCourseLane&&move==='逃げ')s.allowedEscape++;
    }
  }
  return table;
}
export function determineExpectedCourses(race){
  const entries=race?.entries||[],exhibition=race?.previews?.stt||{};
  const codes=entries.map(e=>Number(exhibition['艇'+e.lane+'_コース']));
  const confirmed=entries.length===6&&codes.every(validLane)&&new Set(codes).size===6;
  return {confirmed,courses:entries.map((e,i)=>confirmed?codes[i]:e.lane)};
}
const pct=(a,b)=>b>0?(a/b*100).toFixed(1)+'%':'—';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const format=(num,total)=>'<b>'+pct(num,total)+'</b><small>'+num+'/'+total+'走</small>';
const VIEWS={
  basic:{label:'着順・複勝',columns:[['1着率','wins'],['2連対','top2'],['3連対','top3'],['まくり系','attack']]},
  moves:{label:'決まり手',columns:[['逃げ','escape'],['差し','sashi'],['まくり','makuri'],['まくり差し','makuriSashi']]},
  tactics:{label:'攻撃・守備',columns:[['まくり系','attack'],['逃げ','escape'],['被まくり系','beaten'],['逃がし','allow']]}
};
export function techniqueMetric(stat,course,key){
  if(!stat||!stat.starts)return null;
  if(key==='wins')return stat.wins;
  if(key==='top2')return stat.wins+stat.second;
  if(key==='top3')return stat.wins+stat.second+stat.third;
  if(key==='attack')return stat.byMove['まくり']+stat.byMove['まくり差し'];
  if(key==='escape')return course===1?stat.byMove['逃げ']:null;
  if(key==='sashi')return stat.byMove['差し'];
  if(key==='makuri')return stat.byMove['まくり'];
  if(key==='makuriSashi')return stat.byMove['まくり差し'];
  if(key==='beaten')return course===1?stat.beatenByAttack:null;
  if(key==='allow')return course===2?stat.allowedEscape:null;
  return null;
}
const compareValue=(stat,course,key)=>{
  const n=techniqueMetric(stat,course,key);
  return n===null?'<span class="tech-empty">—</span>':'<strong>'+pct(n,stat.starts)+'</strong>';
};
export function renderCourseTechniques(race,history,{scope='all',days=60,published=null,selectedDate='',view='basic',selectedLane=0}={}){
  if(!race)return '';
  const hasPublished=published?.raceId===race.id&&published?.index;
  if(!hasPublished&&(!history||history.raceId!==race.id||!Array.isArray(history.techniqueRecords)))
    return '<section class="panel"><div class="panel-header"><div><h3>6艇のコース別成績一覧</h3><p>選手6名を1画面で比較</p></div></div><div class="panel-body"><p>公開3年統計を確認しています。未配信の場合は「不足分を取得する」で端末保存データを利用できます。</p><p class="footnote">まくり・まくり差しの「勝率」は分かりますが、仕掛けを試みた「握り率」は公開結果だけでは算出できません。</p></div></section>';
  const {confirmed,courses}=determineExpectedCourses(race);
  const stats=hasPublished?publishedRaceCourseStats(published,scope,race.venue):aggregateCourseTechniques(history.techniqueRecords,race.entries,scope==='venue'?race.venue:null);
  const rows=race.entries.map((entry,i)=>({entry,course:courses[i],stat:stats[clean(entry.id)]?.courses[courses[i]-1]||blank()}));
  const current=VIEWS[view]||VIEWS.basic;
  const tabs='<div class="tech-view-switch" role="group" aria-label="比較する成績">'+Object.entries(VIEWS).map(([id,def])=>
    '<button type="button" data-technique-view="'+id+'" class="'+(current===def?'active':'')+'" aria-pressed="'+(current===def)+'">'+def.label+'</button>').join('')+'</div>';
  const head='<thead><tr><th scope="col">選手 / コース</th>'+current.columns.map(([label])=>'<th scope="col">'+label+'</th>').join('')+'</tr></thead>';
  const body='<tbody>'+rows.map(({entry,course,stat})=>
    '<tr class="'+(selectedLane===entry.lane?'tech-row-selected':'')+'"><th scope="row">'+
    '<button type="button" class="tech-entrant" data-technique-racer="'+entry.lane+'" aria-pressed="'+(selectedLane===entry.lane)+'" title="'+esc(entry.name)+'の詳細">'+
    '<span class="lane lane-'+entry.lane+'">'+entry.lane+'</span><span class="tech-entrant-meta"><b>'+esc(entry.name)+'</b><small>'+course+'コース · '+stat.starts+'走'+(stat.starts>0&&stat.starts<10?' · 少数':'')+'</small></span><span class="tech-open-icon" aria-hidden="true">'+(selectedLane===entry.lane?'−':'+')+'</span></button></th>'+
    current.columns.map(([,key])=>'<td>'+compareValue(stat,course,key)+'</td>').join('')+'</tr>').join('')+'</tbody>';
  const table='<div class="tech-compare-wrap"><table class="tech-compare-table">'+head+body+'</table></div>';
  const detailRow=rows.find(r=>r.entry.lane===selectedLane);
  let details='';
  if(detailRow){
    const {entry,course,stat}=detailRow;
    const top2=stat.wins+stat.second,top3=top2+stat.third;
    const attack=stat.byMove['まくり']+stat.byMove['まくり差し'];
    const nums=[['1着率',stat.wins],['2連対率',top2],['3連対率',top3],['まくり系勝率',attack]];
    details='<div class="tech-selected-detail" id="technique-racer-detail"><div class="tech-selected-head"><b>'+esc(entry.name)+'｜'+course+'コース詳細</b><span>'+stat.starts+'走の実績</span></div>'+
      '<div class="tech-selected-summary">'+nums.map(([name,n])=>'<div><small>'+name+'</small><strong>'+pct(n,stat.starts)+'</strong><small>'+n+'/'+stat.starts+'走</small></div>').join('')+'</div>'+
      '<div class="tech-selected-moves">'+['逃げ','差し','まくり','まくり差し','抜き','恵まれ'].map(m=>'<div><span>'+m+'</span>'+format(stat.byMove[m],stat.starts)+'</div>').join('')+'</div>'+
      (course===1?'<p class="tech-selected-note">イン被まくり系率：<b>'+pct(stat.beatenByAttack,stat.starts)+'</b>（'+stat.beatenByAttack+'/'+stat.starts+'走）／ 被まくり系以外：'+pct(stat.starts-stat.beatenByAttack,stat.starts)+'</p>':'')+
      (course===2?'<p class="tech-selected-note">2コース時の逃がし率：<b>'+pct(stat.allowedEscape,stat.starts)+'</b>（'+stat.allowedEscape+'/'+stat.starts+'走）</p>':'')+
      '</div>';
  }
  const meta=hasPublished?'公式B/K '+esc(published.index.start)+'〜'+esc(published.index.end)+' ／ 有効'+Number(published.index.validRaces).toLocaleString('ja-JP')+'レース':'過去'+esc(history.days||days)+'日 ／ 取得'+history.loaded+'日';
  return '<section class="panel technique-panel"><div class="panel-header"><div><h3>6艇のコース別成績一覧</h3><p>数字を横並びで比較。選手名を押すと詳細を表示</p></div>'+(hasPublished?'<span class="small-pill">3年実績</span>':'')+'</div><div class="panel-body">'+
    '<div class="technique-toolbar"><span>'+meta+'</span><div class="technique-scope"><button type="button" class="'+(scope==='all'?'active':'')+'" data-technique-scope="all">全国</button><button type="button" class="'+(scope==='venue'?'active':'')+'" data-technique-scope="venue">当地</button></div></div>'+
    tabs+table+'<p class="tech-compare-hint">数値は各選手の今回の実進入コースでの出走数を分母にした割合。「—」は対象外またはデータなし。選手名の「＋」で詳細を開けます。</p>'+details+
    (hasPublished&&selectedDate<=published.index.end?'<div class="notification warning">選択日の後に行われたレースも含む3年統計です。当時の予想精度検証には使用できません。</div>':'')+
    (!confirmed?'<p class="tech-course-note">※ 展示進入未確定のため枠なりを想定。進入変更時は対象コースも変わります。</p>':'')+
    '<p class="footnote">'+(hasPublished?'公式B/K集計は除外・未収録レースを含みます。':'')+
    '2連対率＝（1着＋2着）÷出走、3連対率＝（1〜3着）÷出走。まくり系は「まくり＋まくり差しで1着」の割合。被まくり系は1コース時に他艇のまくり系で敗れた割合、逃がしは2コース時に1コース艇が逃げた割合です。握りを試みた率や将来の的中確率ではありません。予測モデル未反映。</p></div></section>';
}
