import {venueName, numeric} from './csv.js';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const has=x=>x!==undefined&&x!==null&&String(x).trim()!=='';
const val=(x,unit='')=>has(x)?esc(x)+unit:'—';
const yen=x=>{const n=numeric(x);return n===null?'—':new Intl.NumberFormat('ja-JP').format(n)+'円';};
const formatPct=x=>x==null?'—':Number(x).toFixed(1)+'%';

export function resultsPage({date,races=[],results=[],payouts=[],venue='',raceId='',daily=null,dailyError='',prospective=null}) {
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
  // Same-day venue trends use only published finishes, never forecasts.
  const venueRows=todayRows.filter(r=>String(r['レースコード']).slice(8,10)===v);
  const rankCounts=Array.from({length:3},()=>Array(6).fill(0));
  const methodCounts={};const trifectas={};const payValues=[];
  let validFinish=0,insideTop3=0,top3Complete=0,oneTwo=0,oneTwoValid=0;
  const localWaves=[],localWinds=[];
  for(const r of venueRows){
    const finish=[1,2,3].map(n=>Number(r[n+'着_艇番']));
    for(let rank=0;rank<3;rank++)if(Number.isInteger(finish[rank])&&finish[rank]>=1&&finish[rank]<=6)rankCounts[rank][finish[rank]-1]++;
    if(Number.isInteger(finish[0])&&finish[0]>=1&&finish[0]<=6)validFinish++;
    if(finish.slice(0,2).every(n=>Number.isInteger(n)&&n>=1&&n<=6)){oneTwoValid++;if(finish[0]===1&&finish[1]===2)oneTwo++;}
    if(finish.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set(finish).size===3){
      top3Complete++;if(finish.every(n=>n<=3))insideTop3++;
      const combo=finish.join('-');trifectas[combo]=(trifectas[combo]||0)+1;
    }
    const method=String(r['決まり手']||'').trim();if(method)methodCounts[method]=(methodCounts[method]||0)+1;
    const p=numeric(pmap.get(r['レースコード'])?.['3連単_払戻金']);if(p!==null&&p>0)payValues.push(p);
    const wave=numeric(r['波の高さ(cm)']),wind=numeric(r['風速(m)']);
    if(wave!==null&&wave>=0)localWaves.push(wave);
    if(wind!==null&&wind>=0)localWinds.push(wind);
  }
  const methodsSorted=Object.entries(methodCounts).sort((a,b)=>b[1]-a[1]);
  const common=Object.entries(trifectas).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const topPayout=payValues.length?Math.max(...payValues):null;
  const laneColors=['#f4f7fb','#25364d','#f45e69','#5aa5fa','#f3cb56','#69d49b'];
  const laneNames=['白','黒','赤','青','黄','緑'];
  const laneGrid=[1,2,3,4,5,6].map((lane,i)=>{
    const first=rankCounts[0][i],second=rankCounts[1][i],third=rankCounts[2][i];
    const firstPct=validFinish?first/validFinish*100:0;
    return `<div class="trend-lane-card">
      <div class="trend-lane-head"><span class="trend-lane-badge lane-${lane}">${lane}</span><strong>${lane}号艇</strong><span class="trend-lane-name">${laneNames[i]}</span></div>
      <div class="trend-lane-primary"><strong>${validFinish?formatPct(firstPct):'—'}</strong><span>1着率</span></div>
      <div class="trend-lane-track"><span style="width:${firstPct.toFixed(1)}%;background:${laneColors[i]}"></span></div>
      <div class="trend-lane-places"><span>1着 <b>${first}</b></span><span>2着 <b>${second}</b></span><span>3着 <b>${third}</b></span></div>
    </div>`;
  }).join('');
  const methodGrid=methodsSorted.length?methodsSorted.map(([name,count],i)=>`<div class="trend-method-row"><div class="trend-method-label"><span>${esc(name)}</span><b>${count}R <small>${formatPct(count/venueRows.length*100)}</small></b></div><div class="trend-method-track"><span style="width:${(count/venueRows.length*100).toFixed(1)}%;background:${i===0?'#3edbc3':i===1?'#72aaff':'#a4b8ce'}"></span></div></div>`).join(''):'<p class="trend-muted">結果待ち</p>';
  html+=`<section class="panel trend-panel" id="today-trends"><div class="panel-header trend-heading"><div><span class="trend-eyebrow">TODAY’S VENUE REPORT</span><h3>${esc(venueName(v)||'選択した競艇場')}｜今日の傾向</h3><p>${esc(date)} ・ ${venueRows.length}レース確定</p></div><span class="trend-live">当日速報</span></div>
    <div class="trend-body">
      <div class="trend-kpis">
        <div class="trend-kpi trend-kpi-primary"><small>1号艇 1着率</small><strong>${validFinish?formatPct(rankCounts[0][0]/validFinish*100):'—'}</strong><span>${rankCounts[0][0]} / ${validFinish}R</span></div>
        <div class="trend-kpi"><small>1→2着率</small><strong>${oneTwoValid?formatPct(oneTwo/oneTwoValid*100):'—'}</strong><span>1-2の着順</span></div>
        <div class="trend-kpi"><small>1〜3号艇で3着内独占</small><strong>${top3Complete?formatPct(insideTop3/top3Complete*100):'—'}</strong><span>${insideTop3} / ${top3Complete}R</span></div>
        <div class="trend-kpi"><small>最高3連単払戻</small><strong>${topPayout===null?'—':yen(topPayout)}</strong><span>本日の確定分</span></div>
      </div>
      <h4 class="trend-subtitle">枠番別の着順 <span>1着率と1〜3着回数</span></h4>
      <div class="trend-lanes">${laneGrid}</div>
      <h4 class="trend-subtitle">決まり手 <span>レース数・構成比</span></h4>
      <div class="trend-methods">${methodGrid}</div>
      <h4 class="trend-subtitle">配当・水面 <span>確定結果の平均</span></h4>
      <div class="trend-extra"><div><small>平均3連単払戻</small><b>${payValues.length?yen(Math.round(payValues.reduce((a,b)=>a+b,0)/payValues.length)):'—'}</b></div><div><small>平均波高</small><b>${mean(localWaves)}cm</b></div><div><small>平均風速</small><b>${mean(localWinds)}m/s</b></div></div>
      <p class="trend-frequent">よく出た3連単：${common.length?common.map(([combo,count])=>esc(combo)+'（'+count+'回）').join('、'):'—'}</p>
      <p class="trend-muted">当日の確定結果のみ集計。レース数が少ない場合は割合が大きく変動します。将来の的中・利益を保証するものではありません。</p>
    </div></section>`;
  if(venues.length)html+=`<div class="section-head"><h2>競艇場を選択</h2><span class="time">${venues.length}場</span></div>
    <div class="venue-list">${venues.map(code=>`<button data-venue="${esc(code)}" class="venue ${code===v?'active':''}">${esc(venueName(code))}<small>${options.filter(x=>x.venue===code&&rmap.has(x.id)).length}R確定</small></button>`).join('')}</div>`;
  if(venues.length){
    const summary=venues.map(code=>{
      const rows=todayRows.filter(r=>String(r['レースコード']).slice(8,10)===code);
      const first=rows.filter(r=>Number(r['1着_艇番'])===1).length;
      const methods={};let totalPayout=0,payoutCount=0;
      for(const r of rows){
        const method=String(r['決まり手']||'').trim();if(method)methods[method]=(methods[method]||0)+1;
        const pay=numeric(pmap.get(r['レースコード'])?.['3連単_払戻金']);
        if(pay!==null&&pay>0){totalPayout+=pay;payoutCount++}
      }
      return {code,races:rows.length,first,methods,avg:payoutCount?Math.round(totalPayout/payoutCount):null};
    });
    html+=`<div class="panel"><div class="panel-header"><div><h3>競艇場別・当日の結果一覧</h3><p>開催場を選ぶと1〜12Rの着順・決まり手・払戻を確認できます。</p></div></div><div class="table-wrap"><table class="data-table result-history-table"><thead><tr><th>競艇場</th><th>結果</th><th>1号艇1着率</th><th>決まり手</th><th>平均3連単払戻</th></tr></thead><tbody>${summary.map(x=>`<tr><td><button class="result-day-button" data-venue="${esc(x.code)}">${esc(venueName(x.code))}</button></td><td>${x.races}R</td><td>${x.races?formatPct(x.first/x.races*100):'—'}</td><td>${Object.entries(x.methods).sort((a,b)=>b[1]-a[1]).map(([k,n])=>esc(k)+':'+n).join(' / ')||'—'}</td><td>${x.avg===null?'—':yen(x.avg)}</td></tr>`).join('')}</tbody></table></div></div>`;
  }
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
  const recentProspective=Array.isArray(prospective?.days)?prospective.days.slice(-14).reverse():[];
  html+='<div class="panel"><div class="panel-header"><div><h3>締切前予想の実績検証</h3><p>未来のレースを予想した時刻に買い目を固定し、後日の結果と照合。3連単・各1,000円想定。</p></div></div>';
  if(recentProspective.length){
    html+='<div class="table-wrap"><table class="data-table result-history-table"><thead><tr><th>日付</th><th>保存予想</th><th>通常精算</th><th>3点 回収率</th><th>5点 回収率</th><th>7点 回収率</th><th>10点 回収率</th></tr></thead><tbody>'+
      recentProspective.map(d=>'<tr><td>'+esc(d.date)+'</td><td>'+d.captured+'R</td><td>'+d.settled+'R</td>'+
      [3,5,7,10].map(k=>'<td>'+formatPct(d.byCount?.[k]?.provisionalRoi==null?null:d.byCount[k].provisionalRoi*100)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  }else html+='<div class="panel-body"><p class="page-description">締切前に保存した買い目の評価結果は、翌日以降に追加されます。</p></div>';
  const recent=Array.isArray(prospective?.days)?prospective.days.filter(d=>d.date<=date):[];
  const totals=Object.fromEntries([3,5,7,10].map(k=>[k,{settled:0,hits:0,stakeYen:0,payoutYen:0}]));
  const venueTotals=Object.fromEntries([3,5,7,10].map(k=>[k,{settled:0,hits:0,stakeYen:0,payoutYen:0}]));
  for(const d of recent)for(const k of [3,5,7,10]){
    const a=d.byCount?.[k],b=d.byVenue?.[v]?.[k];
    for(const [target,source] of [[totals[k],a],[venueTotals[k],b]])if(source){
      for(const field of ['settled','hits','stakeYen','payoutYen'])target[field]+=Number(source[field]||0);
    }
  }
  const rowFor=(label,group)=>`<tr><td>${label}</td>${[3,5,7,10].map(k=>{const x=group[k];return `<td>${x.settled}R / ${x.settled?formatPct(x.hits/x.settled*100):'—'} / ${x.stakeYen?formatPct(x.payoutYen/x.stakeYen*100):'—'}</td>`}).join('')}</tr>`;
  html+=`<div class="panel"><div class="panel-header"><div><h3>3・5・7・10点別の的中率・回収率</h3><p>締切前に保存された予想だけを集計。各レース1,000円想定。表示：精算R数 / 的中率 / 暫定回収率。</p></div></div><div class="table-wrap"><table class="data-table result-history-table"><thead><tr><th>対象</th><th>3点</th><th>5点</th><th>7点</th><th>10点</th></tr></thead><tbody>${rowFor('全競艇場',totals)}${rowFor(esc(venueName(v)),venueTotals)}</tbody></table></div><div class="panel-body"><p class="time">場別の数値は場別集計を保存し始めた日から対象。過去の場別記録がない場合は「—」です。未購入レースや過去検証の推計値は含みません。</p></div></div>`;
  html+='</div>';
  return html+'<div class="footnote">日別データは終了後の集計。予想精度と回収率は締切前に保存した買い目のみ評価し、返還・特殊決済の監査がない場合は暫定値として扱います。</div>';
}
