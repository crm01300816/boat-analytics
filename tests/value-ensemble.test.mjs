import test from 'node:test';import assert from 'node:assert/strict';
import {ensembleCandidates,assessOddsRecord} from '../scripts/value-ensemble.mjs';
const models=[{name:'motor',probabilities:{'1-2-3':.2}},{name:'racer',probabilities:{'1-2-3':.18}},{name:'in_escape',probabilities:{'1-2-3':.19}}];
test('missing odds means no picks',()=>assert.equal(ensembleCandidates(models,null).status,'SKIP'));
test('conservative ensemble accepts value with valid inputs',()=>assert.equal(ensembleCandidates(models,{'1-2-3':7}).picks.length,1));
test('low odds fail value threshold',()=>assert.equal(ensembleCandidates(models,{'1-2-3':5}).picks.length,0));
test('model disagreement means no picks',()=>assert.equal(ensembleCandidates([{name:'a',probabilities:{'1-2-3':.1}},{name:'b',probabilities:{'1-2-3':.3}},{name:'c',probabilities:{'1-2-3':.2}}],{'1-2-3':10}).picks.length,0));
test('postdeadline odds rejected',()=>assert.equal(assessOddsRecord({observedAt:'2026-10-30T12:00:00+09:00',deadlineAt:'2026-10-30T11:59:00+09:00',source:'test',odds:{}}).valid,false));
