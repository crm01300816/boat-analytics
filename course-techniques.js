// 結果CSVの「実進入コース」と「決まり手」からのみ算出。握りの試行回数は推定しない。
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
export function renderCourseTechniques(race,history,{scope='all',days=60}={}){
  if(!race)return '';
  if(!history||history.raceId!==race.id||!Array.isArray(history.techniqueRecords))
    return '<section class="panel"><div class="panel-header"><div><h3>決まり手・攻撃力・インの攻撃耐性</h3><p>今回の6選手を、進入コース別に比較します。</p></div></div><div class="panel-body"><p>上の「過去成績から集計する」を押すと全国の実レース結果から集計します。レースを変更した場合も再集計が必要です。</p><p class="footnote">実際に握って回った試行回数は公開の結果CSVだけでは分かりません。「まくり系勝率」を代替指標として表示します。</p></div></section>';
  const {confirmed,courses}=determineExpectedCourses(race);
  const stats=aggregateCourseTechniques(history.techniqueRecords,race.entries,scope==='venue'?race.venue:null);
  const cards=race.entries.map((e,i)=>{
    const course=courses[i],c=stats[clean(e.id)]?.courses[course-1]||blank();
    const attack=c.byMove['まくり']+c.byMove['まくり差し'];
    const header='<div class="technique-card-head"><span class="lane lane-'+e.lane+'">'+e.lane+'</span><div><b>'+esc(e.name)+'</b><small>'+course+'コース'+(confirmed?'（展示進入）':'（枠なり想定）')+'</small></div><span class="technique-sample">'+c.starts+'走'+(c.starts>0&&c.starts<10?'・少数':'')+'</span></div>';
    const summary='<div class="technique-main"><div><small>1着率</small><strong>'+pct(c.wins,c.starts)+'</strong></div><div><small>まくり系勝率</small><strong>'+pct(attack,c.starts)+'</strong></div></div>';
    const methods='<div class="technique-methods">'+['逃げ','差し','まくり','まくり差し'].map(k=>'<div><span>'+k+'</span>'+format(c.byMove[k],c.starts)+'</div>').join('')+'</div>';
    const defense=course===1?'<p class="technique-defense">インの被まくり系率：<strong>'+pct(c.beatenByAttack,c.starts)+'</strong> <small>('+c.beatenByAttack+'/'+c.starts+'走) ／ 攻撃耐性指標：'+pct(c.starts-c.beatenByAttack,c.starts)+'</small></p>':'';
    const allow=course===2?'<p class="technique-defense">2コース時の逃がし率：<strong>'+pct(c.allowedEscape,c.starts)+'</strong></p>':'';
    return '<article class="technique-card">'+header+summary+methods+defense+allow+'</article>';
  }).join('');
  return '<section class="panel technique-panel"><div class="panel-header"><div><h3>決まり手・攻撃力・インの攻撃耐性</h3><p>この6選手を今回の進入コース別に比較</p></div></div><div class="panel-body">'+
    '<div class="technique-toolbar"><span>過去'+esc(history.days||days)+'日・取得成功'+history.loaded+'日</span><div class="technique-scope"><button type="button" class="'+(scope==='all'?'active':'')+'" data-technique-scope="all">全国</button><button type="button" class="'+(scope==='venue'?'active':'')+'" data-technique-scope="venue">当地</button></div></div>'+
    (!confirmed?'<div class="notification warning">展示進入が6艇すべて確定していないため、枠なり進入で表示しています。進入が変われば対象コースも変わります。</div>':'')+
    '<div class="technique-grid">'+cards+'</div>'+
    '<p class="footnote">分母は該当選手の該当実進入コースでの有効出走数。まくり系勝率＝まくり＋まくり差しで勝った回数÷出走数。イン被まくり系率＝1コース時に他艇のまくり・まくり差しで敗れた回数÷出走数。攻撃耐性指標＝100%−被まくり系率で、仕掛けられた時の防御成功率ではありません。着順・進入不明レースは除外。未取得日や少数標本に注意。予測モデルには未反映です。</p></div></section>';
}
