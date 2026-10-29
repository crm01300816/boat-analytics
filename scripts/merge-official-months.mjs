import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';

const [directory, outDirectory] = process.argv.slice(2);
if (!directory || !outDirectory) throw new Error('Usage: node scripts/merge-official-months.mjs reports outputs');
const START='2023-10-29', END='2026-10-28';
const months=[];
for(let y=2023;y<=2026;y++) for(let m=1;m<=12;m++){
  const month=y+'-'+String(m).padStart(2,'0');
  if(month>='2023-10'&&month<='2026-10') months.push(month);
}
const allDays=new Set(), periodRows=[], missing=[], errorMonths=[];
const sums=Object.fromEntries([3,5,7,10].map(k=>[k,{analyzed:0,hits:0,stakes:0,provisionalPayout:0,omitted:0}]));
let raceHeadings=0, joinedRaces=0, filesRead=0;
for(const month of months){
  const filename=join(directory,'official-'+month+'.json');
  let data;
  try { data=JSON.parse(await readFile(filename,'utf8')); }
  catch(e){missing.push(month);continue;}
  try {
    if(!Array.isArray(data.parsedDaySummary)||!data.parsedDaySummary.length || typeof data.statistics!=='object') throw new Error('Invalid report schema');
    const thisDays=[];
    let monthJoined=0,monthHeadings=0;
    for(const row of data.parsedDaySummary){
      if(typeof row.date!=='string'||row.date.slice(0,7)!==month||row.date<START||row.date>END||allDays.has(row.date)||thisDays.includes(row.date)) throw new Error('Duplicate/out-of-range date');
      thisDays.push(row.date);
      monthJoined+=Number(row.joined||0);
      monthHeadings+=Number(row.B?.race_headers||0);
    }
    if(monthJoined!==data.racesWithSixEntriesAndPayout) throw new Error('Joined count mismatch');
    const validated={};
    for(const count of [3,5,7,10]){
      const s=data.statistics[count];
      if(!s || s.analyzed!==monthJoined || s.stakes!==monthJoined*1000 || s.hits>s.analyzed || s.hits<0 || s.provisionalPayout<0) throw new Error('Bad stake/count: '+count);
      validated[count]=s;
    }
    for(const day of thisDays) allDays.add(day);
    for(const count of [3,5,7,10]){
      for(const key of ['analyzed','hits','stakes','provisionalPayout','omitted']) sums[count][key]+=Number(validated[count][key]||0);
    }
    raceHeadings+=monthHeadings;joinedRaces+=monthJoined;filesRead++;
    periodRows.push({month,days:thisDays.length,races:monthJoined,
      metrics:Object.fromEntries([3,5,7,10].map(c=>[c,{hits:validated[c].hits,hitRate:validated[c].hitRate,provisionalRoi:validated[c].provisionalRoi}]))});
  } catch (e) {errorMonths.push({month,error:e.message});}
}
const expectedDays=[];
for(let cursor=new Date(START+'T00:00:00Z');cursor<=new Date(END+'T00:00:00Z');cursor.setUTCDate(cursor.getUTCDate()+1))
  expectedDays.push(cursor.toISOString().slice(0,10));
const missingDates=expectedDays.filter(day=>!allDays.has(day));
const combined=Object.fromEntries([3,5,7,10].map(c=>{
  const s=sums[c];
  return [c,{...s,hitRate:s.analyzed?s.hits/s.analyzed:null,provisionalRoi:s.stakes?s.provisionalPayout/s.stakes:null}];
}));
const report={
  schemaVersion:1,
  scope:'EXPLORATORY 2023-10-29 through 2026-10-28 official B/K archives, NOT an unbiased prospective/backtest proof',
  status:missing.length===0&&errorMonths.length===0&&missingDates.length===0?'all_periods_processed':'incomplete',
  caveats:[
    'Historic downloaded B archives lack independently proven pre-race file timestamps',
    'No demonstration/odds/waku historic features. Current app model is scored with only B statistics',
    'Normal 3rentan payout only; refunds/abandoned races/special settlements are not fully checked',
    'Only races with six parsed entrants and valid 3rentan payout are included; exclusions bias the sample',
    'Model may have been optimized on the historical period; no independent out-of-sample proof',
    'Official source archives and per-race data are not redistributed'
  ],
  requestedStart:START,requestedEnd:END,expectedMonths:months.length,
  monthsRead:filesRead,expectedDays:expectedDays.length,daysRecorded:allDays.size,
  missingMonths:missing,invalidMonths:errorMonths,missingDates,
  raceHeaders:raceHeadings,racesAnalyzed:joinedRaces,statistics:combined,months:periodRows
};
await mkdir(outDirectory,{recursive:true});
await writeFile(resolve(outDirectory,'official-three-year-exploratory.json'),JSON.stringify(report,null,2)+'\n');
const pct=n=>n==null?'—':(100*n).toFixed(2)+'%';
let md='# BOATRACE公式B/K 3年探索的検証（'+report.status+'）\n\n';
md+='対象：'+START+'〜'+END+'。処理月数 '+filesRead+'/'+months.length+'、記録日数 '+allDays.size+'/'+expectedDays.length+'、結合レース '+joinedRaces+'。\n\n';
md+='**注意：Bファイルの配布時刻と返還の完全監査なし。独立した予想精度・将来利益の証明ではありません。**\n\n';
md+='| 買い目 | 対象 | 的中 | 的中率 | 投資額 | 暫定払戻 | 暫定回収率 |\n|---:|---:|---:|---:|---:|---:|---:|\n';
for(const c of [3,5,7,10]){
  const s=combined[c];
  md+='| '+c+'点 | '+s.analyzed+' | '+s.hits+' | '+pct(s.hitRate)+' | '+s.stakes+'円 | '+s.provisionalPayout+'円 | '+pct(s.provisionalRoi)+' |\n';
}
md+='\n欠損月：'+(missing.join(', ')||'なし')+'。不正月：'+(errorMonths.map(e=>e.month).join(', ')||'なし')+'。\n';
md+='\n生データは公開せず、公式B/Kを一時取得して集約した値です。\n';
await writeFile(resolve(outDirectory,'official-three-year-exploratory.md'),md);
console.log('THREE_YEAR_AGGREGATE '+JSON.stringify({
  status:report.status,monthsRead:filesRead,monthsExpected:months.length,
  daysRecorded:allDays.size,daysExpected:expectedDays.length,races:joinedRaces,
  missingMonths:missing,invalidMonths:errorMonths,statistics:combined
}));
