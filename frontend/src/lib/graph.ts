import type {Memory} from './demo';
import {factType,memoryEntities} from './memory.ts';

// Fallback layout and inferred links for this local dataset. Supply graphData to render authoritative backend relationships.
export type Relation='semantic'|'temporal'|'entity'|'causal';
export const relationColors:Record<Relation,string>={semantic:'#087de0',temporal:'#009b9d',entity:'#f3a21a',causal:'#9b60ec'};
export function memoryGraph(memories:Memory[]) {
  const nodes=memories.filter(m=>m.state!=='invalidated').slice(0,220).map((memory,i)=>{let hash=0;for(const char of memory.id)hash=(Math.imul(hash,31)+char.charCodeAt(0))>>>0;hash=Math.imul(hash^(hash>>>16),0x45d9f3b)>>>0;hash=Math.imul(hash^(hash>>>16),0x45d9f3b)>>>0;hash=(hash^(hash>>>16))>>>0;const angle=(hash%6283)/1000,r=Math.sqrt(((hash>>>8)%1000)/1000);return {id:memory.id,memory,x:420+Math.cos(angle)*r*235,y:275+Math.sin(angle)*r*205,sourceFacts:Math.max(1,memory.sourceFactIds?.length||1)};});
  const edges:{from:string;to:string;type:Relation}[]=[];
  nodes.forEach((a,i)=>nodes.slice(i+1).forEach((b,j)=>{
    const shared=memoryEntities(a.memory).filter(e=>memoryEntities(b.memory).includes(e));
    const sameSource=a.memory.source===b.memory.source;
    let type:Relation|undefined;
    if(a.memory.sourceFactIds?.includes(b.id)||b.memory.sourceFactIds?.includes(a.id))type='causal';
    else if(sameSource && Math.abs(Date.parse(a.memory.savedAt||'')-Date.parse(b.memory.savedAt||''))<1000*60*60*24*100)type='temporal';
    else if(shared.length>1&&(i+j)%3===0)type='entity';
    else if(sameSource)type='semantic';
    if(type){edges.push({from:a.id,to:b.id,type});}
  }));
  return {nodes,edges};
}

export type MemoryGraphData=ReturnType<typeof memoryGraph>;
