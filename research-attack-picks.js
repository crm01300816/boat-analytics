// Historical attack-model projection. Raw top-3 mass is NOT calibrated probability.
export function researchAttackPicks(race) {
  const es=[...(race?.entries||[])].sort((a,b)=>a.lane-b.lane);
  const keys=['win','n2','localWin','l2','m2','b2'];
  if(es.length!==6||es.some((e,i)=>Number(e.lane)!==i+1||keys.some(k=>e[k]===null||e[k]===undefined||e[k]===''||!Number.isFinite(Number(e[k])))))
    return {picks:[],reason:'研究モデルに必要な6艇の出走前成績が不足しています。'};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const strength=es.map(e=>.42*Number(e.win)/10+.18*Number(e.n2)/100+.14*Number(e.localWin)/10+.08*Number(e.l2)/100+.14*Number(e.m2)/100+.04*Number(e.b2)/100);
  const scores=strength.map((v,i)=>4*v+(i===0?1.1:i===1?.15:0));
  const vulnerability=clamp(1.4+4*(Math.max(...strength.slice(1))-strength[0]),0,2.8);
  scores[0]-=vulnerability;
  for(let i=1;i<=3;i++)scores[i]+=vulnerability*(.45+.55*clamp(strength[i]-strength[0]+.25,0,1));
  const max=Math.max(...scores),w=scores.map(v=>Math.exp(clamp(v-max,-40,0))),total=w.reduce((a,b)=>a+b,0);
  const combos=[];
  for(let a=0;a<6;a++)for(let b=0;b<6;b++)for(let c=0;c<6;c++){
    if(a===b||a===c||b===c)continue;
    combos.push({combo:[a+1,b+1,c+1].join('-'),p:w[a]/total*w[b]/(total-w[a])*w[c]/(total-w[a]-w[b])});
  }
  combos.sort((a,b)=>b.p-a.p||a.combo.localeCompare(b.combo));
  const top=combos.slice(0,3),mass=top.reduce((sum,x)=>sum+x.p,0);
  if(mass<.5)return {picks:[],mass,eligible:false,reason:'研究モデルの上位3点の合計スコアが50%未満のため対象外です。'};
  // Best observed all-36-month provisional profit among six predefined allocations.
  // Frozen for prospective monitoring; historical selection is not an independent holdout.
  const stakes=[300,500,200];
  return {picks:top.map((x,i)=>({...x,stake:stakes[i]})),mass,total:1000,eligible:true,oddsAvailable:false,method:'攻撃型AI・上位3点50%以上・300/500/200円（過去検証選択）'};
}
