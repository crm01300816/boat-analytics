// Research-only walk-forward evaluator. Never feeds holdout results into selection.
import {allocate,adjust} from './backtest.js';
export const RESEARCH_COUNTS=[3,5,7,10];
export const RESEARCH_THRESHOLDS=[0,.05,.1,.15,.2,.25,.3,.4];
export function scoreSample(sample,model,count){
 const probs=model?.parameters?adjust(sample.probabilities,model.parameters):sample.probabilities;
 const picks=allocate(probs,count);
 const probabilityByCombo=new Map(probs.map(p=>[p.combo,p.p]));
 const confidence=picks.reduce((sum,p)=>sum+(probabilityByCombo.get(p.combo)||0),0);
 const hit=picks.find(p=>p.combo===sample.winner);
 const stake=picks.reduce((sum,p)=>sum+p.stake,0);
 const payout=sample.payout===null?null:(hit?.stake||0)/100*sample.payout;
 return {confidence,hit:Boolean(hit),stake,payout};
}
export function evaluatePolicy(samples,model,count,threshold=0){
 const eligible=samples.map(x=>scoreSample(x,model,count)).filter(x=>x.confidence>=threshold);
 const known=eligible.filter(x=>x.payout!==null);
 const stake=known.reduce((s,x)=>s+x.stake,0),returns=known.reduce((s,x)=>s+x.payout,0);
 return {count,threshold,total:samples.length,selected:eligible.length,settled:known.length,
 coverage:samples.length?eligible.length/samples.length:null,
 hitRate:eligible.length?eligible.filter(x=>x.hit).length/eligible.length:null,
 returnRate:known.length===eligible.length&&stake>0?returns/stake:null,
 stakeYen:stake,payoutYen:returns,missingPayouts:eligible.length-known.length};
}
export function choosePolicy(training,validation,models,counts=RESEARCH_COUNTS,thresholds=RESEARCH_THRESHOLDS){
 if(!training.length||!validation.length)throw new Error('Training and validation data required');
 const trials=[];
 for(const [name,model] of Object.entries(models))for(const count of counts)for(const threshold of thresholds){
  const train=evaluatePolicy(training,model,count,threshold);
  const valid=evaluatePolicy(validation,model,count,threshold);
  if(valid.selected<30||valid.missingPayouts||train.selected<30)continue;
  trials.push({name,count,threshold,training:train,validation:valid});
 }
 trials.sort((a,b)=>(b.validation.returnRate??-Infinity)-(a.validation.returnRate??-Infinity)||b.validation.selected-a.validation.selected);
 return {winner:trials[0]||null,trials};
}
export function independentTest(test,selection,models){
 if(!selection?.winner)return null;
 const {name,count,threshold}=selection.winner;
 return {name,count,threshold,...evaluatePolicy(test,models[name],count,threshold)};
}
export function researchReport(report,count=5){
 const test=report?.partitions?.test;
 if(!test)return null;
 const base=test.baseline.byCount.find(x=>x.count===count);
 const candidate=test.candidate.byCount.find(x=>x.count===count);
 return {count,base,candidate,train:report.partitions.training,validation:report.partitions.validation,test,
 candidates:[{name:'現行モデル',metric:base},{name:'枠番補正モデル',metric:candidate}],
 abstention:'集計JSONには締切前のレース単位予測・確定払戻の組がないため、見送り閾値別の独立回収率は未算出。実データなしの数値は表示しません。',
 improvement:'学習・検証・最終テストを分離した比較は表示可能。モデルや見送り閾値の自動採用は独立した再検証が完了するまで無効。'};
}
