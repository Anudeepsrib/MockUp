import assert from 'node:assert/strict';
import {emptyInvestigation,previewChecks,readInvestigation,sameBrief,scopedQuestion} from '../src/lib/investigation.ts';

const draft=emptyInvestigation();
assert.ok(Object.values(draft.brief).every(value=>value===''),'A new task must not assume a domain or a business question');
assert.deepEqual(JSON.parse(JSON.stringify(readInvestigation(JSON.stringify(draft)))),draft);
for(const raw of [null,'broken','null','[]','{}',JSON.stringify({...draft,brief:{objective:42}}),JSON.stringify({...draft,action:{...draft.action,status:'Approved'}}),JSON.stringify({...draft,pinnedIds:[{}]})]){
  assert.deepEqual(readInvestigation(raw),draft,'Malformed browser storage must not break the workspace');
}
assert.deepEqual(readInvestigation(JSON.stringify({...draft,pinnedIds:['a','a','b']})).pinnedIds,['a','b']);
assert.equal(readInvestigation(JSON.stringify({...draft,lastRunId:-1})).lastRunId,undefined);
assert.equal(readInvestigation(JSON.stringify({...draft,lastRunId:123,runBrief:draft.brief})).lastRunId,123);
const brief={objective:'What changed?',region:'Project Atlas',period:'Current release',metric:'Delivery risks',deliverable:'Prioritize the next steps'};
assert.ok(sameBrief(brief,{...brief,region:' Project Atlas '}));
assert.ok(!sameBrief(draft.brief,{...draft.brief,period:'Different period'}),'Changed scope must make a previous review stale');
const checks=previewChecks(brief);
assert.equal(checks.filter(check=>check.result==='pass').length,2);
for(const dimension of ['Fidelity','Efficiency','Security'])assert.equal(checks.find(check=>check.dimension===dimension).result,'unknown','Preview cannot claim backend verification');
assert.equal(previewChecks({...draft.brief,period:''})[0].result,'fail');
assert.equal(previewChecks({...draft.brief,deliverable:''})[1].result,'fail');
const question=scopedQuestion(brief);
assert.ok(question.startsWith('What changed?\n\n'));
for(const value of Object.values(brief))assert.ok(question.includes(value),'The scoped question must carry the user-entered intent');
console.log('Investigation checks passed: browser recovery, scope snapshots, honest preview findings, and scoped questions.');
