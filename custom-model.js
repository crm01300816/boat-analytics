import {rateRacers,trifectaProbabilities} from './analytics.js';
import {fetchCsv,shiftDate,jstToday} from './csv.js';
import {normalFinish,finalSettlement} from './backtest.js';
export const FACTORS=[['win','全国勝率'],['local','当地勝率'],['motor','モーター成績'],['lane','枠番・コース実績'],['exhibit','展示タイム'],['start','スタート力']];
export const DEFAULT_WEIGHTS={win:25,local:15,motor:20,lane:20,exhibit:10,start:10};
const GROUPS={win:['全国勝率','全国2連率','全国3連率'],local:['当地勝率','当地2連率','当地同枠2連率','当地実進入コース傾向'],motor:['モーター2連率','モーター3連率','ボート2連率'],lane:['枠番別勝率','同枠直近10走'],exhibit:['展示タイム'],start:['平均ST','枠番別ST','展示ST']};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key='boat-custom-models-v1';
export function validateWeights(weights){if(!weights||FACTORS.some(([k])=>!Number.isFinite(Number(weights[k]))||Number(weights[k])<0||Number(weights[k])>100)||FACTORS.reduce((s,[k])=>s+Number(weights[k]),0)<=0)throw Error('重要度は0〜100、合計は1以上にしてください');return Object.fromEntries(FACTORS.map(([k])=>[k,Number(weights[k])]));}
export function customScores(race,weights){
 const w=validateWeights(weights);
 return rateRacers(race).map(r=>{
  let sum=0,den=0;
  for(const [key] of FACTORS){
   const features=r.features.filter(f=>GROUPS[key].includes(f.name));
   if(!features.length||!w[key])continue;
   const score=features.reduce((s,f)=>s+f.value*f.weight,0)/features.reduce((s,f)=>s+f.weight,0);
   sum+=score*w[key];den+=w[key];
  }
  return {...r,score:den?Math.max(0,Math.min(100,sum/den-r.f*2.5)):null};
 });
}
export function customPicks(race,weights,count=5){
 const racers=customScores(race,weights),probs=trifectaProbabilities(racers);
 if(!probs)return {racers,picks:[],reason:'必要なデータが不足しています'};
 const picks=[...probs].sort((a,b)=>b.p-a.p).slice(0,count);
 return {racers,picks,reason:null};
}
export function loadModels(){try{const raw=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(raw)?raw.filter(x=>x&&typeof x.name==='string').slice(0,20):[]}catch{return []}}
export function saveModel(name,weights){const clean=validateWeights(weights),label=String(name||'マイモデル').trim().slice(0,30);const models=loadModels().filter(x=>x.name!==label);models.unshift({name:label,weights:clean});localStorage.setItem(key,JSON.stringify(models.slice(0,20)));return label;}
export function deleteModel(name){localStorage.setItem(key,JSON.stringify(loadModels().filter(x=>x.name!==name)));}
export function modelPage(weights,races,selectedId,report){
 const total=FACTORS.reduce((s,[k])=>s+Number(weights[k]||0),0),race=races.find(x=>x.id===selectedId)||races[0],p=race?customPicks(race,weights):null;
 return `<div class="page-top"><div><div class="page-eyebrow">CUSTOM MODEL LAB</div><h1 class="page-title">マイ予想モデル</h1><p class="page-description">6項目の重要度を調整して予想を比較。設定はこの端末に保存されます。</p></div></div>
 <section class="panel"><div class="panel-header"><div><h2>重要度を調整</h2><p>合計 ${total}%（予想時に利用可能な項目を正規化）</p></div></div><div class="panel-body">
 ${FACTORS.map(([k,label])=>`<label class="custom-factor"><span>${label}<b id="weight-label-${k}">${weights[k]}%</b></span><input type="range" min="0" max="100" step="5" value="${weights[k]}" data-custom-weight="${k}"></label>`).join('')}
 <div class="custom-actions"><input id="custom-model-name" class="select" maxlength="30" placeholder="モデル名（例：モーター重視）"><button class="button" id="custom-save">この設定を保存</button><button class="button outline" id="custom-reset">初期設定</button></div>
 <div class="custom-actions"><select id="custom-saved" class="select"><option value="">保存モデルを選択</option>${loadModels().map(x=>`<option value="${esc(x.name)}">${esc(x.name)}</option>`).join('')}</select><button class="button outline" id="custom-load">読み込む</button><button class="button outline" id="custom-delete">削除</button></div></div></section>
 <section class="panel"><div class="panel-header"><div><h2>現在の予想結果</h2><p>当日の出走表に基づく参考確率。展示未取得の場合は除外して計算します。</p></div></div><div class="panel-body">
 ${race?`<p>${esc(race.venueName)} ${race.number}R ／ ${esc(race.name)}</p>${p.picks.length?`<div class="custom-picks">${p.picks.map((x,i)=>`<div><b>${i+1}位　${x.combo}</b><span>推定 ${(x.p*100).toFixed(2)}%</span></div>`).join('')}</div>`:`<p>${esc(p.reason)}</p>`}`:'<p>開催データを読み込んでください。</p>'}
 <p class="page-description">※確率は未校正。過去結果や確定オッズを使って当日の予想を作成しません。</p></div></section>
 <section class="panel"><div class="panel-header"><div><h2>過去レースで検証</h2><p>過去の出走表・枠番データ・着順・確定払戻を照合します。</p></div></div><div class="panel-body">
 <div class="custom-actions"><label>期間 <select id="custom-days" class="select"><option value="7">直近7日</option><option value="14">直近14日</option><option value="30">直近30日</option></select></label><label>買い目数 <select id="custom-count" class="select"><option value="3">3点</option><option value="5" selected>5点</option><option value="7">7点</option><option value="10">10点</option></select></label><button class="button" id="custom-verify">検証を開始</button><button class="button outline" id="custom-cancel" disabled>中止</button></div>
 <div id="custom-progress" class="page-description">未実行</div><div id="custom-result"></div>
 <p class="page-description">注意：これは取得時点の過去CSVを使う「参考的な遡及検証」です。締切前に保存されたことを証明できないデータは含まれ得るため、独立した予測成績・利益の保証とは扱いません。展示データは過去の取得時刻を確認できないため検証には使用しません。</p></div></section>`;
}
export async function verifyCustom(weights,{days=7,count=5,signal,onProgress=()=>{}}={}){
 const w=validateWeights(weights);let scanned=0,eligible=0,hits=0,stake=0,payout=0,missing=0,loaded=0;const today=jstToday();
 for(let i=1;i<=days;i++){
  if(signal?.aborted)throw Error('検証を中止しました');
  const day=shiftDate(today,-i);
  try{
   const [cards,wakus,results,payouts]=await Promise.all(['programs/race_cards','programs/waku10','results/realtime','results/payouts'].map(path=>fetchCsv(path,day,signal)));
   loaded++;
   const waku=new Map(wakus.map(x=>[x['レースコード'],x])),out=new Map(results.map(x=>[x['レースコード'],x])),money=new Map(payouts.map(x=>[x['レースコード'],x]));
   for(const row of cards){
    scanned++;const id=row['レースコード'],result=out.get(id),winner=result?normalFinish(result):null;
    if(!winner)continue;
    const entries=(await import('./analytics.js')).raceEntries(row,waku.get(id)||{});
    const race={id,entries,previews:{}};
    const pred=customPicks(race,w,count);
    if(!pred.picks.length)continue;
    eligible++;
    const final=finalSettlement(money.get(id),winner);
    if(final===null){missing++;continue;}
    stake+=1000;
    const pick=pred.picks.find(x=>x.combo===winner);
    if(pick){hits++;payout+=Math.round(final*(1000/count)/100);}
   }
  }catch(e){if(signal?.aborted)throw e;}
  onProgress({done:i,days,loaded,scanned,eligible});
 }
 return {days,loaded,scanned,eligible,hits,missing,stake,payout,hitRate:eligible?hits/eligible:null,roi:eligible&&missing===0&&stake?payout/stake:null,provisionalRoi:stake?payout/stake:null};
}
