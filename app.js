import { fetchCsv, shiftDate, jstToday, venueName } from './csv.js';
import { createRaceList, aggregateLocal, rateRacers, rate, makePicks } from './analytics.js?v=20261104-course-pilot';
import { racerForm } from './racer-form.js';
import { renderCourseTechniques } from './course-techniques.js?v=20261104-compact';
import { loadPublishedCourseStats } from './published-course-stats.js';
import { planCourseForecast } from './course-forecast.js';
import { compactHistoryDay, historyForRace, historyCacheFresh, readHistoryDays, saveHistoryDay } from './history-cache.js';
import { backtestPage, loadBacktest, setBacktestCount } from './backtest-view.js';
import { resultsPage } from './race-results.js';
import {dashboardPage,snapshotOdds,saveForecast,removeForecast} from './smart-navi.js';
import {DEFAULT_WEIGHTS,modelPage,loadModels,saveModel,deleteModel,verifyCustom} from './custom-model.js?v=20261030-custom3';

const MENU=[['dashboard','◉','今日のナビ'],['races','▦','レース分析'],['results','≋','結果・水面'],['local','◎','当地・枠別'],['predict','✧','3連単1,000円'],['custom','⚙','マイモデル'],['backtest','◷','過去検証'],['sources','▤','データ・算出法']];
const s={date:jstToday(),detailTab:'entries',tab:'dashboard',venue:'',raceId:'',races:[],loading:true,error:'',availability:{},at:'',history:null,historyBusy:false,histProgress:'',histError:'',historyDays:60,techniqueScope:'all',techniqueView:'basic',techniqueRacer:0,publishedCourse:null,publishedBusy:false,publishedError:'',mode:'balance',count:7,predictionVariant:'base',controller:null,resultRows:[],payoutRows:[],daily:null,prospective:null,dailyLoading:false,dailyLoaded:false,dailyError:''};
let customWeights={...DEFAULT_WEIGHTS},customController=null;
const LIVE_INTERVAL_MS=60000;
let liveBusy=false,liveTimer=null;
let historyTicket=0,publishedTicket=0;
function exhibitionSignature(races){return JSON.stringify(races.map(r=>[r.id,r.previews?.tkz||null,r.previews?.stt||null]));}
function liveStatus(){return s.date===jstToday()?`<div class="live-exhibition"><span class="live-dot"></span><div><b>展示情報の自動更新</b><small>${s.liveBusy?'更新確認中…':s.liveAt?'最終確認 '+esc(s.liveAt)+' JST':'初回データ確認待ち'} ／ 60秒間隔</small></div><button type="button" id="live-refresh" ${s.liveBusy?'disabled':''}>今すぐ更新</button></div>`:'';}
async function refreshExhibition(){
 if(liveBusy||s.loading||s.date!==jstToday()||document.hidden||!s.races.length)return;
 liveBusy=true;s.liveBusy=true;
 const date=s.date,controller=s.controller;
 const before=exhibitionSignature(s.races);
 try{
  const [tkz,stt,sui,od3]=await Promise.allSettled(['previews/tkz','previews/stt','previews/sui','previews/od3'].map(path=>fetchCsv(path,date,controller?.signal)));
  if(s.date!==date||controller?.signal.aborted)return;
  const previews={};
  for(const [key,result] of [['tkz',tkz],['stt',stt],['sui',sui],['od3',od3]])if(result.status==='fulfilled'){previews[key]=new Map(result.value.map(row=>[String(row['レースコード']),row]));s.availability[key]=true;}
  for(const race of s.races){for(const [key,map] of Object.entries(previews)){const row=map.get(String(race.id));if(row)race.previews[key]=row;}}
  const changed=before!==exhibitionSignature(s.races);
  s.liveAt=new Date().toLocaleTimeString('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit'});
  s.liveChanged=changed;
  snapshotOdds(s.races,s.date);
  render();
 }catch(e){if(!controller?.signal.aborted){s.liveError=e.message||String(e);render();}}
 finally{liveBusy=false;s.liveBusy=false;const el=document.querySelector('.live-exhibition small');if(el&&s.liveAt)el.textContent='最終確認 '+s.liveAt+' JST ／ 60秒間隔';}
}

const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=1)=>v===null||v===undefined||!Number.isFinite(Number(v))?'—':Number(v).toFixed(d);
const pct=v=>v===null||v===undefined||!Number.isFinite(Number(v))?'—':fmt(v)+'%';
const yen=v=>v==null?'—':new Intl.NumberFormat('ja-JP').format(v)+'円';
const current=()=>s.races.find(r=>r.id===s.raceId)||s.races.find(r=>r.venue===s.venue)||null;
const currentLocal=()=>{const r=current();return r&&s.history?.venue===r.venue&&s.history?.date===s.date?aggregateLocal(s.history.records,r.entries,r.venue):null;};
function goto(tab){s.tab=tab;location.hash=tab;render();if(tab==='backtest')loadBacktest(render);if(tab==='results')loadDailyTrends();if(['races','local','predict'].includes(tab)&&!s.historyBusy&&!s.history)void restoreCachedHistory();if((tab==='races'&&s.detailTab==='course')||tab==='predict')void loadPublishedForCurrent();window.scrollTo(0,0);}
function nav(){return MENU.map(([id,icon,name])=>`<button class="nav-link ${id===s.tab?'active':''}" data-nav="${id}"><span class="nav-icon">${icon}</span>${name}</button>`).join('');}
const MOBILE_MENU=[['dashboard','⌂','ホーム'],['races','▦','レース'],['predict','✧','AI予想'],['backtest','◷','過去検証'],['menu','☰','メニュー']];
function mobileNav(){return MOBILE_MENU.map(([id,icon,name])=>`<button class="nav-link ${id===s.tab||(id==='menu'&&['results','local','custom','sources'].includes(s.tab))?'active':''}" data-nav="${id}"><span class="nav-icon">${icon}</span><span>${name}</span></button>`).join('');}
function menuPage(){return `<div class="simple-menu"><div class="premium-page-head"><span class="premium-page-kicker">SETTINGS & TOOLS</span><h1>メニュー</h1><p>各種データ・分析ツールはこちらから</p></div><div class="simple-menu-grid">${MENU.filter(([id])=>!['dashboard','races','predict','backtest'].includes(id)).map(([id,icon,name])=>`<button data-nav="${id}"><span>${icon}</span><strong>${name}</strong><small>開く ›</small></button>`).join('')}<a href="./venue-stats.html"><span>◎</span><strong>全国24場の特徴一覧</strong><small>イン逃げ率・枠番別勝率 ›</small></a><a href="./selective-five.html"><span>★</span><strong>厳選5点予想</strong><small>専用ページ ›</small></a></div></div>`;}

