import {readFileSync,writeFileSync} from 'node:fs';
const source=process.argv[2]||'public/prospective-summary.json';
const output=process.argv[3]||'public/prospective-model-comparison.json';
const days=JSON.parse(readFileSync(source,'utf8')).days||[];
const counts=[3,5,7,10];
const aggregate=(items)=>{const byCount={};for(const count of counts){let races=0,hits=0,stakeYen=0,payoutYen=0;for(const item of items){const v=item?.[count];if(!v)continue;races+=v.settled||0;hits+=v.hits||0;stakeYen+=v.stakeYen||0;payoutYen+=v.payoutYen||0;}byCount[count]={races,hits,stakeYen,payoutYen,hitRate:races?hits/races:null,roi:stakeYen?payoutYen/stakeYen:null};}return byCount;};
const half=Math.floor(days.length/2);
const first=days.slice(0,half),later=days.slice(half);
const venueKeys=[...new Set(days.flatMap(d=>Object.keys(d.byVenue||{})))].sort();
const venueComparison=Object.fromEntries(venueKeys.map(venue=>[venue,{overall:aggregate(days.map(d=>d.byVenue?.[venue])),earlier:aggregate(first.map(d=>d.byVenue?.[venue])),later:aggregate(later.map(d=>d.byVenue?.[venue]))}]));
const minimumSample=100;
const stability=Object.fromEntries(counts.map(count=>{
 const a=aggregate(first.map(d=>d.byCount))[count],b=aggregate(later.map(d=>d.byCount))[count];
 return [count,{eligibleForReview:a.races>=minimumSample&&b.races>=minimumSample,minimumRacesPerPeriod:minimumSample,earlierRaces:a.races,laterRaces:b.races,earlierRoi:a.roi,laterRoi:b.roi,bothPeriodsAboveBreakEven:a.roi!==null&&b.roi!==null&&a.roi>1&&b.roi>1,decision:a.races<minimumSample||b.races<minimumSample?'INSUFFICIENT_SAMPLE':a.roi>1&&b.roi>1?'REQUIRES_FURTHER_VALIDATION':'NO_STABLE_PROFIT'}];
}));
const venueEligibility=Object.fromEntries(venueKeys.map(venue=>[venue,Object.fromEntries(counts.map(count=>{
 const a=venueComparison[venue].earlier[count],b=venueComparison[venue].later[count];
 return [count,{earlierRaces:a.races,laterRaces:b.races,minimumPerPeriod:minimumSample,eligible:a.races>=minimumSample&&b.races>=minimumSample}];
}))]));
const report={schemaVersion:1,generatedAt:new Date().toISOString(),source:'Frozen pre-deadline picks matched to public results; provisional, excludes ambiguous settlements',dateRange:{from:days[0]?.date||null,to:days.at(-1)?.date||null,days:days.length},stability,venueEligibility,reviewThreshold:{minimumRacesPerPeriod:minimumSample,meaning:'A screening threshold only, not statistical proof'},split:{method:'Chronological split by completed date; descriptive only, not a trained-model independent test',earlierDates:first.map(d=>d.date),laterDates:later.map(d=>d.date)},overall:aggregate(days.map(d=>d.byCount)),earlier:aggregate(first.map(d=>d.byCount)),later:aggregate(later.map(d=>d.byCount)),byVenue:venueComparison,confidenceBreakdown:{available:false,reason:'Pre-deadline snapshots do not yet preserve a calibrated confidence band; no fabricated confidence analysis'},warnings:['Do not select the best venue/count on the later period and call it independent validation.','Small samples and provisional settlement may overstate or understate performance.','A sustained ROI above 100% is not established.']};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log('PROSPECTIVE_COMPARISON',JSON.stringify({days:days.length,venues:venueKeys.length,output}));
