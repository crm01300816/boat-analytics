// Form index is a transparent heuristic based on same-frame recent finishes.
// It is not an overall last-10-race record or a calibrated win probability.
export function racerForm(entry) {
  const finishes=(entry.recent||[]).map(x=>Number(String(x).trim())).filter(n=>Number.isInteger(n)&&n>=1&&n<=6);
  if(finishes.length<5)return {score:null,grade:'—',label:'データ不足',count:finishes.length,trend:null,reason:'同枠の直近着順が5走未満'};
  const finishPoints=finishes.map(n=>(6-n)/5*100);
  const mean=finishPoints.reduce((a,b)=>a+b,0)/finishes.length;
  const winBaseline=Number.isFinite(entry.win)?Math.max(0,Math.min(100,entry.win/8*100)):null;
  // Smaller recent samples are shrunk toward neutral to avoid overstating form.
  const score=Math.round(Math.max(0,Math.min(100,50+(mean-50)*finishes.length/(finishes.length+5))));
  const grade=score>=70?'A':score>=60?'B':score>=45?'C':'D';
  const label=score>=70?'好調':score>=60?'やや好調':score>=45?'普通':'低調';
  const trend=winBaseline==null?null:Math.round(score-winBaseline);
  return {score,grade,label,count:finishes.length,trend,reason:'同枠直近'+finishes.length+'走の着順から算出（参考指数）'};
}
