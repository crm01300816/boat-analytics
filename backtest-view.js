import {researchReport} from './model-lab.js';
let report=null, loading=false, error='', count=7;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=x=>Number.isFinite(x)?x.toLocaleString('ja-JP'):'—';
const pc=x=>Number.isFinite(x)?(x*100).toFixed(2)+'%':'未算出';
const score=x=>Number.isFinite(x)?x.toFixed(4):'未算出';
const selected=m=>m.byCount.find(x=>x.count===count);
const table=(headers,rows)=>`<div class="table-wrap"><table class="data-table" style="min-width:540px"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const panel=(title,body,subtitle='')=>`<section class="panel"><div class="panel-header"><div><h2>${esc(title)}</h2>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div></div>${body}</section>`;

export async function loadBacktest(onChange,force=false) {
  if(loading || (report && !force))return;
  loading=true;error='';onChange();
  try {
    const response=await fetch(new URL('./public/backtest.json',import.meta.url),{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const data=await response.json();
    if(data.schemaVersion!==1 || data.status!=='strict_git_evidence' || !data.partitions?.test || !Array.isArray(data.groups?.venues))throw new Error('検証結果の形式が不正です');
    report=data;
  }catch(e){report=null;error=e.message;}finally{loading=false;onChange();}
}
export function setBacktestCount(value){if([3,5,7,10].includes(Number(value)))count=Number(value);}

export function backtestPage() {
  const heading=`<div class="page-top"><div><div class="page-eyebrow">HISTORICAL VALIDATION</div><h1 class="page-title">過去データ検証</h1><p class="page-description">実レースのみ。締切前の保存を確認できる情報で検証。当日のデータ取得とは独立しています。</p></div></div>`;
  if(loading || (!report&&!error))return heading+panel('検証結果を読み込み中','<div class="panel-body">集計済みの検証結果を取得しています。</div>');
  if(error)return heading+panel('検証結果を取得できませんでした',`<div class="panel-body"><p>${esc(error)}</p><button class="button" id="retry-backtest">再取得</button></div>`);
  const r=report,c=r.coverage,t=r.partitions.test,b=selected(t.baseline),candidate=selected(t.candidate);
  const metrics=`<div class="metrics"><div class="metric"><span class="metric-label">厳格検証・全期間</span><b class="metric-number">${n(c.strictRaces)}<small>R</small></b></div><div class="metric"><span class="metric-label">最終テスト</span><b class="metric-number">${n(t.baseline.races)}<small>R</small></b></div><div class="metric"><span class="metric-label">現行 ${count}点 的中率</span><b class="metric-number" style="font-size:28px">${pc(b.hitRate)}</b></div><div class="metric"><span class="metric-label">現行 ${count}点 回収率</span><b class="metric-number" style="font-size:28px">${pc(b.returnRate)}</b></div></div>`;
  const points=panel('購入点数別・現行モデルと候補の比較',table(['点数','レース数','現行 的中率','現行 回収率','候補 的中率','候補 回収率','払戻欠損'],t.baseline.byCount.map((v,i)=>[n(v.count),n(v.races),pc(v.hitRate),pc(v.returnRate),pc(t.candidate.byCount[i].hitRate),pc(t.candidate.byCount[i].returnRate),n(v.missingPayouts)])),`最終テスト ${t.start}〜${t.end}。バランスモード、1レース1,000円。回収率＝確定払戻／賭け金。候補はライブ予想に未適用です。`);
  const comparison=panel('確率モデルの比較',table(['モデル','log loss ↓','Brier score ↓','賭け金','払戻','払戻確認レース'],[
    ['現行',score(t.baseline.logLoss),score(t.baseline.brier),n(b.stakeYen)+'円',n(b.payoutYen)+'円',n(b.settledRaces)],
    ['比較候補',score(t.candidate.logLoss),score(t.candidate.brier),n(candidate.stakeYen)+'円',n(candidate.payoutYen)+'円',n(candidate.settledRaces)]
  ]),'学習期間で枠番補正を推定し、検証期間で補正量を選択。最終テストは選択に使用しません。的中率の改善と収益性の改善は別です。');
  const calibration=panel('枠番ごとの1着確率のずれ',table(['枠番','実際の1着率','現行 平均予測','候補 平均予測'],(r.laneCalibration||[]).map(v=>[n(v.lane),pc(v.observed),pc(v.baseline),pc(v.candidate)])),'最終テストでの全レース平均。実進入コースの効果とは区別します。');
  const groupTable=(title,groups,subtitle)=>panel(title,table(['区分','レース数','現行 的中率','現行 回収率','候補 的中率','候補 回収率'],groups.map(g=>{const a=selected(g.baseline),v=selected(g.candidate);return [esc(g.name||g.label),n(a.races),pc(a.hitRate),pc(a.returnRate),pc(v.hitRate),pc(v.returnRate)];})),subtitle);
  const venues=[...r.groups.venues].sort((a,b)=>(selected(b.baseline).hitRate??-1)-(selected(a.baseline).hitRate??-1));
  const splits=panel('時系列分割',table(['区分','開始','終了条件','レース数'],[
    ['学習',esc(r.partitions.training.start),esc(r.partitions.training.endExclusive)+'未満',n(r.partitions.training.baseline.races)],
    ['検証',esc(r.partitions.validation.start),esc(r.partitions.validation.endExclusive)+'未満',n(r.partitions.validation.baseline.races)],
    ['最終テスト',esc(t.start),esc(t.end)+'まで',n(t.baseline.races)]
  ]),'分割日・候補の探索範囲を結果の集計前に固定。全期間をまとめた成績は学習を含むため、独立した精度実績として扱いません。');
  const names={'programs/race_cards':'出走表・選手／モーター成績','programs/waku10':'枠番別成績','results/realtime':'着順','results/payouts':'確定払戻'};
  const availability=panel('取得可能期間・件数・欠損',`<div class="panel-body"><p class="page-description">目標：${esc(c.requestedStart)}〜${esc(c.requestedEnd)}（${n(c.requestedDays)}日、全国24場）。提供元の公開範囲が不足し、3年分の検証には達していません。</p><p class="page-description">着順と出走表がそろう範囲：${esc(c.rawStart)}〜${esc(c.rawEnd)}。そのうち締切前の保存証拠と正常結果がある範囲：${esc(c.strictStart)}〜${esc(c.strictEnd)}、${n(c.strictDates)}日・${n(c.venues)}場。</p></div>`+table(['データ','公開開始','公開最終日','取得行数','対象内のファイル欠損日'],Object.entries(names).map(([key,name])=>[esc(name),esc(c.inventory[key]?.start),esc(c.inventory[key]?.end),n(c.fileRowCounts[key]),n(c.missingDays[key]?.length)]))+`<div class="panel-body"><p>枠番情報欠損：${n(c.missingWakuRaces)}R ／ 確定払戻欠損：${n(c.missingPayoutRaces)}R</p><p class="page-description">公開最終日には検証対象外の当日ファイルを含みます。ファイル欠損日は公開開始前も含みます。欠損した特徴量に後日の成績は補いません。</p><a class="button outline" href="./public/backtest.json" target="_blank" rel="noopener">日別欠損・集計JSONを開く</a></div>`);
  const reasons={'result_missing':'結果未収録','no_predeadline_card_evidence':'締切前の出走表保存証拠なし','deadline_unknown':'締切時刻不明','card_missing_at_deadline':'締切前版に当該レースなし','critical_features_missing':'必要成績の不足','abnormal_or_incomplete_finish':'F・異常／不完全な着順','invalid_race':'レース識別不正'};
  const exclusions=panel('除外したデータ',table(['理由','件数'],Object.entries(c.excluded).map(([key,value])=>[esc(reasons[key]||key),n(value)])),'後日追加された過去データを、当時入手できた情報として扱いません。F・返還・同着等の特殊結果は通常の不的中に混ぜず、対象外とします。');
  const notes=panel('現在のモデルの弱点・検証の限界',`<div class="panel-body">${r.weaknesses.map(x=>`<p class="page-description">${esc(x)}</p>`).join('')}<p class="page-description">過去の展示・オッズ・実進入、ブラウザで任意集計する当地履歴は使用していません。Git保存時刻は証拠になりますが、第三者による時刻認証ではありません。締切時刻は過去の結果CSVに収録された予定値を照合にだけ使用しています。</p><p class="page-description">現行モデルの過去の調整履歴は不明です。今回の候補については最終テストを選択に使用していませんが、将来の独立した検証も必要です。</p><p class="time">集計日時：${esc(r.generatedAt)} ／ 元データ：BoatraceCSV ／ <a href="https://github.com/BoatraceCSV/boatracecsv.github.io/tree/${esc(r.sourceRevision)}" target="_blank" rel="noopener">固定コミット</a></p></div>`);
  const lab=researchReport(r,count);
  const modelLab=panel('予想モデル研究所｜AIモデル対決・見送り判定・自動改善',`
    <div class="panel-body"><p class="page-description">学習 → 検証 → 未使用の最終テストを分離。ここに示すのは実際の厳格検証結果であり、架空の収益やモデル性能は掲載しません。</p>
    <div class="lab-grid">${lab.candidates.map((item,i)=>`<div class="lab-card"><small>${esc(item.name)}</small><strong>${pc(item.metric.returnRate)}</strong><span>独立テスト回収率 ／ ${n(item.metric.races)}レース</span><span>的中率 ${pc(item.metric.hitRate)}</span><span>確定払戻欠損 ${n(item.metric.missingPayouts)}件</span></div>`).join('')}</div>
    <h3>見送り判定（研究中）</h3><p class="page-description">${esc(lab.abstention)}</p>
    <h3>モデル自動改善の安全ルール</h3><p class="page-description">${esc(lab.improvement)}</p>
    <p class="page-description">研究用プログラムには予測確率に応じた見送り閾値・点数・モデルの総当たり比較を追加済み。学習・検証で候補を選び、最終テストは評価にだけ使う設計です。必要なレース単位データが揃うまでは、最適モデルを確定したと表示しません。</p></div>`,
    '3・5・7・10点の比較。検証済み集計JSONに基づく。');
  return heading+metrics+modelLab+`<div class="tools" style="margin-bottom:20px"><label>集計表の購入点数 <select id="backtest-count" class="select">${[3,5,7,10].map(v=>`<option value="${v}" ${v===count?'selected':''}>${v}点</option>`).join('')}</select></label><span class="time">以下の傾向表は最終テストのみ</span></div>`+points+comparison+calibration+
    groupTable('競艇場別ランキング',venues,`${count}点・最終テストの現行的中率順。標本数を併せて確認してください。0件の場は未算出です。`)+
    groupTable('1着艇の枠番別',r.groups.frames,`${count}点。実際の1着艇の枠で結果を層別した事後分析です。実進入コースとは区別します。`)+
    groupTable('確定人気別',r.groups.popularity,`${count}点。的中組番の確定人気による事後集計であり、締切前人気の再現ではありません。予想には使いません。`)+
    groupTable('月別',r.groups.months,`${count}点。最終テストの開催月別です。`)+
    groupTable('全期間の月別・参考集計',r.descriptiveMonths||[],`${count}点。学習・検証を含むため独立した精度実績ではありません。`)+splits+availability+exclusions+notes;
}
