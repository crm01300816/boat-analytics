import { fetchCsv, shiftDate, jstToday, venueName } from './csv.js';
import { createRaceList, aggregateLocal, rateRacers, rate, makePicks } from './analytics.js';
import { backtestPage, loadBacktest, setBacktestCount } from './backtest-view.js';
import { resultsPage } from './race-results.js';
import {dashboardPage,snapshotOdds,saveForecast,removeForecast} from './smart-navi.js';
import {DEFAULT_WEIGHTS,modelPage,loadModels,saveModel,deleteModel,verifyCustom} from './custom-model.js?v=20261030-custom3';

const MENU=[['dashboard','◉','今日のナビ'],['races','▦','レース分析'],['results','≋','結果・水面'],['local','◎','当地・枠別'],['predict','✧','3連単1,000円'],['custom','⚙','マイモデル'],['backtest','◷','過去検証'],['sources','▤','データ・算出法']];
const s={date:jstToday(),tab:'dashboard',venue:'',raceId:'',races:[],loading:true,error:'',availability:{},at:'',history:null,historyBusy:false,histProgress:'',histError:'',historyDays:60,mode:'balance',count:7,controller:null,resultRows:[],payoutRows:[],daily:null,prospective:null,dailyLoading:false,dailyLoaded:false,dailyError:''};
let customWeights={...DEFAULT_WEIGHTS},customController=null;
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=1)=>v===null||v===undefined||!Number.isFinite(Number(v))?'—':Number(v).toFixed(d);
const pct=v=>v===null||v===undefined||!Number.isFinite(Number(v))?'—':fmt(v)+'%';
const yen=v=>v==null?'—':new Intl.NumberFormat('ja-JP').format(v)+'円';
const current=()=>s.races.find(r=>r.id===s.raceId)||s.races.find(r=>r.venue===s.venue)||null;
const currentLocal=()=>{const r=current();return r&&s.history?.venue===r.venue&&s.history?.date===s.date?aggregateLocal(s.history.records,r.entries,r.venue):null;};
function goto(tab){s.tab=tab;location.hash=tab;render();if(tab==='backtest')loadBacktest(render);if(tab==='results')loadDailyTrends();window.scrollTo(0,0);}
function nav(){return MENU.map(([id,icon,name])=>`<button class="nav-link ${id===s.tab?'active':''}" data-nav="${id}"><span class="nav-icon">${icon}</span>${name}</button>`).join('');}
function selectiveLink(){return '<a href="./selective-five.html" style="display:block;text-align:center;padding:10px 8px;background:#19455a;color:#a6ffec;font-weight:800;text-decoration:none;border-top:1px solid #37687b">★ 厳選5点予想を見る ↗</a>';}
function headline(title,subtitle){return `<div class="page-top"><div><div class="page-eyebrow"><span class="dot"></span> BOAT RACE DATA STUDIO</div><h1 class="page-title">${title}</h1><p class="page-description">${subtitle}</p></div><div class="date-status">${s.date===jstToday()?'TODAY':'ARCHIVE'} · ${s.date}</div></div>`;}
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
function racerTable(r){const local=currentLocal();return `<div class="panel"><div class="panel-header"><div><h3>6艇の選手・モーターを比較</h3><p>横にスクロールするとすべての数値を表示</p></div><button class="button outline" data-nav="predict">買い目を見る →</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>枠・選手</th><th>全国勝率</th><th>全国2連率</th><th>全国3連率</th><th>当地勝率</th><th>当地2連率</th><th>当地3連率</th><th>平均ST</th><th>枠番別勝率</th><th>モーター2連率</th><th>モーター3連率</th><th>ボート2連率</th><th>当地同枠2連率</th><th>独自スコア</th></tr></thead><tbody>${rateRacers(r,local).map(e=>`<tr><td><div class="racer-cell"><span class="lane lane-${e.lane}">${e.lane}</span><span><b>${esc(e.name)}</b><small>${esc(e.className)} / ${esc(e.branch)} / ${esc(e.id)}</small></span></div></td><td class="strong">${fmt(e.win,2)}</td><td>${pct(e.n2)}</td><td>${pct(e.n3)}</td><td>${fmt(e.localWin,2)}</td><td>${pct(e.l2)}</td><td>${pct(e.l3)}</td><td>${fmt(e.st,2)}</td><td>${fmt(e.frameWin,2)}</td><td>${esc(e.motor)}号機 / ${pct(e.m2)}</td><td>${pct(e.m3)}</td><td>${pct(e.b2)}</td><td class="accent">${e.localFrame.starts?pct(rate(e.localFrame.first+e.localFrame.second,e.localFrame.starts)):'未集計'}<small style="display:block">${e.localFrame.starts}走</small></td><td class="score">${fmt(e.score,0)}</td></tr>`).join('')}</tbody></table></div><div class="footnote">掲載値は公開CSV由来。当地同枠2連率のみ「当地・枠別」画面の履歴集計結果です。独自スコアは的中確率ではありません。</div></div>`;}
function performance(r){const scored=rateRacers(r,currentLocal()).sort((a,b)=>(b.score??0)-(a.score??0));const tkz=r.previews?.tkz,stt=r.previews?.stt,sui=r.previews?.sui;return `<div class="two-col"><div class="panel"><div class="panel-header"><h3>実力比較スコア</h3><span class="small-pill">参考値</span></div><div class="panel-body mini-list">${scored.map(e=>`<div class="mini-row"><span class="lane lane-${e.lane}" style="width:22px;height:24px;font-size:11px">${e.lane}</span><label>${esc(e.name)}</label><div class="track"><span class="fill" style="width:${Math.max(0,e.score||0)}%"></span></div><b>${fmt(e.score,0)}</b></div>`).join('')}</div></div><div class="panel"><div class="panel-header"><h3>同枠での直近10走</h3></div><div class="panel-body mini-list">${r.entries.map(e=>`<div class="mini-row"><span class="lane lane-${e.lane}" style="width:22px;height:24px;font-size:11px">${e.lane}</span><label>${esc(e.name)}</label><div class="form-row">${e.recent.length?e.recent.map(v=>`<span class="form-dot ${v==='1'?'good':''}">${esc(v)}</span>`).join(''):'<span class="time">未取得</span>'}</div></div>`).join('')}</div></div></div><div class="two-col"><div class="panel"><div class="panel-header"><h3>展示・進入情報</h3><span class="small-pill">直前更新分</span></div><div class="table-wrap"><table class="data-table" style="min-width:500px"><thead><tr><th>枠</th><th>選手</th><th>展示タイム</th><th>スタート展示</th><th>進入</th></tr></thead><tbody>${r.entries.map(e=>`<tr><td><span class="lane lane-${e.lane}" style="height:25px;width:25px">${e.lane}</span></td><td>${esc(e.name)}</td><td>${esc(tkz?.[`艇${e.lane}_展示タイム`]||'—')}</td><td>${esc(stt?.[`艇${e.lane}_スタート展示`]||'—')}</td><td>${esc(stt?.[`艇${e.lane}_コース`]||'—')}</td></tr>`).join('')}</tbody></table></div></div><div class="panel"><div class="panel-header"><h3>水面・気象</h3></div><div class="panel-body"><div class="stat-cards"><div class="stat-card"><small>風速</small><b>${esc(sui?.['風速(m)']||'—')}m</b></div><div class="stat-card"><small>波高</small><b>${esc(sui?.['波の高さ(cm)']||'—')}cm</b></div><div class="stat-card"><small>天候</small><b style="font-size:13px">${esc(sui?.['天候']||'未取得')}</b></div></div><p class="time">気象は表示のみです。風や波と勝率の統計的関係を確認していないため、独自スコアへの重み付けは行いません。</p></div></div></div>`;}
function overview(){const r=current();return headline('レース分析','レーサー・モーター・枠番・展示を6艇で比較。')+metrics()+selectors()+(r?intro(r)+racerTable(r)+performance(r):'');}
function historyControls(){return `<div class="panel"><div class="panel-header"><div><h3>当地・枠番別の実績を集計</h3><p>同じ場・同じ枠の過去出走を数えます。実進入コースの逃げ率・逃がし率とは別集計です。</p></div></div><div class="panel-body"><div class="tools"><label>対象期間 <select class="select" id="history-days"><option value="30" ${s.historyDays===30?'selected':''}>30日</option><option value="60" ${s.historyDays===60?'selected':''}>60日</option><option value="90" ${s.historyDays===90?'selected':''}>90日</option><option value="180" ${s.historyDays===180?'selected':''}>180日</option></select></label><button class="button" id="load-history" ${s.historyBusy?'disabled':''}>${s.historyBusy?'集計中…':'過去成績から集計する'}</button>${s.historyBusy?'<button class="button ghost" id="stop-history">中止</button>':''}</div>${s.historyBusy?`<div class="progress"><span id="hist-progress-bar" style="width:${Math.round((s.histDone||0)/s.historyDays*100)}%"></span></div><p class="time" id="hist-progress-label">${esc(s.histProgress)}</p>`:''}${s.histError?`<div class="notification error">${esc(s.histError)}</div>`:''}${s.history?.venue===s.venue&&s.history?.date===s.date?`<div class="notification success">取得できた日：${s.history.loaded}/${s.history.days} 日 / 有効な当地レース ${s.history.records.length}件。期間：${shiftDate(s.date,-s.history.days)}〜${shiftDate(s.date,-1)}。未取得日を補完した数値ではありません。</div>`:'<div class="notification">集計前は当地×枠番別の値を「未集計」と表示します。公開データの存在する日のみ対象で、集計には通信量がかかります。</div>'}</div></div>`;}
function localPage(){const r=current(), local=currentLocal();return headline('当地 × 枠番別成績','今回の競艇場・今回の枠番に限定した過去の実績を確認。')+selectors()+(r?intro(r)+historyControls()+`<div class="panel"><div class="panel-header"><div><h3>当地の同枠成績</h3><p>過去${s.historyDays}日間 / 同じ会場 / 同じ枠番での実走結果</p></div></div><div class="table-wrap"><table class="data-table hist-table"><thead><tr><th>枠・選手</th><th>出走数</th><th>1着回数</th><th>1着率</th><th>2連対率</th><th>3連対率</th><th>逃げ率（実1コース）</th><th>逃がし率（実2コース）</th></tr></thead><tbody>${r.entries.map(e=>{const st=local?.[e.id],f=st?.frames[e.lane-1],x=st?.escape;return `<tr><td><div class="racer-cell"><span class="lane lane-${e.lane}">${e.lane}</span><b>${esc(e.name)}</b></div></td><td>${f?.starts??'—'}</td><td>${f?.starts?f.first:'—'}</td><td class="accent">${f?.starts?pct(rate(f.first,f.starts)):'—'}</td><td>${f?.starts?pct(rate(f.first+f.second,f.starts)):'—'}</td><td>${f?.starts?pct(rate(f.first+f.second+f.third,f.starts)):'—'}</td><td>${x?.course1Starts?pct(rate(x.escape,x.course1Starts)):'—'} <small>${x?.course1Starts?`(${x.course1Starts}走)`:''}</small></td><td>${x?.course2Starts?pct(rate(x.allowEscape,x.course2Starts)):'—'} <small>${x?.course2Starts?`(${x.course2Starts}走)`:''}</small></td></tr>`}).join('')}</tbody></table></div><div class="footnote">逃げ率＝その選手が実際に1コースから進入した時に「逃げ」で1着になった割合。逃がし率＝2コースから進入した時に1コース艇の「逃げ」が成立した割合。場・期間で絞った参考値です。サンプル数が小さい場合は不安定です。</div></div>`:'');}
function picksPage(){const r=current(), local=currentLocal();const prediction=r?makePicks(r,local,{mode:s.mode,count:s.count}):null;return headline('3連単 1,000円予想','120通りを統計モデルで比較し、100円単位で予算内に配分。')+selectors()+(r?intro(r)+`<div class="panel"><div class="panel-header"><div><h3>買い目の組み立て</h3><p>本命・バランス・穴寄りから選択。公開オッズがある場合は参考EVを利用。</p></div><span class="small-pill">予算固定 ¥1,000</span></div><div class="panel-body"><div class="tools"><div class="mode-tabs"><button class="mode-tab ${s.mode==='safe'?'active':''}" data-mode="safe">本命重視</button><button class="mode-tab ${s.mode==='balance'?'active':''}" data-mode="balance">バランス</button><button class="mode-tab ${s.mode==='aggressive'?'active':''}" data-mode="aggressive">穴寄り</button></div><label>点数 <select class="select" id="bet-count">${[3,5,7,10].map(n=>`<option value="${n}" ${s.count===n?'selected':''}>${n}点</option>`).join('')}</select></label></div></div></div>${prediction?.reason?`<div class="notification warning">${esc(prediction.reason)} 実在のデータが揃うまで架空の買い目は表示しません。</div>`:''}${prediction?.picks?.length?`<div class="pick-layout"><div class="panel"><div class="panel-header"><h3>推奨買い目 ${prediction.picks.length}点</h3><span class="small-pill">${prediction.oddsAvailable?'集計中オッズ反映':'オッズ未取得・確率順'}</span></div><div class="panel-body"><div class="bet-headline"><div><small class="time">合計購入金額</small><div class="bet-total">${yen(prediction.total)}</div></div><button class="button outline" id="copy-bets">買い目をコピー</button></div>${prediction.picks.map((p,i)=>`<div class="bet-card"><div><div class="bet-combo"><span class="small-pill">${String(i+1).padStart(2,'0')}</span><b class="combo">${esc(p.combo)}</b></div><small>モデル推定: ${pct(p.p*100)} ／ ${p.odds?`参考オッズ ${fmt(p.odds,1)}倍`:'オッズ未配信'}</small>${p.odds?`<small>参考払戻：${yen(p.estimatedPayout)}（この買い目が的中した場合）</small>`:''}</div><div class="bet-stake">${yen(p.stake)}</div></div>`).join('')}</div></div><div class="panel"><div class="panel-header"><h3>分析内容・注意点</h3></div><div class="panel-body summary-list"><div class="summary-row"><span>評価した組み合わせ</span><strong>120通り</strong></div><div class="summary-row"><span>採用点数</span><strong>${prediction.picks.length}点</strong></div><div class="summary-row"><span>合計予算</span><strong>${yen(prediction.total)}</strong></div><div class="summary-row"><span>選定した出目のモデル確率合計</span><strong>${pct(prediction.mass*100)}</strong></div><div class="summary-row"><span>モデルの種類</span><strong>未校正 / 統計ヒューリスティック</strong></div><div class="summary-row"><span>当地同枠データ</span><strong>${local?'集計済み':'未集計'}</strong></div><div class="summary-row"><span>オッズ</span><strong>${prediction.oddsAvailable?'締切前の参考値':'未取得'}</strong></div><div class="notification warning">推定確率は過去データで校正・検証した的中率ではありません。オッズも締切前の集計中値です。期待値プラスの証明はありません。</div><button class="button outline" data-nav="local">当地×枠番別を集計 →</button></div></div></div>`:''}<div class="panel"><div class="panel-header"><h3>スコアに使ったデータ</h3></div><div class="panel-body"><div class="source-tags">${(prediction?.racers?.[0]?.features||[]).map(f=>`<span class="source-tag ok">${esc(f.name)}</span>`).join('')}</div><p class="time">実際に存在した特徴量のみ加重平均。気象は学習済みの補正がないため表示のみで評価点には含めません。</p></div></div>`:'');}
function sourcesPage(){return headline('データ・算出法','取得元と計算式、データ不足時の処理を明確にしています。')+`<div class="two-col"><div class="panel"><div class="panel-header"><h3>使用データ</h3></div><div class="panel-body method-list">${[['出走表','全国・当地勝率、2/3連対率、モーター、ボート、平均ST、F本数'],['枠番別過去10走','枠別勝率、平均ST、直近10走'],['結果アーカイブ','当地×枠番別1〜3着率、実コースの逃げ率・逃がし率'],['直前情報','展示タイム・展示ST・進入・風・波・天候'],['オッズ','3連単120通りの締切前集計中オッズ']].map(([k,v])=>`<div class="method-item"><b>${k}</b><p>${v}</p></div>`).join('')}</div></div><div class="panel"><div class="panel-header"><h3>3連単予想の仕組み</h3></div><div class="panel-body method-list"><div class="method-item"><b>1. 6艇の参考スコア</b><p>勝率、全国・当地2/3連率、モーター、枠別、直近着順、ST、展示、取得済みの当地同枠実績を重み付き合成。欠損した項目は除外します。</p></div><div class="method-item"><b>2. 120通りの相対確率</b><p>6艇のスコアとコース優位の仮定からPlackett–Luceモデルで順位確率を作成。外部の検証済み予測モデルではありません。</p></div><div class="method-item"><b>3. 参考オッズの考慮</b><p>オッズがある場合は確率×オッズを参考に順位を調整。締切後の払戻や将来の収益は保証しません。</p></div><div class="method-item"><b>4. 合計1,000円で配分</b><p>3/5/7/10点を選べ、最低100円ずつ、合計1,000円になるよう配分。全組を購入するわけではありません。</p></div></div></div></div><div class="panel"><div class="panel-header"><h3>公開データとプライバシー</h3></div><div class="panel-body"><p class="page-description">BoatraceCSV (MIT) が公開するCSVを各端末のブラウザから取得する非公式アプリです。AppDeployのAPI・AI・DBは使っていません。ブラウザの通信量は発生します。上流の配信遅延・停止時は取得失敗と表示します。</p><div class="source-tags">${Object.entries(s.availability).map(([name,ok])=>`<span class="source-tag ${ok?'ok':''}">${esc(name)} ${ok?'✓':'未取得'}</span>`).join('')}</div><p class="page-description" style="margin-top:20px"><a href="https://boatracecsv.github.io/docs/" target="_blank" rel="noopener noreferrer" style="color:#56dbcd">公開CSV仕様 ↗</a>　<a href="https://www.boatrace.jp/owpc/pc/extra/data/download.html" target="_blank" rel="noopener noreferrer" style="color:#56dbcd">BOAT RACE公式ダウンロード ↗</a></p><p class="time">舟券の購入機能はありません。購入する場合は必ず公式出走表・締切時刻・欠場や返還情報を確認してください。</p></div></div>`;}
function render() {
  $('side-nav').innerHTML=nav();
  $('mobile-nav').innerHTML=nav();
  let link=$('selective-mobile-link');
  if(!link){link=document.createElement('div');link.id='selective-mobile-link';link.style.cssText='position:fixed;bottom:80px;right:12px;z-index:1000;border-radius:12px;overflow:hidden;box-shadow:0 5px 22px #0009';document.body.append(link);}
  link.innerHTML=selectiveLink();
  let quick=$('custom-mobile-link');
  if(!quick){quick=document.createElement('a');quick.id='custom-mobile-link';quick.href='#custom';quick.textContent='⚙ マイモデル';quick.setAttribute('aria-label','マイ予想モデルを開く');document.body.append(quick);}
  quick.style.display=s.tab==='custom'?'none':'';
  $('breadcrumb').textContent=MENU.find(([k])=>k===s.tab)?.[2]||'レース分析';
  $('date-input').value=s.date;
  $('date-input').max=jstToday();
  $('date-next').disabled=s.date>=jstToday();
  const root=$('app-content');
  if(s.tab==='backtest'){root.innerHTML=`<div class="content">${backtestPage()}</div>`;return;}
  if(s.loading){root.innerHTML=`<div class="content">${headline('データを取得中','公開CSVを照合しています。')}<div class="panel empty"><h2>レース情報を読み込み中…</h2><p>外部データ取得後に結果を表示します。</p></div></div>`;return;}
  if(s.error&&s.tab!=='sources'&&s.tab!=='results'){
    root.innerHTML=`<div class="content">${headline('取得できませんでした','実データがなければ予想を出しません。')}<div class="panel empty"><h2>公開CSVの読み込みに失敗しました</h2><p>${esc(s.error)}</p><button class="button" id="retry-load">再取得する</button><p>CSV未公開 / CORS制限 / 接続エラーが考えられます。日付の変更も試してください。</p></div></div>`;
    return;
  }
  let page='';
  if(s.tab==='dashboard')page=headline('今日のレースナビ','全国の締切順・注目候補・展示・オッズ変動・予想収支を確認。')+dashboardPage({date:s.date,races:s.races,results:s.resultRows,payouts:s.payoutRows});
  else if(s.tab==='races')page=overview();
  else if(s.tab==='results')page=headline('レース結果・水面','3連単払戻・着順・決まり手・波の高さ・風速を当日と過去日で確認。')+resultsPage({date:s.date,races:s.races,results:s.resultRows,payouts:s.payoutRows,venue:s.venue,raceId:s.raceId,daily:s.daily,dailyError:s.dailyError,prospective:s.prospective});
  else if(s.tab==='local')page=localPage();
  else if(s.tab==='predict')page=picksPage();
  else if(s.tab==='custom')page=modelPage(customWeights,s.races,s.raceId);
  else page=sourcesPage();
  root.innerHTML=`<div class="content">${page}<div class="footer"><span>BOAT ANALYTICS FREE / 独立した静的Webアプリ</span><span>更新確認 ${esc(s.at||'未取得')} JST · <a target="_blank" rel="noopener noreferrer" href="https://boatracecsv.github.io/docs/">データ提供元 ↗</a></span></div></div>`;
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
  s.loading=true;s.error='';s.races=[];s.resultRows=[];s.payoutRows=[];s.availability={};s.history=null;s.histError='';render();
  const paths={title:'programs/title',cards:'programs/race_cards',waku:'programs/waku10',tkz:'previews/tkz',stt:'previews/stt',sui:'previews/sui',od3:'previews/od3',results:'results/realtime',payouts:'results/payouts'};
  try{
    const jobs=Object.entries(paths).map(async([key,path])=>{
      try{const rows=await fetchCsv(path,s.date,ctrl.signal);s.availability[key]=true;return [key,rows];}
      catch(err){if(ctrl.signal.aborted)throw err;s.availability[key]=false;if(key==='cards'&&s.tab!=='results')throw err;return [key,[]];}
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
  }catch(err){if(!ctrl.signal.aborted)s.error=err?.message||String(err);}finally{if(!ctrl.signal.aborted){s.loading=false;render();}}
}
async function getHistory(){
  const r=current();if(!r||s.historyBusy)return;
  const venue=r.venue, date=s.date, days=s.historyDays;
  s.history=null;s.histError='';s.historyBusy=true;s.histDone=0;s.histProgress='0 / '+days+' 日';render();
  const ctrl=new AbortController();s.histController=ctrl;
  const daysList=Array.from({length:days},(_,i)=>shiftDate(date,-i-1));
  const records=[];let loaded=0,processed=0,cursor=0;
  // Historical collection is bounded, explicit, and cancelable. It never returns synthetic statistics.
  async function worker(){
    while(cursor<daysList.length&&!ctrl.signal.aborted){
      const day=daysList[cursor++];
      try{
        const [cards,results]=await Promise.all([fetchCsv('programs/race_cards',day,ctrl.signal),fetchCsv('results/realtime',day,ctrl.signal)]);
        const cardMap=new Map(cards.filter(row=>String(row['レース場コード']||row['レースコード']?.slice(8,10)).padStart(2,'0')===venue).map(row=>[row['レースコード'],row]));
        for(const result of results){const card=cardMap.get(result['レースコード']);if(card)records.push({card,result});}
        loaded++;
      }catch(err){if(ctrl.signal.aborted)return;}
      processed++;s.histDone=processed;s.histProgress=`${processed} / ${days} 日を確認中（取得成功 ${loaded} 日）`;
      const label=$('hist-progress-label');if(label)label.textContent=s.histProgress;
      const progress=$('hist-progress-bar');if(progress)progress.style.width=Math.round(processed/days*100)+'%';
    }
  }
  await Promise.all([worker(),worker(),worker(),worker()]);
  s.historyBusy=false;
  if(!ctrl.signal.aborted){
    if(!loaded)s.histError='データが1日も取得できませんでした。接続環境や公開CSVの保存期間を確認してください。';
    else s.history={venue,date,days,loaded,records};
  }else s.histError='集計を中止しました。';
  render();
}
async function handleClick(event){
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

  if(event.target.closest('#retry-backtest')){loadBacktest(render,true);return;}
  const jump=event.target.closest('[data-jump-race]');if(jump){const r=s.races.find(x=>x.id===jump.dataset.jumpRace);if(r){s.venue=r.venue;s.raceId=r.id;goto('races');document.querySelector('.deadline-event')?.scrollIntoView({behavior:'smooth',block:'start'});}return;}
  const saveNode=event.target.closest('[data-save-forecast]');if(saveNode){const r=s.races.find(x=>x.id===saveNode.dataset.saveForecast);if(r){const out=saveForecast(r,s.date);alert(out.message);render();}return;}
  const removeNode=event.target.closest('[data-remove-forecast]');if(removeNode){removeForecast(removeNode.dataset.removeForecast);render();return;}
  const node=event.target.closest('[data-history-date],[data-nav],[data-venue],[data-race],[data-mode],#refresh-btn,#date-prev,#date-next,#copy-bets,#copy-race,#retry-load,#load-history,#stop-history');
  if(!node)return;
  if(node.dataset.historyDate&&/^\d{4}-\d{2}-\d{2}$/.test(node.dataset.historyDate)&&node.dataset.historyDate<=jstToday()){s.date=node.dataset.historyDate;loadDay();return;}
  if(node.dataset.nav){goto(node.dataset.nav);return;}
  if(node.dataset.venue){s.venue=node.dataset.venue;s.raceId=s.races.find(r=>r.venue===s.venue)?.id||s.resultRows.find(r=>String(r['レースコード']||'').slice(8,10)===s.venue)?.['レースコード']||'';render();return;}
  if(node.dataset.race){s.raceId=node.dataset.race;render();return;}
  if(node.dataset.mode){s.mode=node.dataset.mode;render();return;}
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
    const bets=makePicks(r,currentLocal(),{mode:s.mode,count:s.count});
    const content=`${s.date} ${r.venueName} ${r.number}R\n${bets.picks.map(x=>x.combo+' / '+yen(x.stake)).join('\n')}\n合計 ${yen(bets.total)}\n※未校正モデル・利益保証なし`;
    navigator.clipboard?.writeText(content);node.textContent='コピーしました';return;
  }
}
function handleChange(event){
  const weight=event.target.closest('[data-custom-weight]');if(weight){customWeights[weight.dataset.customWeight]=Number(weight.value);render();return;}
  const t=event.target;
  if(t.id==='backtest-count'){setBacktestCount(t.value);render();return;}
  if(t.id==='date-input'&&/^\d{4}-\d{2}-\d{2}$/.test(t.value)&&t.value<=jstToday()){s.date=t.value;loadDay();}
  if(t.id==='history-days'){s.historyDays=Number(t.value);s.history=null;render();}
  if(t.id==='bet-count'){s.count=Number(t.value);render();}
}
$('date-input').value=s.date;
$('date-input').max=jstToday();
document.addEventListener('click',handleClick);
document.addEventListener('change',handleChange);
const hash=location.hash.slice(1);
if(MENU.some(([id])=>id===hash))s.tab=hash;
render();loadDay();if(s.tab==='backtest')loadBacktest(render);if(s.tab==='results')loadDailyTrends();

setInterval(refreshDeadlineCards,15000);
