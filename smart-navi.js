import {numeric,venueName,jstToday} from './csv.js';
import {makePicks,rateRacers} from './analytics.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('ja-JP').format(n||0)+'円';
const KEY='boat-analytics-ledger-v1', ODDS_KEY='boat-analytics-odds-history-v1';
const read=(key)=>{try{const a=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(a)?a:[]}catch{return []}};
const save=(key,rows)=>{try{localStorage.setItem(key,JSON.stringify(rows.slice(-2000)));return true}catch{return false}};
export function deadlineInfo(r,date,now=new Date()){
 const m=String(r.deadline||'').match(/(?:^|\D)([01]?\d|2[0-3]):([0-5]\d)(?:\D|$)/);
 if(!m)return {time:'—',minutes:null,status:'不明',kind:'unknown'};
 const minutes=Number(m[1])*60+Number(m[2]),time=m[1].padStart(2,'0')+':'+m[2];
 const today=jstToday();if(date!==today)return {time,minutes:null,status:date<today?'締切済':'開催予定',kind:date<today?'closed':'future'};
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(now).split(':').map(Number);
 const left=minutes-parts[0]*60-parts[1]-parts[2]/60;
 return {time,minutes:left,status:left<=0?'締切済':left<=5?'締切まで'+Math.ceil(left)+'分':left<=10?'まもなく':'受付中',kind:left<=0?'closed':left<=5?'urgent':left<=10?'soon':'open'};
}
export function candidateRows(races,date,results=[],limit=30){
 const done=new Set(results.map(x=>x['レースコード']));
 return races.filter(r=>!done.has(r.id)).map(r=>({...r,cutoff:deadlineInfo(r,date)}))
 .filter(r=>r.cutoff.minutes===null||r.cutoff.minutes>0)
 .sort((a,b)=>((a.cutoff.minutes??(a.cutoff.time==='—'?99999:Number(a.cutoff.time.slice(0,2))*60+Number(a.cutoff.time.slice(3))))-(b.cutoff.minutes??(b.cutoff.time==='—'?99999:Number(b.cutoff.time.slice(0,2))*60+Number(b.cutoff.time.slice(3)))))).slice(0,limit);
}
export function evaluateRace(r){
 const pred=makePicks(r,null,{mode:'balance',count:5});
 const picks=pred?.picks||[];
 const odds=picks.filter(x=>Number.isFinite(x.odds)&&x.odds>0);
 const ev=odds.length===picks.length&&picks.length?odds.reduce((sum,x)=>sum+(x.p||0)*x.odds*x.stake,0)-pred.total:null;
 const scored=rateRacers(r,null);
 const spread=scored.length?Math.max(...scored.map(x=>x.score||0))-Math.min(...scored.map(x=>x.score||0)):0;
 return {r,pred,ev,spread,oddsCount:odds.length,score:picks.length?(pred.mass||0)*100:0};
}
export function snapshotOdds(races,date){
 if(date!==jstToday())return;
 const old=read(ODDS_KEY), seen=new Set(old.map(x=>x.date+'|'+x.race+'|'+x.combo+'|'+x.odds));
 const stamp=new Date().toISOString();
 for(const r of races){
   const p=makePicks(r,null,{mode:'balance',count:5});
   for(const x of p?.picks||[]){
     if(!(x.odds>0))continue;
     const k=date+'|'+r.id+'|'+x.combo+'|'+x.odds;
     if(seen.has(k))continue;seen.add(k);
     old.push({date,race:r.id,combo:x.combo,odds:x.odds,at:stamp});
   }
 }
 save(ODDS_KEY,old);
}
export function oddsChanges(r){
 const records=read(ODDS_KEY).filter(x=>x.race===r.id);
 const byCombo=new Map();
 for(const x of records){const a=byCombo.get(x.combo)||[];a.push(x);byCombo.set(x.combo,a)}
 return [...byCombo].map(([combo,rows])=>{rows.sort((a,b)=>a.at.localeCompare(b.at));return {combo,first:rows[0].odds,last:rows[rows.length-1].odds,count:rows.length}})
 .filter(x=>x.count>1&&x.first!==x.last).sort((a,b)=>Math.abs(b.last-b.first)-Math.abs(a.last-a.first));
}
export function settleLedger(results,payouts){
 const map=new Map(results.map(x=>[x['レースコード'],x]));
 const pay=new Map(payouts.map(x=>[x['レースコード'],x]));
 const rows=read(KEY);let changed=false;
 for(const item of rows){
   if(item.status==='settled')continue;
   const result=map.get(item.race);if(!result)continue;
   const actual=[1,2,3].map(n=>Number(result[n+'着_艇番']));
   if(actual.some(n=>!Number.isInteger(n)||n<1||n>6))continue;
   const winning=actual.join('-');
   const payout=numeric(pay.get(item.race)?.['3連単_払戻金']);
   if(payout===null)continue;
   item.returnAmount=item.picks.reduce((sum,p)=>sum+(p.combo===winning?Math.round(p.stake/100*payout):0),0);
   item.winning=winning;item.status='settled';changed=true;
 }
 if(changed)save(KEY,rows);
 return rows;
}
export function saveForecast(r,date){
 const prediction=makePicks(r,null,{mode:'balance',count:5});
 if(!prediction?.picks?.length)return {ok:false,message:'買い目を生成できません'};
 const rows=read(KEY);
 if(rows.some(x=>x.race===r.id))return {ok:false,message:'このレースは保存済みです'};
 rows.push({date,race:r.id,venue:r.venue,number:r.number,created:new Date().toISOString(),status:'pending',stake:prediction.total,picks:prediction.picks.map(x=>({combo:x.combo,stake:x.stake,odds:x.odds||null})),returnAmount:0});
 return {ok:save(KEY,rows),message:'予想を保存しました（実際の購入ではありません）'};
}
export function removeForecast(id){save(KEY,read(KEY).filter(x=>x.race!==id))}
export function dashboardPage({date,races,results,payouts}){
 const historical=date<jstToday();
 const upcoming=historical?races.map(r=>({...r,cutoff:deadlineInfo(r,date)})).sort((a,b)=>a.cutoff.time.localeCompare(b.cutoff.time)).slice(0,24):candidateRows(races,date,results,24),evaluated=upcoming.map(evaluateRace);
 const ranked=[...evaluated].sort((a,b)=>b.score-a.score).slice(0,8);
 const ledger=settleLedger(results,payouts),settled=ledger.filter(x=>x.status==='settled');
 const stake=settled.reduce((n,x)=>n+x.stake,0),returns=settled.reduce((n,x)=>n+x.returnAmount,0);
 const allStake=ledger.reduce((n,x)=>n+x.stake,0),allReturns=ledger.reduce((n,x)=>n+x.returnAmount,0);
 const deadlineCards=upcoming.slice(0,12).map(r=>`<button class="nav-race deadline-${r.cutoff.kind}" data-jump-race="${esc(r.id)}"><span><b>${esc(venueName(r.venue))} ${r.number}R</b><small>${esc(r.name)}</small></span><span><strong>${r.cutoff.time}</strong><small>${r.cutoff.status}</small></span></button>`).join('');
 const ranking=ranked.map((x,i)=>`<div class="nav-ranking"><div class="nav-rank">${i+1}</div><div><b>${esc(venueName(x.r.venue))} ${x.r.number}R</b><small>選定5点の推定確率合計 ${x.score.toFixed(1)}% ／ ${x.r.cutoff.time}締切</small><small>${x.ev===null?'期待値：オッズ不足・未判定':'参考期待損益：'+money(Math.round(x.ev))+'（未校正）'}</small></div><button class="button outline" data-jump-race="${esc(x.r.id)}">分析</button><button class="button" data-save-forecast="${esc(x.r.id)}">予想保存</button></div>`).join('');
 const exhibition=races.find(r=>r.id===upcoming[0]?.id)||races[0];
 const tkz=exhibition?.previews?.tkz,stt=exhibition?.previews?.stt;
 const exhibit=exhibition?`<div class="nav-exhibit-head"><b>${esc(venueName(exhibition.venue))} ${exhibition.number}R</b><button class="button outline" data-jump-race="${esc(exhibition.id)}">詳しく分析</button></div><div class="nav-exhibit-grid">${exhibition.entries.map(e=>`<div><span class="lane lane-${e.lane}">${e.lane}</span><b>${esc(e.name)}</b><small>展示 ${esc(tkz?.['艇'+e.lane+'_展示タイム']||'—')}</small><small>ST ${esc(stt?.['艇'+e.lane+'_スタート展示']||'—')} ／ 進入 ${esc(stt?.['艇'+e.lane+'_コース']||'—')}</small></div>`).join('')}</div>`:'<p>開催レースなし</p>';
 const changes=upcoming.flatMap(r=>oddsChanges(r).slice(0,2).map(x=>({r,...x}))).slice(0,10);
 const alerts=changes.map(x=>`<div class="nav-alert"><b>${esc(venueName(x.r.venue))} ${x.r.number}R　${esc(x.combo)}</b><span>${x.first.toFixed(1)}倍 → ${x.last.toFixed(1)}倍</span><button class="button outline" data-jump-race="${esc(x.r.id)}">確認</button></div>`).join('');
 const history=ledger.slice().reverse().slice(0,30).map(x=>`<div class="nav-ledger-item"><div><b>${esc(x.date)} ${esc(venueName(x.venue))} ${x.number}R</b><small>${x.status==='settled'?'確定':'未精算'} ／ 予想記録（購入実績ではありません）</small></div><div><b>${money(x.returnAmount)} / ${money(x.stake)}</b><button class="nav-remove" data-remove-forecast="${esc(x.race)}">削除</button></div></div>`).join('');
 return `<div class="nav-dashboard">
 <div class="nav-hero"><span>BOAT RACE SMART NAVI</span><h2>${historical?'過去のレースナビ':'今日のレースナビ'}</h2><p>${esc(date)} ／ ${historical?'当日の出走表・開催レースを振り返る（参考表示）':'全国の締切・注目レース・展示・予想記録'}</p></div>
 <div class="nav-section"><h3>${historical?'当日の開催レース':'締切が近いレース'} <small>予定時刻順・日本時間</small></h3><div class="nav-deadline-grid">${deadlineCards||'<p class="trend-muted">締切前のレースがありません。過去日または終了後の可能性があります。</p>'}</div></div>
 <div class="nav-section"><h3>${historical?'過去日の参考スコア':'今日の狙い目候補'} <small>未校正モデル・参考順位</small></h3><p class="trend-muted">${historical?'過去日の取得可能な出走表を使った遡及的な参考順位。締切前に利用できた情報とは限らず、実際の事前予想実績ではありません。':'締切前の5点予想について推定確率合計で順位付け。'}回収率100%超を保証する順位ではありません。実際の購入は行いません。</p>${ranking||'<p>候補なし</p>'}</div>
 <div class="nav-section"><h3>展示データ <small>公開CSVの直前情報</small></h3>${exhibit}<p class="trend-muted">展示データは未配信の場合「—」。表示中の展示値は学習済みの補正をしていません。</p></div>
 <div class="nav-section"><h3>オッズ変動アラート <small>この端末で取得した履歴</small></h3>${alerts||'<p class="trend-muted">変動記録はまだありません。アプリを再読み込みした際に取得したオッズの差分を記録します。バックグラウンド監視・通知は未対応です。</p>'}<p class="trend-muted">期待値は未校正の推定確率に基づく参考値で、利益保証ではありません。</p></div>
 <div class="nav-section"><h3>自動照合・予想収支 <small>端末内の保存予想のみ</small></h3><div class="nav-ledger-stats"><div><small>確定予想</small><b>${settled.length}件</b></div><div><small>確定分の仮想収支</small><b>${money(returns-stake)}</b></div><div><small>確定分の回収率</small><b>${stake?(returns/stake*100).toFixed(1)+'%':'—'}</b></div><div><small>保存済み合計</small><b>${ledger.length}件</b></div></div><p class="trend-muted">保存時点の予想を後日の結果・払戻CSVと照合。購入実績ではありません。確定済みは${money(stake)}相当、保存済み全件は${money(allStake)}相当。保存情報はこのブラウザのみ。</p>${history||'<p>まだ保存された予想がありません。</p>'}</div>
 </div>`;
}
