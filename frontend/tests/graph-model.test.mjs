import assert from 'node:assert/strict';
import {memoryGraph} from '../src/lib/graph.ts';

// This import must work without a server or initializeApi: the graph is reusable outside the studio shell.
const memories=[
  {id:'fact',type:'Observation',title:'Boston service record',content:'Boston Northeast Fiber Network evidence.',source:'service',confidence:98,confirmed:true,savedAt:'2026-01-05T00:00:00Z'},
  {id:'observation',type:'Learned pattern',title:'Service pattern',content:'Related evidence.',source:'service',confidence:95,confirmed:true,sourceFactIds:['fact'],savedAt:'2026-02-05T00:00:00Z'},
];
const graph=memoryGraph(memories);
assert.equal(graph.nodes.length,2);
assert.deepEqual(graph.edges,[{from:'fact',to:'observation',type:'causal'}]);
assert.ok(graph.nodes.every(node=>Number.isFinite(node.x)&&Number.isFinite(node.y)));
assert.deepEqual(memoryGraph(memories),graph,'The fallback layout must be stable across renders');
assert.equal(memoryGraph([{...memories[0],state:'invalidated'}]).nodes.length,0);
assert.deepEqual(memoryGraph([]),{nodes:[],edges:[]});
console.log('Reusable graph self-check passed: no bootstrap dependency, stable layout, and linked evidence.');
