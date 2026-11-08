import assert from 'node:assert/strict';
import {api,getBootstrap,initializeApi} from '../src/lib/api.ts';

const state={connections:[],files:[],mcpServers:[],memories:[],bank:{config:{},models:[],directives:[],pages:[],hooks:[],operations:[]},revision:1};
const bootstrap={sources:[],state};
const observed=[];
const adapter={
  bootstrap:async()=>bootstrap,
  saveContext:async context=>({...state,...context,revision:2}),
  saveMemories:async memories=>({...state,memories,revision:3}),
  saveBank:async bank=>({...state,bank,revision:4}),
  startRun:async question=>{observed.push(question);return {id:7,question,topic:'custom-backend-topic'};},
  pollRun:async id=>({id,complete:true}),
  query:async()=>({answer:'Response from another service'}),
  evaluate:async()=>({passed:1,total:1,metrics:[]}),
  reset:async()=>state,
};
assert.throws(()=>getBootstrap(),/has not loaded/);
await initializeApi(adapter);
assert.equal(getBootstrap(),bootstrap,'The host can inject a backend without editing components');
await api.saveContext({connections:['external-source'],files:[],mcpServers:[]});
assert.equal(getBootstrap().state.revision,2);
assert.deepEqual(getBootstrap().state.connections,['external-source']);
assert.equal((await api.startRun('A live-service question')).topic,'custom-backend-topic');
assert.deepEqual(observed,['A live-service question']);
assert.equal((await api.query('Question')).answer,'Response from another service');
await api.reset();
assert.equal(getBootstrap().state.revision,1);
await assert.rejects(initializeApi({...adapter,bootstrap:async()=>{throw new Error('Backend unavailable');}}),/Backend unavailable/);
assert.throws(()=>getBootstrap(),/has not loaded/,'A failed backend switch must not expose stale data');
console.log('API composition self-check passed: replaceable service adapter, canonical state, arbitrary topics, and startup failure isolation.');
