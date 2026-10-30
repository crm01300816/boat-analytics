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
 const venues=[...new Set(races.map(r=>r.venue))].sort((a,b)=>Number(a)-Number(b));
 const photos=['photo-1500530855697-b586d89ba3ee','photo-1518837695005-2083093ee35b','photo-1507525428034-b723cf961d3e','photo-1470770841072-f978cf4d019e','photo-1433086966358-54859d0ed716'];
 const venueCards=venues.map((v,i)=>'<button class="concept-venue" data-nav="races" data-select-venue="'+esc(v)+'" style="--venue-photo:url(https://images.unsplash.com/'+photos[i%photos.length]+'?w=300&q=70)"><span class="concept-venue-label">'+esc(venueName(v))+'</span><span class="concept-venue-count">'+races.filter(r=>r.venue===v).length+'R</span></button>').join('');
 const raceRows=upcoming.slice(0,24).map(r=>{const pick=evaluateRace(r).pred?.picks?.[0]?.combo||'';const lanes=pick.split('-').filter(n=>/^[1-6]$/.test(n)).map(n=>'<span class="premium-lane lane-'+n+'">'+n+'</span>').join('');const urgent=r.cutoff.kind==='urgent'?'urgent':r.cutoff.kind==='soon'?'soon':'';return '<button class="concept-race" data-jump-race="'+esc(r.id)+'"><span class="concept-time"><b>'+esc(r.cutoff.time)+'</b><small class="'+urgent+'">'+esc(r.cutoff.status)+'</small></span><span class="concept-race-name"><b>'+esc(venueName(r.venue))+' '+r.number+'R</b><small>'+esc(r.name||'開催レース')+'</small></span><span class="concept-pick"><small>参考買い目</small><span>'+lanes+'</span></span><span class="concept-value"><small>期待値</small><b>未検証</b></span><span class="concept-arrow">›</span></button';}).join('');
 const featured=ranked[0];const featuredPicks=featured?.pred?.picks?.slice(0,3)||[];
 return `<div class="premium-home">
 <div class="concept-home-title"><b>本日の開催場</b><small>全国一覧 ›</small></div><div class="premium-summary"><div><small>開催場</small><strong>${venues.length}<em>場</em></strong></div><div><small>収録レース</small><strong>${races.length}<em>R</em></strong></div><div><small>${historical?'当日の開催':'締切前'}</small><strong>${historical?races.length:upcoming.length}<em>R</em></strong></div></div>
 <section class="premium-section"><div class="premium-section-head"><div><span class="premium-section-kicker">VENUES</span><h2>開催場から探す</h2></div><span class="premium-count">${venues.length}場</span></div><div class="concept-venues">${venueCards}</div><p class="concept-photo-note">※写真は会場の実写ではなくイメージ画像です。</p></section>
 <section class="premium-section"><div class="premium-section-head"><div><span class="premium-section-kicker">RACE SCHEDULE</span><h2>${historical?'当日のレース一覧':'締切順レース一覧'}</h2></div><span class="premium-count">予定時刻順</span></div><div class="concept-filter"><span class="concept-filter-active">締切順</span><span>おすすめ</span><span>注目レース</span></div><div class="concept-races">${raceRows||'<p class="premium-empty">現在表示できるレースはありません。日付を変更して確認してください。</p>'}</div><button class="premium-more" data-nav="races">すべてのレースを見る　›</button></section>
 <section class="premium-section"><div class="premium-section-head"><div><span class="premium-section-kicker">AI RACE INSIGHT</span><h2>${historical?'過去日の参考予想':'AI注目レース'}</h2></div><span class="premium-tag">参考モデル</span></div>${featured?`<div class="premium-feature"><div class="premium-feature-top"><div><small>注目レース</small><h3>${esc(venueName(featured.r.venue))} ${featured.r.number}R</h3><p>締切予定 ${esc(featured.r.cutoff.time)}</p></div><span class="premium-feature-mark">AI</span></div><div class="premium-feature-picks">${featuredPicks.map(p=>'<span>'+p.combo.split('-').map(n=>'<i class="premium-lane lane-'+n+'">'+n+'</i>').join('<em>−</em>')+'</span>').join('')}</div><p class="premium-disclaimer">未校正モデルの参考買い目。的中・収益を保証するものではありません。${historical?'過去日の遡及計算であり、締切前予想の実績ではありません。':''}</p><button class="premium-primary" data-jump-race="${esc(featured.r.id)}">このレースを分析する　›</button></div>`:'<p class="premium-empty">注目候補を算出できませんでした。</p>'}</section>
 <details class="premium-details"><summary>詳細データ・展示・予想収支を確認する</summary><div class="nav-section"><h3>展示データ</h3>${exhibit}</div><div class="nav-section"><h3>オッズ変動アラート</h3>${alerts||'<p>この端末の変動記録はありません。</p>'}</div><div class="nav-section"><h3>予想保存履歴・仮想収支</h3><div class="nav-ledger-stats"><div><small>確定予想</small><b>${settled.length}件</b></div><div><small>仮想収支</small><b>${money(returns-stake)}</b></div><div><small>参考回収率</small><b>${stake?(returns/stake*100).toFixed(1)+'%':'—'}</b></div></div>${history||'<p>保存予想なし</p>'}</div></details>
 </div>`;
}
