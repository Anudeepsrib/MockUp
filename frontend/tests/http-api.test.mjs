import assert from 'node:assert/strict';
import {createHttpStudioApi} from '../src/services/http-studio-api.ts';

const state={connections:[],files:[],mcpServers:[],memories:[],bank:{config:{},models:[],directives:[],pages:[],hooks:[],operations:[]},revision:1};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
const calls=[];
const client=createHttpStudioApi('https://services.example/api/',async(url,init)=>{calls.push({url,init});return json(url.endsWith('/query')?{answer:'Service response'}:state);});
assert.deepEqual(await client.saveContext({connections:[],files:[],mcpServers:[]}),state);
assert.equal(calls[0].url,'https://services.example/api/context');
assert.equal(calls[0].init.method,'PUT');
assert.deepEqual(JSON.parse(calls[0].init.body),{connections:[],files:[],mcpServers:[]});
assert.equal((await client.query('Question')).answer,'Service response');
assert.deepEqual(JSON.parse(calls[1].init.body),{question:'Question'});
await client.pollRun(123);
assert.equal(calls[2].url,'https://services.example/api/runs/123');

// Agent creation must wait for connector edits that are still being saved.
const ordered=[];
let release;
const delayed=new Promise(resolve=>{release=resolve;});
const serial=createHttpStudioApi('/api',async(url)=>{ordered.push(url);if(url.endsWith('/context'))await delayed;return json(state);});
const context=serial.saveContext({connections:[],files:[],mcpServers:[]});
const memories=serial.saveMemories([]);
const run=serial.startRun('Question');
await Promise.resolve();
assert.deepEqual(ordered,['/api/context']);
release();
await Promise.all([context,memories,run]);
assert.deepEqual(ordered,['/api/context','/api/memories','/api/runs']);

let attempt=0;
const retry=createHttpStudioApi('/api',async()=>++attempt===1?json({detail:'Review source evidence first.'},409):json(state));
await assert.rejects(retry.saveMemories([]),/Review source evidence first/);
assert.deepEqual(await retry.saveMemories([]),state,'A failed save must not poison later writes');
const invalid=createHttpStudioApi('/api',async()=>new Response('not JSON',{status:200}));
await assert.rejects(invalid.bootstrap(),/invalid JSON/);
const validation=createHttpStudioApi('/api',async()=>json({detail:[{msg:'Required field missing.'}]},422));
await assert.rejects(validation.query('Question'),/Required field missing/);
console.log('HTTP adapter self-check passed: injectable transport, route mapping, ordered writes, retries, and errors.');
