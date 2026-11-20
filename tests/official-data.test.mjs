import test from 'node:test';
import assert from 'node:assert/strict';
import { parseB, parseK, parseRacelist, parseBeforeinfo, parseOdds3t, indexK, wakuRows, toCsv } from '../scripts/official-data.mjs';

// Fixtures are trimmed samples of the real official file shapes, verified
// against live downloads on 2026-11-20 (B/K LZH, racelist, beforeinfo, odds3t).

const bText = [
  'STARTB',
  '24BBGN',
  'ボートレース大　村   １１月２０日  十勝ばんえい競馬杯　  第　２日',
  '',
  '　１Ｒ  予選　　　　          Ｈ１８００ｍ  電話投票締切予定１５：１６ ',
  '-------------------------------------------------------------------------------',
  '1 4104木下陽介47東京55B1 4.55 25.53 4.00 23.08 12 34.21 28 32.35 2            8',
  '2 4073大橋純一45静岡53A1 6.28 47.97 6.07 45.24 18 29.52 34 33.98 2           11',
  '24BEND',
].join('\n');

test('parseB builds title and card rows in the legacy CSV shape', () => {
  const { titles, cards } = parseB(bText, '2026-11-20');
  assert.equal(titles.length, 1);
  assert.equal(titles[0]['レースコード'], '202611202401');
  assert.equal(titles[0]['レース場'], '大村');
  assert.equal(titles[0]['レース名'], '予選');
  assert.equal(titles[0]['タイトル'], '十勝ばんえい競馬杯');
  assert.equal(titles[0]['電話投票締切予定'], '15:16');
  assert.equal(cards[0]['艇1_登録番号'], '4104');
  assert.equal(cards[0]['艇1_選手名'], '木下陽介');
  assert.equal(cards[0]['艇1_級別'], 'B1');
  assert.equal(cards[0]['艇1_支部'], '東京');
  assert.equal(cards[0]['艇1_全国勝率'], '4.55');
  assert.equal(cards[0]['艇1_全国2連対率'], '25.53');
  assert.equal(cards[0]['艇1_モーター番号'], '12');
  assert.equal(cards[0]['艇2_全国勝率'], '6.28');
  // Fields the B file does not carry stay empty instead of being invented.
  assert.equal(cards[0]['艇1_全国平均ST'], '');
  assert.equal(cards[0]['艇1_全国3連対率'], '');
});

const kText = [
  'STARTK',
  '24KBGN',
  '大　村［成績］     11/19      十勝ばんえい競馬杯　  第 1日',
  '',
  '   1R       予選　　　　                 H1800m  曇り  風  西　　 3m  波　  2cm',
  '  着 艇 登番 　選　手　名　　ﾓｰﾀｰ ﾎﾞｰﾄ 展示 進入 ｽﾀｰﾄﾀｲﾐﾝｸ ﾚｰｽﾀｲﾑ まくり　　',
  '-------------------------------------------------------------------------------',
  '  01  3 4890 石　川　　　　諒 30   63  6.86   3    0.16     1.49.1',
  '  02  5 4792 杉　村　　賢　也 66   52  6.83   5    0.19     1.51.6',
  '  03  1 3568 木　村　　光　宏 65   84  6.94   1    0.20     1.53.4',
  '  F   4 4241 大　串　　重　幸 53   77  6.88   2   F0.01      .  . ',
  '',
  '        ３連単   3-5-1     9700  人気    25 ',
  '24KEND',
].join('\n');

test('parseK builds result and payout rows, flags flying by course', () => {
  const { results, payouts, boats } = parseK(kText, '2026-11-19');
  assert.equal(results.length, 1);
  const r = results[0];
  assert.equal(r['レースコード'], '202611192401');
  assert.equal(r['1着_艇番'], '3');
  assert.equal(r['2着_艇番'], '5');
  assert.equal(r['3着_艇番'], '1');
  assert.equal(r['決まり手'], 'まくり');
  assert.equal(r['天候'], '曇り');
  assert.equal(r['風向'], '西');
  assert.equal(r['風速(m)'], '3');
  assert.equal(r['波の高さ(cm)'], '2');
  assert.equal(r['2コース_艇番'], '4');
  assert.equal(r['2コース_F'], 'F');
  assert.equal(r['1コース_F'], '');
  assert.deepEqual(payouts, [{ 'レースコード': '202611192401', '3連単_組番': '3-5-1', '3連単_払戻金': '9700', '3連単_人気': '25' }]);
  assert.equal(boats.length, 4);
  assert.equal(boats.find(b => b.lane === 4).flying, true);
});

test('frame index and waku rows derive from K boats', () => {
  const { boats } = parseK(kText, '2026-11-19');
  const index = { schemaVersion: 1, through: null, racers: {} };
  assert.equal(indexK(index, '2026-11-19', boats), true);
  assert.equal(indexK(index, '2026-11-19', boats), false); // watermark: no double count
  const cards = [{ 'レースコード': '202611202401', '艇1_登録番号': '3568', '艇3_登録番号': '4890' }];
  const [row] = wakuRows(index, cards);
  assert.equal(row['艇3_枠番別勝率'], '10.00'); // one start, one win, win-rate scale x10
  assert.equal(row['艇3_過去1走_着順'], '1');
  assert.equal(row['艇1_過去1走_着順'], '3');
  assert.ok(row['艇3_枠番別平均ST']);
});