function selectiveLink(){return '<a href="./selective-five.html" style="display:block;text-align:center;padding:10px 8px;background:#19455a;color:#a6ffec;font-weight:800;text-decoration:none;border-top:1px solid #37687b">★ 厳選5点予想を見る ↗</a>';}
function recentDateTabs(){const today=jstToday();return `<div class="recent-date-tabs" role="group" aria-label="表示する開催日">${Array.from({length:4},(_,i)=>{const date=shiftDate(today,-i),label=i===0?'今日':i===1?'昨日':i===2?'2日前':'3日前';return `<button type="button" class="recent-date-tab ${s.date===date?'active':''}" data-recent-date="${date}" aria-pressed="${s.date===date}"><span>${label}</span><strong>${date.slice(5).replace('-','/')}</strong></button>`;}).join('')}</div>`;}
function headline(title,subtitle){return `<div class="premium-page-head"><span class="premium-page-kicker">BOAT ANALYTICS · RACE DATA</span><h1>${title}</h1><p>${subtitle}</p><span class="premium-page-date">${s.date===jstToday()?'TODAY':'ARCHIVE'} · ${s.date}</span></div>`;}
function laneCombo(combo){return String(combo||'').split('-').map(n=>/^[1-6]$/.test(n)?`<span class="premium-lane lane-${n}">${n}</span>`:`<span>${esc(n)}</span>`).join('<span class="premium-dash">−</span>');}
function deadlineMinutes(value){
  const m=String(value||'').match(/(?:^|\\D)([01]?\\d|2[0-3]):([0-5]\\d)(?:\\D|$)/);
  return m?Number(m[1])*60+Number(m[2]):null;
}
function deadlineState(r,now=new Date()){
  const minutes=deadlineMinutes(r.deadline);
  if(minutes===null)return {cls:'unknown',label:'締切未取得',time:'—'};
  const jst=new Date(now.toLocaleString('en-US',{timeZone:'Asia/Tokyo'}));
  const selectedDay=s.date;
  const currentDay=jst.getFullYear()+'-'+String(jst.getMonth()+1).padStart(2,'0')+'-'+String(jst.getDate()).padStart(2,'0');
  const remain=minutes-(jst.getHours()*60+jst.getMinutes()+jst.getSeconds()/60);
  const time=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
  if(selectedDay<currentDay||selectedDay===currentDay&&remain<=0)return {cls:'closed',label:'締切済',time};
  if(selectedDay>currentDay)return {cls:'future',label:'締切予定',time};
  if(remain<=5)return {cls:'urgent',label:'締切まで '+Math.ceil(remain)+'分',time};
  return {cls:'open',label:'締切予定',time};
}
function selectors(){
  const venues=[...new Set(s.races.map(r=>r.venue))].sort();
  const races=s.races.filter(r=>r.venue===s.venue);
  const event=races.find(r=>r.event)?.event||'';
  const venueButtons=venues.map(v=>`<button class="venue ${s.venue===v?'active':''}" data-venue="${v}">${esc(venueName(v))}<small>${s.races.filter(r=>r.venue===v).length}R</small></button>`).join('');
  const raceCards=races.map(r=>{
    const d=deadlineState(r);
    return `<button class="deadline-race-card ${r.id===s.raceId?'active':''} deadline-${d.cls}" data-race="${r.id}" data-deadline-race="${r.id}" aria-label="${esc(venueName(r.venue))} ${r.number}R 締切予定 ${esc(d.time)}">
      <span class="deadline-race-top"><b>${r.number}<small>R</small></b><span class="deadline-status" data-deadline-status>${esc(d.label)}</span></span>
      <span class="deadline-race-name">${esc(r.name)}</span>
      <span class="deadline-race-time"><small>締切予定</small><strong>${esc(d.time)}</strong></span>
    </button>`;
  }).join('');
  return `<div class="section-head"><div><h2>競艇場を選択</h2><p>開催場から分析対象を選択</p></div><span class="time">${venues.length}場</span></div>
    <div class="venue-list">${venueButtons}</div>
    <div class="deadline-event"><div><span class="deadline-event-eyebrow">RACE SCHEDULE</span><h2>${esc(venueName(s.venue))}・開催レース</h2><p>${esc(event||'開催情報')} ／ 開催日 ${esc(s.date.replaceAll('-','/'))}</p></div><span class="deadline-event-date">${esc(s.date.slice(5).replace('-','/'))}</span></div>
    <div class="deadline-race-grid">${raceCards}</div>
    <p class="deadline-note">締切は取得データの予定時刻（日本時間）。5分前から赤く表示。時刻変更・中止などは公式発表を優先してください。カードを押すとレース分析へ移動します。</p>`;
}
function refreshDeadlineCards(){
  if(s.tab!=='races')return;
  for(const node of document.querySelectorAll('[data-deadline-race]')){
    const r=s.races.find(x=>x.id===node.dataset.deadlineRace);if(!r)continue;
    const d=deadlineState(r);
    node.classList.remove('deadline-unknown','deadline-closed','deadline-future','deadline-urgent','deadline-open');
    node.classList.add('deadline-'+d.cls);
    const label=node.querySelector('[data-deadline-status]');if(label)label.textContent=d.label;
  }
}
function intro(r){return `<div class="panel"><div class="panel-header"><div><div class="page-eyebrow">VENUE ${r.venue} / RACE ${r.number}</div><h2>${esc(r.venueName)} ${r.number}R <span class="small-pill">${esc(r.name)}</span></h2><p>${esc(r.event||'本日のレース')} / 締切表示：${esc(r.deadline)}${r.canceled?' / 中止・順延情報あり':''}</p></div><button class="button outline" id="copy-race">情報をコピー</button></div></div>`;}
function metrics(){return `<div class="metrics"><div class="metric"><span class="metric-label">開催場</span><b class="metric-number">${new Set(s.races.map(r=>r.venue)).size}<small>/24</small></b></div><div class="metric"><span class="metric-label">本日のレース</span><b class="metric-number">${s.races.length}<small>R</small></b></div><div class="metric"><span class="metric-label">出走選手</span><b class="metric-number">${new Set(s.races.flatMap(r=>r.entries.map(e=>e.id)).filter(Boolean)).size}<small>名</small></b></div><div class="metric"><span class="metric-label">3連単オッズ収録</span><b class="metric-number">${s.races.filter(r=>r.previews?.od3).length}<small>R</small></b></div></div>`;}
function formPanel(r){
 const items=r.entries.map(e=>({...e,form:racerForm(e)}));
 return '<div class="panel"><div class="panel-header"><div><h3>📈 選手の調子判定（直近10走）</h3><p>同枠の直近着順に基づく参考指数。全国勝率や全コースの直近成績とは異なります。</p></div><span class="small-pill">予想には未反映</span></div><div class="panel-body mini-list">'+items.map(e=>'<div class="mini-row"><span class="lane lane-'+e.lane+'" style="width:25px;height:27px">'+e.lane+'</span><label>'+esc(e.name)+'<small style="display:block;color:#9bb8d1">'+e.form.count+'走 / '+e.form.label+'</small></label><div class="track"><span class="fill" style="width:'+(e.form.score??0)+'%;background:'+(e.form.score>=70?'#16a34a':e.form.score>=60?'#3b82f6':e.form.score>=45?'#f59e0b':'#64748b')+'"></span></div><b>'+(e.form.score??'—')+'</b></div>').join('')+'<p class="footnote">5走未満は判定保留。指数は的中確率ではなく、同枠着順の傾向を示す試験的指標です。</p></div></div>';
}
function racerTable(r){const local=currentLocal();return formPanel(r)+`<div class="panel"><div class="panel-header"><div><h3>6艇の選手・モーターを比較</h3><p>横にスクロールするとすべての数値を表示</p></div><button class="button outline" data-nav="predict">買い目を見る →</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>枠・選手</th><th>全国勝率</th><th>全国2連率</th><th>全国3連率</th><th>当地勝率</th><th>当地2連率</th><th>当地3連率</th><th>平均ST</th><th>枠番別勝率</th><th>モーター2連率</th><th>モーター3連率</th><th>ボート2連率</th><th>当地同枠2連率</th><th>独自スコア</th></tr></thead><tbody>${rateRacers(r,local).map(e=>`<tr><td><div class="racer-cell"><span class="lane lane-${e.lane}">${e.lane}</span><span><b>${esc(e.name)}</b><small>${esc(e.className)} / ${esc(e.branch)} / ${esc(e.id)}</small></span></div></td><td class="strong">${fmt(e.win,2)}</td><td>${pct(e.n2)}</td><td>${pct(e.n3)}</td><td>${fmt(e.localWin,2)}</td><td>${pct(e.l2)}</td><td>${pct(e.l3)}</td><td>${fmt(e.st,2)}</td><td>${fmt(e.frameWin,2)}</td><td>${esc(e.motor)}号機 / ${pct(e.m2)}</td><td>${pct(e.m3)}</td><td>${pct(e.b2)}</td><td class="accent">${e.localFrame.starts?pct(rate(e.localFrame.first+e.localFrame.second,e.localFrame.starts)):'未集計'}<small style="display:block">${e.localFrame.starts}走</small></td><td class="score">${fmt(e.score,0)}</td></tr>`).join('')}</tbody></table></div><div class="footnote">掲載値は公開CSV由来。当地同枠2連率のみ「当地・枠別」画面の履歴集計結果です。独自スコアは的中確率ではありません。</div></div>`;}
// Relative standout indicators compare only the six entrants in this race.
function standoutMap(rows,key,{lower=false,minGap=0,moderate=0.08,strong=0.18}={}){
 const valid=rows.map(x=>({lane:x.lane,value:Number(x[key])})).filter(x=>x.value!==null&&Number.isFinite(x.value)&&x.value>0).sort((a,b)=>lower?a.value-b.value:b.value-a.value);
 if(valid.length<3)return new Map();
 const first=valid[0],second=valid[1],gap=lower?(second.value-first.value)/second.value:(first.value-second.value)/second.value;
 if(gap<moderate|| (lower?second.value-first.value:first.value-second.value)<minGap)return new Map();
 return new Map([[first.lane,{level:gap>=strong?'strong':'moderate',gap,second:second.value}]]);
}
function standoutBadge(hit,unit=''){return hit?`<small class="standout-badge ${hit.level==='strong'?'standout-strong':'standout-moderate'}">★ ${hit.level==='strong'?'突出':'優位'} · 2位差 ${(hit.gap*100).toFixed(0)}%</small>`:'';}
function exhibitionGrades(r){
 const values=r.entries.map(e=>({lane:e.lane,time:Number(r.previews?.tkz?.[`艇${e.lane}_展示タイム`]),st:Number(r.previews?.stt?.[`艇${e.lane}_スタート展示`])}));
 const validTime=values.filter(x=>Number.isFinite(x.time)&&x.time>=5&&x.time<=9);
 const validSt=values.filter(x=>Number.isFinite(x.st)&&x.st>=-0.5&&x.st<=1);
 if(validTime.length<4)return new Map();
 const minTime=Math.min(...validTime.map(x=>x.time));const minSt=validSt.length>=4?Math.min(...validSt.map(x=>x.st)):null;
 const ranked=validTime.map(x=>{const timeGap=x.time-minTime;const stValid=validSt.some(v=>v.lane===x.lane);const stGap=stValid&&minSt!==null?x.st-minSt:null;
 const score=Math.max(0,100-timeGap*160-(stGap===null?0:Math.max(0,stGap)*25));
 const notes=[];if(timeGap<=0.015)notes.push('展示タイム最速');else if(timeGap<=0.05)notes.push('展示タイム上位');
 if(stGap!==null&&stGap<=0.02)notes.push('スタート展示が速い');
 return {...x,score,notes};}).sort((a,b)=>b.score-a.score);
 const result=new Map();ranked.forEach((x,i)=>{const grade=i===0?'S':i===1?'A':i<=3?'B':'C';result.set(x.lane,{grade,reason:x.notes[0]|| (grade==='C'?'展示タイムで見劣り':'展示タイムは中位')});});return result;
}
function performance(r){const scored=rateRacers(r,currentLocal()).sort((a,b)=>(b.score??0)-(a.score??0));const scoreHighlights=standoutMap(scored,'score',{minGap:4,moderate:.08,strong:.2});const tkz=r.previews?.tkz,stt=r.previews?.stt,sui=r.previews?.sui,grades=exhibitionGrades(r);return `<div class="two-col"><div class="panel"><div class="panel-header"><h3>実力比較スコア</h3><span class="small-pill">参考値</span></div><div class="panel-body mini-list">${scored.map(e=>`<div class="mini-row ${scoreHighlights.has(e.lane)?'standout-row standout-'+scoreHighlights.get(e.lane).level:''}"><span class="lane lane-${e.lane}" style="width:22px;height:24px;font-size:11px">${e.lane}</span><label>${esc(e.name)}${standoutBadge(scoreHighlights.get(e.lane))}</label><div class="track"><span class="fill" style="width:${Math.max(0,e.score||0)}%"></span></div><b>${fmt(e.score,0)}</b></div>`).join('')}</div></div><div class="panel"><div class="panel-header"><h3>同枠での直近10走</h3></div><div class="panel-body mini-list">${r.entries.map(e=>`<div class="mini-row"><span class="lane lane-${e.lane}" style="width:22px;height:24px;font-size:11px">${e.lane}</span><label>${esc(e.name)}</label><div class="form-row">${e.recent.length?e.recent.map(v=>`<span class="form-dot ${v==='1'?'good':''}">${esc(v)}</span>`).join(''):'<span class="time">未取得</span>'}</div></div>`).join('')}</div></div></div><div class="two-col"><div class="panel"><div class="panel-header"><h3>展示・進入情報</h3><span class="small-pill">直前更新分</span></div><div class="table-wrap"><table class="data-table" style="min-width:500px"><thead><tr><th>枠</th><th>選手</th><th>展示タイム</th><th>スタート展示</th><th>進入</th><th>展示評価</th></tr></thead><tbody>${r.entries.map(e=>`<tr><td><span class="lane lane-${e.lane}" style="height:25px;width:25px">${e.lane}</span></td><td>${esc(e.name)}</td><td>${esc(tkz?.[`艇${e.lane}_展示タイム`]||'—')}</td><td>${esc(stt?.[`艇${e.lane}_スタート展示`]||'—')}</td><td>${esc(stt?.[`艇${e.lane}_コース`]||'—')}</td><td>${grades.has(e.lane)?`<strong class="exhibition-grade grade-${grades.get(e.lane).grade}">${grades.get(e.lane).grade}</strong><small class="exhibition-reason">${grades.get(e.lane).reason}</small>`:'<span>未評価</span>'}</td></tr>`).join('')}</tbody></table></div></div><div class="panel"><div class="panel-header"><h3>水面・気象</h3></div><div class="panel-body"><div class="stat-cards"><div class="stat-card"><small>風速</small><b>${esc(sui?.['風速(m)']||'—')}m</b></div><div class="stat-card"><small>波高</small><b>${esc(sui?.['波の高さ(cm)']||'—')}cm</b></div><div class="stat-card"><small>天候</small><b style="font-size:13px">${esc(sui?.['天候']||'未取得')}</b></div></div><p class="time">気象は表示のみです。風や波と勝率の統計的関係を確認していないため、独自スコアへの重み付けは行いません。</p></div></div></div>`;}
function motorHistoryPanel(r){
 const history=s.history?.venue===r.venue&&s.history?.date===s.date?s.history:null;
 const intro='<div class="panel"><div class="panel-header"><div><h3>過去のモーター使用者・着順履歴</h3><p>同じ競艇場のモーター番号を照合。選手・級別・全国勝率・枠・着順を表示します。</p></div></div>';
 if(!history)return intro+'<div class="panel-body"><p>過去'+s.historyDays+'日の保存済みデータを自動表示します。初回・不足日だけ取得します。</p><button class="button" id="load-history" '+(s.historyBusy?'disabled':'')+'>'+(s.historyBusy?'取得中…':'不足分を取得する')+'</button>'+(s.historyBusy?'<p id="hist-progress-label">'+esc(s.histProgress)+'</p>':'')+(s.histError?'<p class="time">'+esc(s.histError)+'</p>':'')+'</div></div>';
 const byMotor=new Map(r.entries.filter(e=>e.motor).map(e=>[String(Number(e.motor)),{entry:e,rows:[]}]));
 for(const {card,result} of history.records){
  for(let lane=1;lane<=6;lane++){
   const motor=String(Number(card['艇'+lane+'_モーター番号']));
   const target=byMotor.get(motor);if(!target)continue;
   const date=String(card['レースコード']||'').slice(0,8);
   const winner=Number(result['1着_艇番']),second=Number(result['2着_艇番']),third=Number(result['3着_艇番']);
   const finish=winner===lane?1:second===lane?2:third===lane?3:null;
   // Full finishing order is not always provided; do not invent 4th-6th.
   target.rows.push({date,raceNo:Number(String(card['レースコード']||'').slice(10,12)),name:card['艇'+lane+'_選手名']||'不明',className:card['艇'+lane+'_級別']||'—',win:card['艇'+lane+'_全国勝率']||'—',lane,finish,top3:[winner,second,third].every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set([winner,second,third]).size===3?[winner,second,third].join('-'):null,method:result['決まり手']||''});
  }
 }
 const panels=[...byMotor.values()].map(({entry,rows})=>{
  rows.sort((a,b)=>b.date.localeCompare(a.date));
  const known=rows.filter(x=>x.finish!=null),last=rows.slice(0,10),first=known.filter(x=>x.finish===1).length,top2=known.filter(x=>x.finish<=2).length,top3=known.length;
  const ratio=(n,d)=>d?(n/d*100).toFixed(1)+'%':'—';
  return '<details style="margin:10px 0;border:1px solid #31506c;border-radius:12px;padding:12px"><summary style="cursor:pointer;font-weight:750">'+entry.lane+'号艇 / モーターNo.'+esc(entry.motor)+'　使用 '+rows.length+'走</summary><p class="tag">取得 '+history.loaded+'/'+history.days+'日。1〜3着は確認可能。4〜6着は着順未確認と表示。</p><p>確認済み1着 '+first+'件 ／ 2着以内 '+top2+'件 ／ 3着以内 '+top3+'件（分母は全'+rows.length+'走）</p><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>日付</th><th>選手</th><th>級別</th><th>全国勝率</th><th>枠</th><th>着順</th><th>レース結果（3連単）</th><th>決まり手</th></tr></thead><tbody>'+last.map(x=>'<tr><td>'+esc(x.date.slice(0,4)+'/'+x.date.slice(4,6)+'/'+x.date.slice(6,8))+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.className)+'</td><td>'+esc(x.win)+'</td><td>'+x.lane+'</td><td>'+(x.finish?x.finish+'着':'4着以下・未確認')+'</td><td>'+esc(x.raceNo||'—')+'R / '+esc(x.top3||'未確認')+'</td><td>'+esc(x.method||'—')+'</td></tr>').join('')+'</tbody></table></div></details>';
 }).join('');
 return intro+'<div class="panel-body"><p class="tag">過去'+history.days+'日中、取得成功'+history.loaded+'日。各モーターの直近最大10走を表示。モーター交換・番号再利用は別途確認が必要です。</p>'+panels+'</div></div>';
}
function selectedRaceResult(r){
 const result=s.resultRows.find(x=>x['レースコード']===r.id);
 if(!result)return s.date<jstToday()?'<div class="panel"><div class="panel-header"><h3>確定レース結果</h3></div><div class="panel-body"><p>このレースの確定結果は公開データから取得できていません。</p></div></div>':'';
 const order=[1,2,3].map(n=>Number(result[n+'着_艇番']));
 const valid=order.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set(order).size===3;
 if(!valid)return '<div class="panel"><div class="panel-header"><h3>レース結果</h3></div><div class="panel-body"><p>着順未確定・中止・不成立などの可能性があります。確定結果はまだ表示できません。</p></div></div>';
 const payout=s.payoutRows.find(x=>x['レースコード']===r.id);
 const money=payout?.['3連単_払戻金'];
 const number=money!=null&&String(money).trim()!==''&&Number.isFinite(Number(money))?Number(money).toLocaleString('ja-JP')+'円':'未取得';
 const details=[['決まり手',result['決まり手']],['天候',result['天候']],['風速',result['風速(m)']!=null?result['風速(m)']+'m/s':null],['波高',result['波の高さ(cm)']!=null?result['波の高さ(cm)']+'cm':null]].filter(([,v])=>v!=null&&String(v).trim()!=='');
 return '<div class="panel" style="border:2px solid #1682ce"><div class="panel-header"><div><h3>🏁 確定レース結果</h3><p>'+esc(s.date)+' / '+esc(r.venueName)+' '+r.number+'R　公式結果データ由来</p></div><span class="small-pill">確定</span></div><div class="panel-body"><div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">'+order.map((lane,i)=>'<div style="flex:1;min-width:80px;padding:12px;border-radius:10px;background:#eaf3fb;color:#173e61;text-align:center"><small>'+(i+1)+'着</small><div style="font-size:26px;font-weight:850">'+lane+'号艇</div><small>'+esc(r.entries.find(e=>e.lane===lane)?.name||'')+'</small></div>').join('')+'</div><div style="padding:12px;border-radius:10px;background:#eaf3fb;color:#123c62"><strong>3連単　'+order.join('-')+'</strong><span style="float:right;font-weight:800">払戻 '+esc(number)+'</span></div><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px">'+details.map(([k,v])=>'<span><small>'+esc(k)+'：</small><b>'+esc(v)+'</b></span>').join('')+'</div></div></div>';
}
function courseTabPanel(r){const ready=s.publishedCourse?.raceId===r.id;return (ready?'':historyControls())+renderCourseTechniques(r,s.history,{scope:s.techniqueScope,days:s.historyDays,published:ready?s.publishedCourse:null,selectedDate:s.date,view:s.techniqueView,selectedLane:s.techniqueRacer})+(s.publishedError?'<div class="notification warning">3年統計を取得できません：'+esc(s.publishedError)+'。保存済みの端末データも使用できます。</div>':s.publishedBusy&&!ready?'<div class="notification">公開3年統計を確認中…</div>':'');}
function overview(){const r=current();const racersData=r?rateRacers(r,currentLocal()):[];const motorHighlights=standoutMap(r?.entries||[],'m2',{minGap:3,moderate:.08,strong:.2});const winHighlights=standoutMap(racersData,'win',{minGap:.4,moderate:.08,strong:.2});const localHighlights=standoutMap(racersData,'localWin',{minGap:.4,moderate:.08,strong:.2});const stHighlights=standoutMap(racersData,'st',{lower:true,minGap:.015,moderate:.08,strong:.2});const raceHeader=r?'<div class="concept-race-hero"><div class="concept-race-hero-info"><span class="concept-race-badge">RACE ANALYSIS</span><h2>'+esc(venueName(r.venue))+' '+r.number+'R</h2><p>'+esc(r.name||'レース詳細')+'</p><span>締切予定 '+esc(r.deadline||'未取得')+'</span></div></div>':'';const tabs='<div class="concept-detail-tabs" role="tablist" aria-label="レース分析の項目">'+[['entries','出走表'],['racers','選手比較'],['motor','モーター'],['exhibition','展示'],['course','決まり手']].map(([id,label])=>'<button type="button" role="tab" aria-selected="'+(s.detailTab===id)+'" class="'+(s.detailTab===id?'selected':'')+'" data-detail-tab="'+id+'">'+label+'</button>').join('')+'</div>';const racers=r?'<div class="concept-racer-list">'+racersData.map(e=>'<div class="concept-racer"><span class="premium-lane lane-'+e.lane+'">'+e.lane+'</span><span class="concept-racer-avatar" aria-hidden="true">♙</span><span class="concept-racer-name"><b>'+esc(e.name)+'</b><small>'+esc(e.className)+'</small></span><span><small>全国勝率</small><b class="'+(winHighlights.has(e.lane)?'standout-number':'')+'">'+fmt(e.win,2)+'</b>'+standoutBadge(winHighlights.get(e.lane))+'</span><span><small>当地勝率</small><b class="'+(localHighlights.has(e.lane)?'standout-number':'')+'">'+fmt(e.localWin,2)+'</b>'+standoutBadge(localHighlights.get(e.lane))+'</span><span><small>ST</small><b class="'+(stHighlights.has(e.lane)?'standout-number':'')+'">'+fmt(e.st,2)+'</b>'+standoutBadge(stHighlights.get(e.lane))+'</span></div>').join('')+'</div>':'';const motor=r?'<div class="concept-motor"><div><b>モーター情報</b><small>6艇のモーター成績を比較</small></div><div class="concept-motor-list">'+r.entries.map(e=>'<div class="'+(motorHighlights.has(e.lane)?'standout-motor standout-'+motorHighlights.get(e.lane).level:'')+'"><span class="premium-lane lane-'+e.lane+'">'+e.lane+'</span><b>No.'+esc(e.motor||'—')+'</b><small>2連対率</small><strong>'+pct(e.m2)+'</strong></div>').join('')+'</div></div>':'';const selectedContent=s.detailTab==='entries'?racers:s.detailTab==='motor'?motor+motorHistoryPanel(r):s.detailTab==='racers'?racerTable(r):s.detailTab==='course'?courseTabPanel(r):performance(r);return raceHeader+selectors()+(r?selectedRaceResult(r)+tabs+'<div class="concept-detail-panel" role="tabpanel">'+selectedContent+'</div>':'');}
function historyControls(){return `<div class="panel"><div class="panel-header"><div><h3>過去レースから集計</h3><p>当地の枠番別実績と、この6選手の全国・実進入コース別決まり手を集計します。</p></div></div><div class="panel-body"><div class="tools"><label>対象期間 <select class="select" id="history-days"><option value="30" ${s.historyDays===30?'selected':''}>30日</option><option value="60" ${s.historyDays===60?'selected':''}>60日</option><option value="90" ${s.historyDays===90?'selected':''}>90日</option><option value="180" ${s.historyDays===180?'selected':''}>180日</option></select></label><button class="button" id="load-history" ${s.historyBusy?'disabled':''}>${s.historyBusy?'集計中…':s.history?.loaded===s.historyDays?'保存済みデータを確認':'不足分を取得する'}</button>${s.historyBusy?'<button class="button ghost" id="stop-history">中止</button>':''}</div>${s.historyBusy?`<div class="progress"><span id="hist-progress-bar" style="width:${Math.round((s.histDone||0)/s.historyDays*100)}%"></span></div><p class="time" id="hist-progress-label">${esc(s.histProgress)}</p>`:''}${s.histError?`<div class="notification error">${esc(s.histError)}</div>`:''}${s.history?.venue===s.venue&&s.history?.date===s.date?`<div class="notification success">保存済みデータを自動表示中。取得済み ${s.history.loaded}/${s.history.days} 日（今回の表示に再利用した保存データ ${s.history.fromCache||0}日）。当地レース ${s.history.records.length}件。期間：${shiftDate(s.date,-s.history.days)}〜${shiftDate(s.date,-1)}。不足日があれば「不足分を取得する」で補えます。</div>`:'<div class="notification">この端末に保存した過去データは次回から自動で再利用します。初回だけ「不足分を取得する」を押してください。ブラウザのデータ削除・端末変更時は再取得が必要です。</div>'}</div></div>`;}
function localPage(){const r=current(), local=currentLocal();return headline('過去データ・コース別成績','競艇場と枠番を指定して過去の実績を確認')+selectors()+(r?intro(r)+historyControls()+`<div class="panel"><div class="panel-header"><div><h3>当地の同枠成績</h3><p>過去${s.historyDays}日間 / 同じ会場 / 同じ枠番での実走結果</p></div></div><div class="table-wrap"><table class="data-table hist-table"><thead><tr><th>枠・選手</th><th>出走数</th><th>1着回数</th><th>1着率</th><th>2連対率</th><th>3連対率</th><th>逃げ率（実1コース）</th><th>逃がし率（実2コース）</th></tr></thead><tbody>${r.entries.map(e=>{const st=local?.[e.id],f=st?.frames[e.lane-1],x=st?.escape;return `<tr><td><div class="racer-cell"><span class="lane lane-${e.lane}">${e.lane}</span><b>${esc(e.name)}</b></div></td><td>${f?.starts??'—'}</td><td>${f?.starts?f.first:'—'}</td><td class="accent">${f?.starts?pct(rate(f.first,f.starts)):'—'}</td><td>${f?.starts?pct(rate(f.first+f.second,f.starts)):'—'}</td><td>${f?.starts?pct(rate(f.first+f.second+f.third,f.starts)):'—'}</td><td>${x?.course1Starts?pct(rate(x.escape,x.course1Starts)):'—'} <small>${x?.course1Starts?`(${x.course1Starts}走)`:''}</small></td><td>${x?.course2Starts?pct(rate(x.allowEscape,x.course2Starts)):'—'} <small>${x?.course2Starts?`(${x.course2Starts}走)`:''}</small></td></tr>`}).join('')}</tbody></table></div><div class="footnote">逃げ率＝その選手が実際に1コースから進入した時に「逃げ」で1着になった割合。逃がし率＝2コースから進入した時に1コース艇の「逃げ」が成立した割合。場・期間で絞った参考値です。サンプル数が小さい場合は不安定です。</div></div>`:'');}
function getForecastSelection(r,local){
  const base=makePicks(r,local,{mode:s.mode,count:s.count});
  const published=s.publishedCourse?.raceId===r.id?s.publishedCourse:null;
  const plan=planCourseForecast(r,published,s.date);
  const pilot=plan.usable?makePicks(r,local,{mode:s.mode,count:s.count,scoreAdjustments:plan.adjustments}):null;
  const pilotReady=!!(plan.usable&&pilot?.picks?.length===s.count&&pilot.total===1000);
  const selected=pilotReady&&s.predictionVariant==='course'?'course':'base';
  return {base,pilot,plan,pilotReady,selected,chosen:selected==='course'?pilot:base};
}
function renderForecastComparison(result){
  if(!result)return '';
  const {base,pilot,plan,pilotReady,selected}=result;
  const reason=plan.reason||pilot?.reason||'';
  const canShow=pilotReady;
  const selectedButtons='<div class="forecast-variant-tabs" role="group" aria-label="予想モデルを選択">'+
    '<button type="button" data-forecast-variant="base" aria-pressed="'+(selected==='base')+'" class="'+(selected==='base'?'active':'')+'">従来予想</button>'+
    '<button type="button" data-forecast-variant="course" '+(canShow?'':'disabled')+' aria-pressed="'+(selected==='course')+'" class="'+(selected==='course'?'active':'')+'">3年データ統合（試験）</button></div>';
  const combos=p=>p?.picks?.slice(0,Math.min(5,s.count)).map(x=>'<span class="forecast-compare-combo">'+esc(x.combo)+' <small>'+yen(x.stake)+'</small></span>').join('')||'—';
  const compare=canShow?'<div class="forecast-comparison-grid"><div class="'+(selected==='base'?'chosen':'')+'"><b>従来予想</b><div class="forecast-compare-combos">'+combos(base)+'</div></div><div class="'+(selected==='course'?'chosen':'')+'"><b>3年コース統合（試験）</b><div class="forecast-compare-combos">'+combos(pilot)+'</div></div></div>':'';
  const adjustment=canShow?'<details class="forecast-adjustments"><summary>選手ごとのコース補正を確認</summary><div class="forecast-adjustment-list">'+plan.details.map(d=>
    '<div><span class="lane lane-'+d.lane+'">'+d.lane+'</span><b>'+esc(d.name)+'</b><small>'+d.course+'コース '+d.starts+'走</small><strong class="'+(d.delta>0?'plus':d.delta<0?'minus':'')+'">'+(d.delta>0?'+':'')+d.delta.toFixed(2)+'点</strong></div>').join('')+'</div><p class="time">全国の同一実進入コース平均を基準に、当地での差・決まり手・インの被まくり系率などを小幅に補正。0点はサンプル不足または中立。</p></details>':'';
  const availability=!canShow?'<div class="notification">'+(s.publishedBusy?'公式3年統計を読み込み中…':s.publishedError?'公開データを取得できません：'+esc(s.publishedError):esc(reason||'統合予想の計算に必要なデータが不足しています'))+'。現在は従来予想を表示しています。</div>':'';
  return '<section class="panel forecast-comparison-panel"><div class="panel-header"><div><h3>従来予想 × 3年データ統合</h3><p>同じレース・同じ予算1,000円で買い目を比較</p></div><span class="small-pill">未検証の試験機能</span></div><div class="panel-body">'+selectedButtons+compare+adjustment+availability+
    '<p class="footnote">3年集計は2023-11-01〜2026-10-28の固定データ。公開3年統計の終了日より後の開催だけ試験に使用します。進入未確定なら枠なりを想定。少標本を縮小し、補正は1艇±4.5点まで。推定確率は未校正で、回収率改善や的中を保証しません。既存の「厳選5点」と自動記録には反映しません。</p></div></section>';
}
function picksPage(){const r=current(), local=currentLocal();const selection=r?getForecastSelection(r,local):null;const prediction=selection?.chosen;return headline('AI予想・買い目','120通りから統計モデルで参考買い目を選定。100円単位で配分。')+selectors()+(r?intro(r)+renderForecastComparison(selection)+`<div class="panel"><div class="panel-header"><div><h3>買い目の組み立て</h3><p>本命・バランス・穴寄りから選択。公開オッズがある場合は参考EVを利用。</p></div><span class="small-pill">予算固定 ¥1,000</span></div><div class="panel-body"><div class="tools"><div class="mode-tabs"><button class="mode-tab ${s.mode==='safe'?'active':''}" data-mode="safe">本命重視</button><button class="mode-tab ${s.mode==='balance'?'active':''}" data-mode="balance">バランス</button><button class="mode-tab ${s.mode==='aggressive'?'active':''}" data-mode="aggressive">穴寄り</button></div><label>点数 <select class="select" id="bet-count">${[3,5,7,10].map(n=>`<option value="${n}" ${s.count===n?'selected':''}>${n}点</option>`).join('')}</select></label></div></div></div>${prediction?.reason?`<div class="notification warning">${esc(prediction.reason)} 実在のデータが揃うまで架空の買い目は表示しません。</div>`:''}${prediction?.picks?.length?`<div class="pick-layout"><div class="panel"><div class="panel-header"><h3>推奨買い目 ${prediction.picks.length}点</h3><span class="small-pill">${prediction.oddsAvailable?'集計中オッズ反映':'オッズ未取得・確率順'}</span></div><div class="panel-body"><div class="bet-headline"><div><small class="time">合計購入金額</small><div class="bet-total">${yen(prediction.total)}</div></div><button class="button outline" id="copy-bets">買い目をコピー</button></div>${prediction.picks.map((p,i)=>`<div class="bet-card"><div><div class="bet-combo"><span class="small-pill">${String(i+1).padStart(2,'0')}</span><b class="combo premium-combo">${laneCombo(p.combo)}</b></div><small>モデル推定: ${pct(p.p*100)} ／ ${p.odds?`参考オッズ ${fmt(p.odds,1)}倍`:'オッズ未配信'}</small>${p.odds?`<small>参考払戻：${yen(p.estimatedPayout)}（この買い目が的中した場合）</small>`:''}</div><div class="bet-stake">${yen(p.stake)}</div></div>`).join('')}</div></div><div class="panel"><div class="panel-header"><h3>分析内容・注意点</h3></div><div class="panel-body summary-list"><div class="summary-row"><span>評価した組み合わせ</span><strong>120通り</strong></div><div class="summary-row"><span>採用点数</span><strong>${prediction.picks.length}点</strong></div><div class="summary-row"><span>合計予算</span><strong>${yen(prediction.total)}</strong></div><div class="summary-row"><span>選定した出目のモデル確率合計</span><strong>${pct(prediction.mass*100)}</strong></div><div class="summary-row"><span>モデルの種類</span><strong>${selection?.selected==='course'?'3年統合の試験版':'従来モデル'} ／ 未校正</strong></div><div class="summary-row"><span>当地同枠データ</span><strong>${local?'集計済み':'未集計'}</strong></div><div class="summary-row"><span>オッズ</span><strong>${prediction.oddsAvailable?'締切前の参考値':'未取得'}</strong></div><div class="notification warning">推定確率は過去データで校正・検証した的中率ではありません。オッズも締切前の集計中値です。期待値プラスの証明はありません。</div><button class="button outline" data-nav="local">当地×枠番別を集計 →</button></div></div></div>`:''}<div class="panel"><div class="panel-header"><h3>スコアに使ったデータ</h3></div><div class="panel-body"><div class="source-tags">${(prediction?.racers?.[0]?.features||[]).map(f=>`<span class="source-tag ok">${esc(f.name)}</span>`).join('')}</div><p class="time">実際に存在した特徴量のみ加重平均。気象は学習済みの補正がないため表示のみで評価点には含めません。</p></div></div>`:'');}
function sourcesPage(){return headline('データ・算出法','取得元と計算式、データ不足時の処理を明確にしています。')+`<div class="two-col"><div class="panel"><div class="panel-header"><h3>使用データ</h3></div><div class="panel-body method-list">${[['出走表','全国・当地勝率、2/3連対率、モーター、ボート、平均ST、F本数'],['枠番別過去10走','枠別勝率、平均ST、直近10走'],['結果アーカイブ','当地×枠番別1〜3着率、実コースの逃げ率・逃がし率・コース別決まり手勝率・被まくり系率（固定36か月）'],['直前情報','展示タイム・展示ST・進入・風・波・天候'],['オッズ','3連単120通りの締切前集計中オッズ']].map(([k,v])=>`<div class="method-item"><b>${k}</b><p>${v}</p></div>`).join('')}</div></div><div class="panel"><div class="panel-header"><h3>3連単予想の仕組み</h3></div><div class="panel-body method-list"><div class="method-item"><b>1. 6艇の参考スコア</b><p>勝率、全国・当地2/3連率、モーター、枠別、直近着順、ST、展示、取得済みの当地同枠実績を重み付き合成。欠損した項目は除外します。</p></div><div class="method-item"><b>2. 120通りの相対確率</b><p>6艇のスコアとコース優位の仮定からPlackett–Luceモデルで順位確率を作成。外部の検証済み予測モデルではありません。</p></div><div class="method-item"><b>3. 参考オッズの考慮</b><p>オッズがある場合は確率×オッズを参考に順位を調整。締切後の払戻や将来の収益は保証しません。</p></div><div class="method-item"><b>4. 合計1,000円で配分</b><p>3/5/7/10点を選べ、最低100円ずつ、合計1,000円になるよう配分。全組を購入するわけではありません。</p></div></div></div></div><div class="panel"><div class="panel-header"><h3>公開データとプライバシー</h3></div><div class="panel-body"><p class="page-description">BoatraceCSV (MIT) が公開するCSVを各端末のブラウザから取得する非公式アプリです。AppDeployのAPI・AI・DBは使っていません。ブラウザの通信量は発生します。上流の配信遅延・停止時は取得失敗と表示します。</p><div class="source-tags">${Object.entries(s.availability).map(([name,ok])=>`<span class="source-tag ${ok?'ok':''}">${esc(name)} ${ok?'✓':'未取得'}</span>`).join('')}</div><p class="page-description" style="margin-top:20px"><a href="https://boatracecsv.github.io/docs/" target="_blank" rel="noopener noreferrer" style="color:#56dbcd">公開CSV仕様 ↗</a>　<a href="https://www.boatrace.jp/owpc/pc/extra/data/download.html" target="_blank" rel="noopener noreferrer" style="color:#56dbcd">BOAT RACE公式ダウンロード ↗</a></p><p class="time">舟券の購入機能はありません。購入する場合は必ず公式出走表・締切時刻・欠場や返還情報を確認してください。</p></div></div>`;}
function render() {
  $('side-nav').innerHTML=nav();
  $('mobile-nav').innerHTML=mobileNav();
  let link=$('selective-mobile-link');
  if(!link){link=document.createElement('div');link.id='selective-mobile-link';link.style.cssText='position:fixed;bottom:80px;right:12px;z-index:1000;border-radius:12px;overflow:hidden;box-shadow:0 5px 22px #0009';document.body.append(link);}
  link.innerHTML='';link.style.display='none';
  let quick=$('custom-mobile-link');
  if(!quick){quick=document.createElement('a');quick.id='custom-mobile-link';quick.href='#custom';quick.textContent='⚙ マイモデル';quick.setAttribute('aria-label','マイ予想モデルを開く');document.body.append(quick);}
  quick.style.display='none';
  $('breadcrumb').textContent=MENU.find(([k])=>k===s.tab)?.[2]||'レース分析';
  $('date-input').value=s.date;
  $('date-input').max=jstToday();
  $('date-next').disabled=s.date>=jstToday();
  const root=$('app-content');
  const dateTabs=recentDateTabs()+liveStatus();
  if(s.tab==='menu'){root.innerHTML=`<div class="content">${menuPage()}</div>`;return;}
  if(s.tab==='backtest'){root.innerHTML=`<div class="content">${dateTabs}${backtestPage()}</div>`;return;}
  if(s.loading){root.innerHTML=`<div class="content">${dateTabs}${headline('データを取得中','公開CSVを照合しています。')}<div class="panel empty"><h2>レース情報を読み込み中…</h2><p>外部データ取得後に結果を表示します。</p></div></div>`;return;}
  if(s.error&&s.tab!=='sources'&&s.tab!=='results'){
    root.innerHTML=`<div class="content">${dateTabs}${headline('取得できませんでした','実データがなければ予想を出しません。')}<div class="panel empty"><h2>公開CSVの読み込みに失敗しました</h2><p>${esc(s.error)}</p><button class="button" id="retry-load">再取得する</button> <button class="button outline" id="load-previous-day">前日のデータを見る</button><p>CSV未公開 / CORS制限 / 接続エラーが考えられます。日付の変更も試してください。</p></div></div>`;
    return;
  }
  let page='';
  if(s.tab==='dashboard'){try{page=dashboardPage({date:s.date,races:s.races,results:s.resultRows,payouts:s.payoutRows});}catch(error){console.error('Dashboard render failed',error);page=headline('レースナビを復旧中','表示エラーが発生したため、安全なレース一覧を表示しています。')+selectors()+'<div class="panel"><div class="panel-header"><h3>レース一覧</h3></div><div class="panel-body">'+s.races.slice(0,40).map(r=>'<button class="button outline" data-jump-race="'+esc(r.id)+'">'+esc(venueName(r.venue))+' '+r.number+'R</button>').join('')+'</div></div><p class="notification warning">一部のホーム機能で表示エラーが発生しました。レース分析は引き続き利用できます。</p>';}}
  else if(s.tab==='races')page=overview();
  else if(s.tab==='results')page=headline('オッズ・レース結果・水面','払戻・着順・決まり手・波の高さ・風速を確認')+resultsPage({date:s.date,races:s.races,results:s.resultRows,payouts:s.payoutRows,venue:s.venue,raceId:s.raceId,daily:s.daily,dailyError:s.dailyError,prospective:s.prospective});
  else if(s.tab==='local')page=localPage();
  else if(s.tab==='predict')page=picksPage();
  else if(s.tab==='custom')page=modelPage(customWeights,s.races,s.raceId);
  else page=sourcesPage();
  root.innerHTML=`<div class="content">${dateTabs}${page}<div class="footer"><span>BOAT ANALYTICS FREE / 独立した静的Webアプリ</span><span>更新確認 ${esc(s.at||'未取得')} JST · <a target="_blank" rel="noopener noreferrer" href="https://boatracecsv.github.io/docs/">データ提供元 ↗</a></span></div></div>`;
}
async function loadDailyTrends(){
  if(s.dailyLoaded||s.dailyLoading)return;
  s.dailyLoading=true;
  try{
    const response=await fetch('./public/daily-trends.json',{cache:'no-store'});
    if(!response.ok)throw new Error('日別集計の取得に失敗');
    const data=await response.json();
    if(!Array.isArray(data.days))throw new Error('日別集計の形式が不正');
    s.daily=data;s.dailyLoaded=true;s.dailyError='';
    try{
      const future=await fetch('./public/prospective-summary.json',{cache:'no-store'});
      if(future.ok){
        const parsed=await future.json();
        if(Array.isArray(parsed.days))s.prospective=parsed;
      }
    }catch{ /* Future-score display is optional; daily results remain available. */ }
  }catch(e){s.dailyError=e.message||String(e);}
  finally{s.dailyLoading=false;if(s.tab==='results')render();}
}
async function loadDay(){
  s.controller?.abort();
  const ctrl=new AbortController();s.controller=ctrl;
  invalidateHistory();s.predictionVariant='base';s.loading=true;s.error='';s.races=[];s.resultRows=[];s.payoutRows=[];s.availability={};s.histError='';render();
  const paths={title:'programs/title',cards:'programs/race_cards',waku:'programs/waku10',tkz:'previews/tkz',stt:'previews/stt',sui:'previews/sui',od3:'previews/od3',results:'results/realtime',payouts:'results/payouts'};
  try{
    const jobs=Object.entries(paths).map(async([key,path])=>{
      try{const rows=await fetchCsv(path,s.date,ctrl.signal);s.availability[key]=true;return [key,rows];}
      catch(err){if(ctrl.signal.aborted)throw err;s.availability[key]=false;if(key==='cards'&&s.tab!=='results')throw new Error(s.date===jstToday()?'本日の出走表はまだ取得できません。公開元の更新待ちの可能性があります。前日のデータを表示するか、しばらくして再取得してください。':err.message);return [key,[]];}
    });
    const entries=await Promise.all(jobs);
    if(ctrl.signal.aborted)return;
    const data=Object.fromEntries(entries);
    s.resultRows=data.results;s.payoutRows=data.payouts;
    s.races=createRaceList(data.cards,data.title,data.waku,{tkz:data.tkz,stt:data.stt,sui:data.sui,od3:data.od3});
    snapshotOdds(s.races,s.date);
    if(!s.races.length&&s.tab!=='results')throw new Error('指定日の出走表がありません。');
    const possibleVenues=[...new Set([...s.races.map(r=>r.venue),...s.resultRows.map(r=>String(r['レースコード']||'').slice(8,10)).filter(v=>/^\d{2}$/.test(v))])].sort();
    s.venue=possibleVenues.includes(s.venue)?s.venue:(possibleVenues[0]||'');
    s.raceId=s.races.find(r=>r.venue===s.venue)?.id||s.resultRows.find(r=>String(r['レースコード']||'').slice(8,10)===s.venue)?.['レースコード']||'';
    s.at=new Date().toLocaleTimeString('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit'});
  }catch(err){if(!ctrl.signal.aborted)s.error=err?.message||String(err);}finally{if(!ctrl.signal.aborted){s.loading=false;render();if(s.races.length){void restoreCachedHistory();if(s.detailTab==='course'||s.tab==='predict')void loadPublishedForCurrent();}}}
}
async function loadPublishedForCurrent(){
 const r=current();if(!r||s.loading||s.publishedBusy||s.publishedCourse?.raceId===r.id)return;
 const ticket=++publishedTicket;
 s.publishedBusy=true;s.publishedError='';
 try{
   const result=await loadPublishedCourseStats(r);
   if(ticket!==publishedTicket||current()?.id!==r.id)return;
   s.publishedCourse=result;
 }catch(err){
   if(ticket!==publishedTicket||current()?.id!==r.id)return;
   s.publishedCourse=null;s.publishedError=err.message||String(err);
 }finally{if(ticket===publishedTicket){s.publishedBusy=false;render();}}
}
function invalidateHistory(){
  publishedTicket++;s.publishedCourse=null;s.publishedBusy=false;s.publishedError='';
  historyTicket++;
  s.histController?.abort();
  s.histController=null;
  s.historyBusy=false;
  s.history=null;
}
const selectedHistoryDays=(date,days)=>Array.from({length:days},(_,i)=>shiftDate(date,-i-1));
function matchedHistory(recordsByDay,r,date,days) {
  const entries=selectedHistoryDays(date,days).map(day=>{
    const cached=recordsByDay.get(day);
    return cached?{records:cached.records,cacheHit:cached.cacheHit}:null;
  });
  return historyForRace(entries,{entries:r.entries,venue:r.venue,date,days,raceId:r.id});
}
async function restoreCachedHistory(){
  const r=current();
  if(!r||s.loading||s.historyBusy)return;
  const token=++historyTicket,date=s.date,days=s.historyDays;
  const daysList=selectedHistoryDays(date,days);
  const stored=await readHistoryDays(daysList);
  if(token!==historyTicket||s.date!==date||current()?.id!==r.id||s.historyDays!==days)return;
  const found=new Map([...stored].map(([day,value])=>[day,{...value,cacheHit:true}]));
  const view=matchedHistory(found,r,date,days);
  s.history=view.loaded?view:null;
  render();
}
async function getHistory(){
  const r=current();if(!r||s.historyBusy)return;
  invalidateHistory();
  const token=++historyTicket,date=s.date,days=s.historyDays;
  const ctrl=new AbortController();s.histController=ctrl;
  const daysList=selectedHistoryDays(date,days);
  const stored=await readHistoryDays(daysList);
  if(ctrl.signal.aborted||historyTicket!==token)return;
  const recordsByDay=new Map([...stored].map(([day,value])=>[day,{...value,cacheHit:true}]));
  const refreshDays=daysList.filter(day=>!historyCacheFresh(day,stored.get(day),new Date(),jstToday()));
  s.histError='';s.historyBusy=true;
  s.histDone=days-refreshDays.length;s.histProgress=s.histDone+' / '+days+' 日（保存済み '+stored.size+'日）';
  render();
  let cursor=0,done=s.histDone,persistFailed=0;
  const worker=async()=>{
    while(cursor<refreshDays.length&&!ctrl.signal.aborted&&historyTicket===token){
      const day=refreshDays[cursor++];
      try{
        const [cards,results]=await Promise.all([
          fetchCsv('programs/race_cards',day,ctrl.signal),
          fetchCsv('results/realtime',day,ctrl.signal)
        ]);
        if(ctrl.signal.aborted||historyTicket!==token)return;
        const records=compactHistoryDay(cards,results);
        if(!records)throw new Error('当日の確定結果が不足しています');
        recordsByDay.set(day,{records,cacheHit:false});
        if(!await saveHistoryDay(day,records))persistFailed++;
      }catch(err){if(ctrl.signal.aborted)return;/* 欠損日は未取得のまま。保存済みの内容は維持 */ }
      done++;s.histDone=done;s.histProgress=done+' / '+days+' 日を確認中（保存済み '+stored.size+'日）';
      const label=$('hist-progress-label');if(label)label.textContent=s.histProgress;
      const progress=$('hist-progress-bar');if(progress)progress.style.width=Math.round(done/days*100)+'%';
    }
  };
  await Promise.all([worker(),worker(),worker(),worker()]);
  if(historyTicket!==token)return;
  s.historyBusy=false;
  s.histController=null;
  if(!ctrl.signal.aborted){
    const view=matchedHistory(recordsByDay,r,date,days);
    s.history=view.loaded?view:null;
    if(!view.loaded)s.histError='データが1日も取得できませんでした。接続環境や公開CSVの保存期間を確認してください。';
    else if(persistFailed)s.histError='一部の履歴を端末へ保存できませんでした。ブラウザの保存容量やプライベートモードを確認してください。';
  }else s.histError='集計を中止しました。';
  render();
}
async function applyRaceFilter(mode){const rows=[...document.querySelectorAll('.concept-races .concept-race')];const buttons=[...document.querySelectorAll('[data-race-filter]')];if(!rows.length)return;const limit=mode==='attention'?3:mode==='recommended'?8:Infinity;for(const row of rows){const rank=Number(row.dataset.rank);row.hidden=rank>=limit;}if(mode!=='deadline'){rows.sort((a,b)=>Number(a.dataset.rank)-Number(b.dataset.rank)).forEach(row=>row.parentNode.appendChild(row));}else{rows.sort((a,b)=>Number(a.querySelector('.concept-time b')?.textContent.replace(':',''))-Number(b.querySelector('.concept-time b')?.textContent.replace(':',''))).forEach(row=>row.parentNode.appendChild(row));}for(const btn of buttons){const active=btn.dataset.raceFilter===mode;btn.classList.toggle('concept-filter-active',active);btn.setAttribute('aria-pressed',String(active));}}
async function handleClick(event){
 const raceFilter=event.target.closest('[data-race-filter]');if(raceFilter){applyRaceFilter(raceFilter.dataset.raceFilter);return;}
 if(event.target.closest('#custom-save')){try{saveModel($('custom-model-name')?.value,customWeights);render();}catch(e){alert(e.message);}return;}
 if(event.target.closest('#custom-reset')){customWeights={...DEFAULT_WEIGHTS};render();return;}
 if(event.target.closest('#custom-load')){const m=loadModels().find(x=>x.name===$('custom-saved')?.value);if(m){customWeights={...m.weights};render();}return;}
 if(event.target.closest('#custom-delete')){const n=$('custom-saved')?.value;if(n){deleteModel(n);render();}return;}
 if(event.target.closest('#custom-cancel')){customController?.abort();return;}
 if(event.target.closest('#custom-verify')){
  if(customController)return;
  const days=Number($('custom-days')?.value||7),count=Number($('custom-count')?.value||5),progress=$('custom-progress'),output=$('custom-result'),btn=$('custom-verify'),cancel=$('custom-cancel');
  customController=new AbortController();btn.disabled=true;cancel.disabled=false;
  try{
   const result=await verifyCustom({...customWeights},{days,count,signal:customController.signal,onProgress:p=>{if(progress)progress.textContent=p.done+'/'+p.days+'日、取得成功 '+p.loaded+'日、評価対象 '+p.eligible+'R';}});
   if(output)output.innerHTML='<div class="lab-grid"><div class="lab-card"><small>評価対象</small><strong>'+result.eligible+'R</strong><span>取得 '+result.loaded+'/'+days+'日</span></div><div class="lab-card"><small>参考的中率</small><strong>'+(result.hitRate==null?'未算出':(result.hitRate*100).toFixed(1)+'%')+'</strong><span>払戻欠損 '+result.missing+'R</span></div><div class="lab-card"><small>参考回収率</small><strong>'+(result.roi==null?'未算出':(result.roi*100).toFixed(1)+'%')+'</strong><span>払戻 '+result.payout.toLocaleString()+'円 ／ 賭金 '+result.stake.toLocaleString()+'円</span></div></div><p class="page-description">過去CSVの遡及検証。締切前に取得できた証拠がないため独立した予測実績ではありません。</p>';
  }catch(e){if(progress)progress.textContent=e.message;}finally{customController=null;btn.disabled=false;cancel.disabled=true;}return;
 }

  if(event.target.closest('#load-previous-day')){s.date=shiftDate(s.date,-1);loadDay();return;}
  if(event.target.closest('#retry-backtest')){loadBacktest(render,true);return;}
  const predictionType=event.target.closest('[data-forecast-variant]');if(predictionType){s.predictionVariant=predictionType.dataset.forecastVariant==='course'?'course':'base';render();return;}
  const comparison=event.target.closest('[data-technique-view]');if(comparison){s.techniqueView=['basic','moves','tactics'].includes(comparison.dataset.techniqueView)?comparison.dataset.techniqueView:'basic';render();return;}
  const racer=event.target.closest('[data-technique-racer]');if(racer){const lane=Number(racer.dataset.techniqueRacer);s.techniqueRacer=s.techniqueRacer===lane?0:lane;render();return;}
  const scope=event.target.closest('[data-technique-scope]');if(scope){s.techniqueScope=scope.dataset.techniqueScope==='venue'?'venue':'all';render();return;}
  const detail=event.target.closest('[data-detail-tab]');if(detail){s.detailTab=detail.dataset.detailTab;render();if(['course','motor'].includes(s.detailTab)&&!s.history&&!s.historyBusy)void restoreCachedHistory();if(s.detailTab==='course')void loadPublishedForCurrent();return;}
  const jump=event.target.closest('[data-jump-race]');if(jump){const r=s.races.find(x=>x.id===jump.dataset.jumpRace);if(r){invalidateHistory();s.predictionVariant='base';s.techniqueRacer=0;s.venue=r.venue;s.raceId=r.id;goto('races');document.querySelector('.deadline-event')?.scrollIntoView({behavior:'smooth',block:'start'});}return;}
  const saveNode=event.target.closest('[data-save-forecast]');if(saveNode){const r=s.races.find(x=>x.id===saveNode.dataset.saveForecast);if(r){const out=saveForecast(r,s.date);alert(out.message);render();}return;}
  const removeNode=event.target.closest('[data-remove-forecast]');if(removeNode){removeForecast(removeNode.dataset.removeForecast);render();return;}
  const node=event.target.closest('[data-recent-date],[data-history-date],[data-nav],[data-venue],[data-race],[data-mode],#refresh-btn,#date-prev,#date-next,#copy-bets,#copy-race,#retry-load,#load-history,#stop-history');
  if(!node)return;
  if(node.dataset.recentDate&&/^\d{4}-\d{2}-\d{2}$/.test(node.dataset.recentDate)&&node.dataset.recentDate<=jstToday()){s.date=node.dataset.recentDate;loadDay();return;}
  if(node.dataset.historyDate&&/^\d{4}-\d{2}-\d{2}$/.test(node.dataset.historyDate)&&node.dataset.historyDate<=jstToday()){s.date=node.dataset.historyDate;loadDay();return;}
  if(node.dataset.nav){if(node.dataset.selectVenue){invalidateHistory();s.predictionVariant='base';s.venue=node.dataset.selectVenue;s.raceId=s.races.find(r=>r.venue===s.venue)?.id||'';}goto(node.dataset.nav);return;}
  if(node.dataset.venue){invalidateHistory();s.predictionVariant='base';s.techniqueRacer=0;s.venue=node.dataset.venue;s.raceId=s.races.find(r=>r.venue===s.venue)?.id||s.resultRows.find(r=>String(r['レースコード']||'').slice(8,10)===s.venue)?.['レースコード']||'';render();void restoreCachedHistory();if(s.detailTab==='course'||s.tab==='predict')void loadPublishedForCurrent();return;}
  if(node.dataset.race){invalidateHistory();s.predictionVariant='base';s.techniqueRacer=0;s.raceId=node.dataset.race;render();void restoreCachedHistory();if(s.detailTab==='course'||s.tab==='predict')void loadPublishedForCurrent();return;}
  if(node.dataset.mode){s.mode=node.dataset.mode;render();return;}
  if(node.id==='live-refresh'){refreshExhibition();return;}
  if(node.id==='refresh-btn'||node.id==='retry-load'){loadDay();return;}
  if(node.id==='date-prev'){s.date=shiftDate(s.date,-1);loadDay();return;}
  if(node.id==='date-next'&&s.date<jstToday()){s.date=shiftDate(s.date,1);loadDay();return;}
  if(node.id==='load-history'){getHistory();return;}
  if(node.id==='stop-history'){s.histController?.abort();return;}
  if(node.id==='copy-race'){
    const r=current();if(r)navigator.clipboard?.writeText(`${s.date} ${r.venueName} ${r.number}R\n${r.entries.map(e=>`${e.lane} ${e.name} ${e.className} / 全国勝率${fmt(e.win,2)} / モーター${pct(e.m2)}`).join('\n')}`);
    node.textContent='コピーしました';return;
  }
  if(node.id==='copy-bets'){
    const r=current();if(!r)return;
    const selection=getForecastSelection(r,currentLocal());const bets=selection.chosen;
    const content=`${s.date} ${r.venueName} ${r.number}R\n${bets.picks.map(x=>x.combo+' / '+yen(x.stake)).join('\n')}\n合計 ${yen(bets.total)}\n※${selection.selected==='course'?'3年データ統合（試験）':'従来予想'}・未校正・利益保証なし`;
    navigator.clipboard?.writeText(content);node.textContent='コピーしました';return;
  }
}
function handleChange(event){
  const weight=event.target.closest('[data-custom-weight]');if(weight){customWeights[weight.dataset.customWeight]=Number(weight.value);render();return;}
  const t=event.target;
  if(t.id==='backtest-count'){setBacktestCount(t.value);render();return;}
  if(t.id==='date-input'&&/^\d{4}-\d{2}-\d{2}$/.test(t.value)&&t.value<=jstToday()){s.date=t.value;loadDay();}
  if(t.id==='history-days'){invalidateHistory();s.historyDays=Number(t.value);render();void restoreCachedHistory();}
  if(t.id==='bet-count'){s.count=Number(t.value);render();}
}
$('date-input').value=s.date;
$('date-input').max=jstToday();
document.addEventListener('click',handleClick);
document.addEventListener('change',handleChange);
const hash=location.hash.slice(1);
if(hash==='menu'||MENU.some(([id])=>id===hash))s.tab=hash;
render();loadDay();if(s.tab==='backtest')loadBacktest(render);if(s.tab==='results')loadDailyTrends();

setInterval(refreshDeadlineCards,15000);
setInterval(refreshExhibition,LIVE_INTERVAL_MS);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshExhibition();});
