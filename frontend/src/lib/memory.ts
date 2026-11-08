import type { Memory } from './demo';

export const DEMO_STORAGE_KEY = 'att-insight-demo-v1';
export const MEMORY_BANK = 'att-enterprise-intelligence';
export type FactType = 'world' | 'experience' | 'observation';

// The original business labels predate the control plane taxonomy; keep stored records compatible.
export function factType(memory: Memory): FactType {
  return memory.type === 'Learned pattern' ? 'observation' : memory.type === 'Session context' ? 'experience' : 'world';
}

// Approval only makes knowledge reusable when every supporting record is also approved and valid.
export function isRecallable(memory:Memory,memories:Memory[],seen=new Set<string>()):boolean {
  if(!memory.confirmed||memory.state==='invalidated'||seen.has(memory.id))return false;
  const visited=new Set(seen).add(memory.id);
  return (memory.sourceFactIds||[]).every(id=>{const source=memories.find(m=>m.id===id);return !!source&&isRecallable(source,memories,visited);});
}

export function memoryPurpose(memory:Memory):string {
  return factType(memory)==='observation'?'Connects related facts into a pattern the agent can consider.':factType(memory)==='experience'?'Keeps the question and decision available for related conversations.':'Keeps a source-backed fact available as context for related questions.';
}

export function summarizeMemories(memories:Memory[]) {
  const active=memories.filter(memory=>memory.state!=='invalidated');
  const ready=active.filter(memory=>isRecallable(memory,memories));
  const readyIds=new Set(ready.map(memory=>memory.id));
  const recent=[...active].sort((a,b)=>(Date.parse(b.editedAt||b.savedAt||'')||0)-(Date.parse(a.editedAt||a.savedAt||'')||0));
  const pending=recent.filter(memory=>!readyIds.has(memory.id));
  // Review source-ready records first so users can approve evidence before its derived patterns.
  const reviewNext=pending.find(memory=>(memory.sourceFactIds||[]).every(id=>readyIds.has(id)))||pending[0];
  const seen=new Set<string>();
  const facts=recent.filter(memory=>factType(memory)!=='experience');
  const takeaways=(facts.length?facts:recent).filter(memory=>{
    const key=JSON.stringify([factType(memory),memory.source,memory.content.trim().toLowerCase()]);
    if(seen.has(key))return false;
    seen.add(key);return true;
  }).slice(0,3);
  return {readyCount:ready.length,reviewCount:pending.length,patternCount:ready.filter(memory=>factType(memory)==='observation').length,sourceCount:new Set(active.map(memory=>memory.source)).size,reviewNext,takeaways};
}

export function memoryEntities(memory: Memory): string[] {
  const text = `${memory.title} ${memory.content}`;
  return ['Northeast','Boston','New York','Philadelphia','Newark','Providence','Hartford','Fiber','Network','Revenue','Churn'].filter(name => new RegExp(`\\b${name}\\b`, 'i').test(text));
}

export function memoryRecord(memory: Memory) {
  return {
    id:memory.id, bank_id:MEMORY_BANK, fact_type:factType(memory), state:memory.state || 'valid',
    text:memory.content, context:memory.question || memory.title, document_id:memory.source,
    entities:memoryEntities(memory).map(name => ({name})),
    tags:['customer-intelligence'], created_at:memory.savedAt || null,
    edited_at:memory.editedAt || null, occurred_start:null, occurred_end:null,
    source_fact_ids:memory.sourceFactIds||[],metadata:{title:memory.title, review_status:memory.confirmed?'confirmed':'draft'},
  };
}

export function filterMemories(memories: Memory[], query='', type='all', state='all', source='', entity=''): Memory[] {
  const q = query.trim().toLowerCase();
  return memories.filter(memory =>
    (type === 'all' || factType(memory) === type) &&
    (state === 'all' || (memory.state || 'valid') === state) &&
    (!source || memory.source === source) && (!entity || memoryEntities(memory).includes(entity)) &&
    (!q || `${memory.title} ${memory.content} ${memory.question || ''}`.toLowerCase().includes(q))
  );
}

export function curateMemory(memory: Memory, change:{text?:string; state?:'valid'|'invalidated'; reason:string}, now:string): Memory {
  if (factType(memory) === 'observation') throw new Error('Observations are derived. Edit their source facts instead.');
  if (change.text !== undefined && (!change.text.trim() || change.text.length > 4000)) throw new Error('Memory text must contain 1–4,000 characters.');
  if (!change.reason.trim()) throw new Error('Add a reason for this change.');
  return {...memory, ...(change.text !== undefined?{content:change.text.trim(),edited:true,editedAt:now}:{}),
    ...(change.state?{state:change.state,stateChangedAt:now}:{}),reason:change.reason.trim(),confirmed:false};
}

export function invalidateDependents(memories:Memory[],changedId:string):Memory[] {
  const affected=new Set([changedId]);
  let grew=true;
  while(grew){grew=false;for(const memory of memories)if(!affected.has(memory.id)&&memory.sourceFactIds?.some(id=>affected.has(id))){affected.add(memory.id);grew=true;}}
  return memories.map(memory=>memory.id!==changedId&&affected.has(memory.id)?{...memory,confirmed:false}:memory);
}
