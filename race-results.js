import {venueName, numeric} from './csv.js';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const has=x=>x!==undefined&&x!==null&&String(x).trim()!=='';
const val=(x,unit='')=>has(x)?esc(x)+unit:'—';
const yen=x=>{const n=numeric(x);return n===null?'—':new Intl.NumberFormat('ja-JP').format(n)+'円';};
const formatPct=x=>x==null?'—':Number(x).toFixed(1)+'%';

export function resultsPage({date,races=[],results=[],payouts=[],venue='',raceId='',daily=null,dailyError=''}) {
  const rmap=new Map(results.filter(x=>/^\d{12}$/.test(x['レースコード']||'')).map(x=>[x['レースコード'],x]));
  const pmap=new Map(payouts.filter(x=>/^\d{12}$/.test(x['レースコード']||'')).map(x=>[x['レースコード'],x]));
  const all=new Map(races.map(x=>[x.id,{id:x.id,venue:x.venue,number:x.number,race:x}]));
  for(const row of results) {
    const id=row['レースコード'];
    if(!/^\d{12}$/.test(id||'')||!id.startsWith(date.replaceAll('-','')))continue;
    if(!all.has(id))all.set(id,{id,venue:id.slice(8,10),number:Number(id.slice(10,12)),race:null});
  }
  const options=[...all.values()].sort((a,b)=>a.venue.localeCompare(b.venue)||a.number-b.number);
  const venues=[...new Set(options.map(x=>x.venue))];
  const v=venues.includes(venue)?venue:venues[0];
  const selection=options.filter(x=>x.venue===v);
  const picked=selection.find(x=>x.id===raceId)||selection[0]||null;
  const actual=picked?rmap.get(picked.id):null;
  const payout=picked?pmap.get(picked.id):null;
  const preview=picked?.race?.previews?.sui;
  const todayRows=results.filter(x=>/^\d{12}$/.test(x['レースコード']||'')&&x['レースコード'].startsWith(date.replaceAll('-','')));
  const waves=todayRows.map(r=>numeric(r['波の高さ(cm)'])).filter(x=>x!==null&&x>=0);
  const winds=todayRows.map(r=>numeric(r['風速(m)'])).filter(x=>x!==null&&x>=0);
  const mean=arr=>arr.length?(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1):'—';
  let html=`<div class="result-metrics">
  <div><small>結果公開済み</small><b>${todayRows.length}<span>R</span></b></div>
  <div><small>平均波高（確定結果）</small><b>${mean(waves)}<span>cm</span></b></div>
  <div><small>最大波高（確定結果）</small><b>${waves.length?Math.max(...waves):'—'}<span>cm</span></b></div>
  <div><small>平均風速（確定結果）</small><b>${mean(winds)}<span>m/s</span></b></div></div>`;
  if(venues.length)html+=`<div class="section-head"><h2>競艇場を選択</h2><span class="time">${venues.length}場</span></div>
    <div class="venue-list">${venues.map(code=>`<button data-venue="${esc(code)}" class="venue ${code===v?'active':''}">${esc(venueName(code))}<small>${options.filter(x=>x.venue===code&&rmap.has(x.id)).length}R確定</small></button>`).join('')}</div>`;
  if(selection.length)html+=`<div class="section-head"><h2>${esc(venueName(v))}のレース結果</h2><span class="time">${selection.filter(x=>rmap.has(x.id)).length}/${selection.length}R確定</span></div>
    <div class="race-pills">${selection.map(x=>`<button data-race="${esc(x.id)}" class="race-pill ${picked?.id===x.id?'active':''}"><small>${rmap.has(x.id)?'結果確定':'結果待ち'}</small><b>${x.number}<span>R</span></b></button>`).join('')}</div>`;
  if(picked) {
    const positions=[1,2,3,4,5,6].map(i=>({
      rank:i,lane:actual?.[i+'着_艇番'],
      name:actual?.[i+'着_選手名']||picked.race?.entries?.find(x=>x.lane===Number(actual?.[i+'着_艇番']))?.name,
      time:actual?.[i+'着_レースタイム']
    }));
    const validTrifecta=positions.slice(0,3).every(x=>Number(x.lane)>=1&&Number(x.lane)<=6);
    const combo=validTrifecta?positions.slice(0,3).map(x=>x.lane).join('-'):'—';
    html+=`<div class="panel"><div class="panel-header"><div><h3>${esc(venueName(picked.venue))} ${picked.number}R　${actual?'レース結果':'結果待ち'}</h3><p>${esc(date)} / ${actual?'着順と払戻を表示':'結果CSVがまだ公開されていません'}</p></div><span class="small-pill">${actual?'結果公開済み':'未公開'}</span></div>`;
    if(actual)html+=`<div class="panel-body"><div class="result-winning">
      <div><small>3連単の組番</small><strong>${val(payout?.['3連単_組番']||combo)}</strong></div>
      <div><small>3連単払戻（100円あたり）</small><strong>${yen(payout?.['3連単_払戻金'])}</strong></div>
      <div><small>決まり手</small><strong>${val(actual['決まり手'])}</strong></div></div>
      <div class="result-finish">${positions.slice(0,3).map(x=>`<div><span>${x.rank}着</span><span class="lane lane-${Number(x.lane)>=1&&Number(x.lane)<=6?x.lane:1}">${val(x.lane)}</span><b>${val(x.name)}</b><small>${val(x.time)}</small></div>`).join('')}</div>
      ${!payout?'<p class="time">確定払戻金のCSVはまだ配信されていません。</p>':''}</div>`;
    else html+='<div class="panel-body"><p class="page-description">結果はレース終了後、数分〜数十分の遅延があります。「更新」で再取得してください。</p></div>';
    html+='</div>';
    const weather=actual||preview||{};
    const label=actual?'結果時点の水面・気象':preview?'直前の水面・気象':'水面・気象データ未取得';
    html+=`<div class="panel"><div class="panel-header"><div><h3>🌊 ${label}</h3><p>${actual?'レース結果に記録された観測値':preview?'締切前の公表観測値':'未取得の項目は推測しません'}</p></div></div>
      <div class="panel-body"><div class="result-weather">
      <div><small>波の高さ</small><strong>${val(weather['波の高さ(cm)'],' cm')}</strong></div>
      <div><small>風速</small><strong>${val(weather['風速(m)'],' m/s')}</strong></div>
      <div><small>風向</small><strong>${val(weather['風向'])}</strong></div>
      <div><small>天候</small><strong>${val(weather['天候'])}</strong></div>
      <div><small>気温</small><strong>${val(weather['気温(℃)'],' ℃')}</strong></div>
      <div><small>水温</small><strong>${val(weather['水温(℃)'],' ℃')}</strong></div></div>
      <p class="time">風・波の観測値は予想の必勝条件を示すものではありません。結果取得日時：${val(actual?.['取得日時'])}</p></div></div>`;
  }else html+='<div class="panel empty"><h2>対象日のレースがまだありません</h2><p>日付を変更して再取得してください。</p></div>';
  const days=Array.isArray(daily?.days)?daily.days.filter(x=>x.date<=date).slice(-21).reverse():[];
  html+=`<div class="panel"><div class="panel-header"><div><h3>過去の日別結果・水面データ</h3><p>日付を押すとその日のレース結果を確認できます。</p></div><span class="small-pill">${daily?.days?.length||0}日分蓄積</span></div>`;
  if(days.length)html+=`<div class="table-wrap"><table class="data-table result-history-table"><thead><tr><th>開催日</th><th>記録R数</th><th>平均波高</th><th>最大波高</th><th>平均風速</th><th>1号艇1着率</th></tr></thead><tbody>${days.map(x=>`<tr><td><button class="result-day-button" data-history-date="${esc(x.date)}">${esc(x.date)}</button></td><td>${x.results}R</td><td>${x.averageWaveCm==null?'—':x.averageWaveCm+'cm'}</td><td>${x.maxWaveCm==null?'—':x.maxWaveCm+'cm'}</td><td>${x.averageWindMps==null?'—':x.averageWindMps+'m/s'}</td><td>${formatPct(x.winnerOneRate)}</td></tr>`).join('')}</tbody></table></div>`;
  else html+=`<div class="panel-body"><p class="page-description">${dailyError?esc(dailyError):'毎日自動取得する集計履歴はまだ未登録です。最新結果は上の一覧で確認できます。'}</p></div>`;
  return html+'<div class="footnote">日別データは終了後の集計です。予想精度・回収率の検証とは別に扱い、未公開・中止のレースを補完しません。</div></div>';
}