test('parseRacelist reads the full entrant stat line', () => {
  const html = `<table><tr>
    <td>１</td><td></td>
    <td>4104 / B1 木下 陽介 東京/東京 47歳/53.7kg</td>
    <td>F0 L0 0.15</td><td>4.55 25.53 42.55</td><td>4.00 23.08 38.46</td>
    <td>12 34.21 49.12</td><td>28 32.35 48.04</td><td></td><td>4</td>
  </tr></table>`;
  const entries = parseRacelist(html);
  const e = entries.get('4104');
  assert.equal(e.st, '0.15');
  assert.equal(e.f, '0');
  assert.equal(e.n3, '42.55');
  assert.equal(e.l3, '38.46');
  assert.equal(e.m3, '49.12');
  assert.equal(e.b3, '48.04');
  assert.equal(e.branch, '東京');
});

test('parseBeforeinfo reads exhibition, start exhibition and weather', () => {
  const html = `
  <table><tr><td>レース</td><td>1R</td><td>2R</td></tr><tr><td>締切予定時刻</td><td>15:16</td><td>15:46</td></tr></table>
  <table><tr><td>枠</td><td>写真</td><td>ボートレーサー</td><td>体重</td><td>展示 タイム</td></tr>
  <tr><td>1</td><td></td><td>木村 光宏</td><td>53.8kg</td><td>6.94</td><td>-0.5</td></tr>
  <tr><td>2</td><td></td><td>大串 重幸</td><td>52.0kg</td><td>6.88</td><td>0.0</td></tr></table>
  <table><tr><th colspan="3">スタート展示</th></tr>
  <tr><td colspan="3"><div><span class="table1_boatImage1Number is-type2">2</span><span class="table1_boatImage1Time">.06</span></div></td></tr>
  <tr><td colspan="3"><div><span class="table1_boatImage1Number is-type1">1</span><span class="table1_boatImage1Time">.01</span></div></td></tr></table>
  <div>水面気象情報 20:46現在 気温 12.0℃ 曇り 風速 4m 水温 18.0℃ 波高 3cm</div>`;
  const info = parseBeforeinfo(html);
  assert.equal(info.tkz[1], '6.94');
  assert.equal(info.tkz[2], '6.88');
  assert.deepEqual(info.stt[2], { course: 1, st: '.06' });
  assert.deepEqual(info.stt[1], { course: 2, st: '.01' });
  assert.equal(info.weather['天候'], '曇り');
  assert.equal(info.weather['波の高さ(cm)'], '3');
  assert.equal(info.deadlines[1], '15:16');
});

test('parseBeforeinfo reads the structured live weather units', () => {
  const html = `<div class="weather1_body">
    <div class="weather1_bodyUnit is-direction"><div class="weather1_bodyUnitLabel"><span class="weather1_bodyUnitLabelTitle">気温</span> <span class="weather1_bodyUnitLabelData">12.7℃</span></div></div>
    <div class="weather1_bodyUnit is-weather"><div class="weather1_bodyUnitLabel"><span class="weather1_bodyUnitLabelTitle">晴</span></div></div>
    <div class="weather1_bodyUnit is-wind"><div class="weather1_bodyUnitLabel"><span class="weather1_bodyUnitLabelTitle">風速</span> <span class="weather1_bodyUnitLabelData">5m</span></div></div>
    <div class="weather1_bodyUnit is-waterTemperature"><div class="weather1_bodyUnitLabel"><span class="weather1_bodyUnitLabelTitle">水温</span> <span class="weather1_bodyUnitLabelData">13.2℃</span></div></div>
    <div class="weather1_bodyUnit is-wave"><div class="weather1_bodyUnitLabel"><span class="weather1_bodyUnitLabelTitle">波高</span> <span class="weather1_bodyUnitLabelData">3cm</span></div></div>
  </div>`;
  const info = parseBeforeinfo(html);
  assert.deepEqual(info.weather, { '気温(℃)': '12.7', '天候': '晴', '風速(m)': '5', '水温(℃)': '13.2', '波の高さ(cm)': '3' });
});

test('parseOdds3t expands the rowspan grid into all combos present', () => {
  const head = [1, 2, 3, 4, 5, 6].map(n => `<th class="is-boatColor${n}">${n}</th><th colspan="2">選手${n}</th>`).join('');
  const row1 = [1, 2, 3, 4, 5, 6].map(g => `<td rowspan="4">${g === 1 ? 2 : 1}</td><td>${g === 1 ? 3 : g === 2 ? 3 : 2}</td><td class="oddsPoint">${g}.5</td>`).join('');
  const row2 = [1, 2, 3, 4, 5, 6].map(g => `<td>4</td><td class="oddsPoint">${g}0.5</td>`).join('');
  const html = `<table><tr>${head}</tr><tr>${row1}</tr><tr>${row2}</tr></table>`;
  const odds = parseOdds3t(html);
  assert.equal(odds['1-2-3'], '1.5');  // header group 1 = 1st place boat 1, rowspan = 2nd place 2, cell = 3rd place 3
  assert.equal(odds['2-1-3'], '2.5');  // header group 2 = 1st place boat 2, rowspan = 2nd place 1, cell = 3rd place 3
  assert.equal(odds['1-2-4'], '10.5'); // second row reuses the rowspan 2nd place
});

test('toCsv quotes fields containing commas', () => {
  assert.equal(toCsv(['a', 'b'], [{ a: '1,000', b: 'x' }]), 'a,b\n"1,000",x\n');
});
