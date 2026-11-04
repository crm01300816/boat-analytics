// Experimental post-snapshot forecast adjustment. No K/result/odds data from the target race.
import {decodeCourseCell,publishedRaceCourseStats} from './published-course-stats.js';
const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
const empty=(message)=>({usable:false,reason:message,adjustments:null,details:[],usedRacers:0,version:'course-blend-pilot-v1'});
const number=v=>Number.isFinite(Number(v))?Number(v):null;
const getCell=(values,course)=>decodeCourseCell(values?.[course-1]);
const ratio=(s,key)=>{
  if(!s?.starts)return null;
  if(key==='win')return s.wins/s.starts;
  if(key==='top2')return (s.wins+s.second)/s.starts;
  if(key==='top3')return (s.wins+s.second+s.third)/s.starts;
  if(key==='escape')return s.byMove['逃げ']/s.starts;
  if(key==='attacks')return (s.byMove['差し']+s.byMove['まくり']+s.byMove['まくり差し'])/s.starts;
  if(key==='beaten')return s.beatenByAttack/s.starts;
  if(key==='allow')return s.allowedEscape/s.starts;
  return null;
};
// Smoothed rate vs the same ACTUAL course's archive baseline. The existing forecast
// already contains a lane prior and national/venue win rate. Do not add raw rates.
function signal(prior,overall,venueStat,course,venuePrior,venueGlobalCount){
  const fields=[['win',.40],['top2',.20],['top3',.12]];
  if(course===1)fields.push(['escape',.15],['beaten',-.13]);
  else if(course===2)fields.push(['attacks',.20],['allow',-.08]);
  else fields.push(['attacks',.28]);
  let value=0;
  for(const [key,weight] of fields){
    const nationalBase=ratio(prior,key);if(nationalBase===null)continue;
    const count=ratio(overall,key);
    if(count===null)continue;
    const venueBase=ratio(venuePrior,key);
    const venueReference=venueBase===null?nationalBase:
      (venueGlobalCount*venueBase+250*nationalBase)/(venueGlobalCount+250);
    // National observations: alpha=50 starts. Local observations: alpha=70 starts.
    const nationalEstimate=(overall.starts*count+50*nationalBase)/(overall.starts+50);
    const post=venueStat?.starts?
      (venueStat.starts*ratio(venueStat,key)+70*nationalEstimate)/(venueStat.starts+70):
      nationalEstimate;
    const targetReference=venueStat?.starts?venueReference:nationalBase;
    const normalizer=Math.max(.14,Math.sqrt(targetReference*(1-targetReference)));
    value+=weight*clamp((post-targetReference)/normalizer,-.85,.85);
  }
  // Max +/-4.5 points on the existing 0..100 score (a bounded ~20% PL-strength change).
  return clamp(13.5*value,-4.5,4.5);
}
export function planCourseForecast(race,published,selectedDate){
  if(!race||!Array.isArray(race.entries)||race.entries.length!==6)return empty('6艇の出走表が必要です');
  if(published?.raceId!==race.id||!published?.index)return empty('公開3年統計を取得できていません');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(selectedDate||''))||
     !/^\d{12}$/.test(String(race.id||''))||String(race.id).slice(0,8)!==selectedDate.replaceAll('-',''))
    return empty('予想日時とレースIDが一致しません');
  if(selectedDate<=published.index.end)
    return empty('この開催日には未来の成績が混ざるため、固定3年統計を予想へ使用できません');
  const baseline=published.index.courseTotals;
  if(!baseline?.all||!baseline?.venues)return empty('進入コース別全国平均を検証できません（統計更新待ち）');
  const entries=[...race.entries].sort((a,b)=>a.lane-b.lane);
  if(entries.some((e,i)=>Number(e.lane)!==i+1||!/^\d{4}$/.test(String(e.id||''))))
    return empty('登録番号または艇番が不明なため使用できません');
  const stt=race.previews?.stt||{},exhibition=entries.map(e=>number(stt['艇'+e.lane+'_コース']));
  const validEntry=exhibition.every(c=>Number.isInteger(c)&&c>=1&&c<=6)&&new Set(exhibition).size===6;
  const courses=entries.map((e,i)=>validEntry?exhibition[i]:e.lane);
  const national=publishedRaceCourseStats(published,'all',race.venue);
  const local=publishedRaceCourseStats(published,'venue',race.venue);
  const venue=String(race.venue).padStart(2,'0');
  const venuePriors=baseline.venues?.[venue];
  const details=entries.map((e,i)=>{
    const course=courses[i];
    const n=national?.[String(e.id)]?.courses?.[course-1];
    const l=local?.[String(e.id)]?.courses?.[course-1];
    const p=getCell(baseline.all,course);
    const vp=getCell(venuePriors,course);
    if(!p||p.starts<100||!n||n.starts<12)
      return {lane:e.lane,name:e.name,course,starts:n?.starts||0,localStarts:l?.starts||0,delta:0,used:false};
    const delta=signal(p,n,l,course,vp,vp?.starts||0);
    return {lane:e.lane,name:e.name,course,starts:n.starts,localStarts:l?.starts||0,
      delta:Number(delta.toFixed(3)),used:true,
      winRate:n.wins/n.starts,top2Rate:(n.wins+n.second)/n.starts,
      attackRate:course===1?n.byMove['逃げ']/n.starts:
       (n.byMove['差し']+n.byMove['まくり']+n.byMove['まくり差し'])/n.starts};
  });
  const usedRacers=details.filter(d=>d.used).length;
  if(usedRacers<3)return empty('比較できる選手が3名未満です（該当コース12走以上が必要）');
  const adjustments=details.map(d=>d.delta);
  return {usable:true,reason:null,adjustments,details,usedRacers,
    actualCoursesConfirmed:validEntry,periodStart:published.index.start,periodEnd:published.index.end,
    note:'同コース全国・当地平均を基準に補正。少標本は縮小し1艇あたり±4.5点まで。未校正・未検証の試験モデル。',
    version:'course-blend-pilot-v1'};
}
