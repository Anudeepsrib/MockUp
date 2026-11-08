import {getBootstrap} from './api';
import { z } from 'zod';
import type { Memory } from './demo';
import { isRecallable } from './demo.ts';
import { factType, memoryEntities } from './memory.ts';

export const WORKSPACE_KEY = 'att-compounding-intelligence-v1';
export const EVENT_TYPES = ['retain.completed', 'consolidation.completed', 'memory_defense.triggered'] as const;
export const RETRY_SCHEDULE = ['5 seconds', '5 minutes', '30 minutes', '2 hours', '5 hours'];
const text = z.string().trim().min(1).max(8000);
const strings = z.array(z.string().max(120)).max(30);
const trigger = z.object({refresh_after_consolidation:z.boolean().optional(),fact_types:z.array(z.enum(['world','experience','observation'])).optional(),exclude_mental_models:z.boolean().optional(),exclude_mental_model_ids:strings.optional()}).strict();
const modelSchema = z.object({id:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),name:text,source_query:text,tags:strings.optional(),max_tokens:z.number().int().min(1).max(32000).optional(),trigger:trigger.optional()}).strict();
const directiveSchema = z.object({name:text,content:text,priority:z.number().int().optional(),is_active:z.boolean().optional(),tags:strings.optional()}).strict();
export const templateSchema = z.object({
  version:z.literal('1'),
  bank:z.object({name:text.optional(),reflect_mission:text.optional(),retain_mission:text.optional(),retain_extraction_mode:z.enum(['concise','verbose','custom','verbatim','chunks']).optional(),retain_custom_instructions:z.string().max(8000).optional(),retain_chunk_size:z.number().int().min(1).max(100000).optional(),retain_structured_chunk_size:z.number().int().min(1).max(100000).optional(),disposition_skepticism:z.number().int().min(1).max(5).optional(),disposition_literalism:z.number().int().min(1).max(5).optional(),disposition_empathy:z.number().int().min(1).max(5).optional(),enable_observations:z.boolean().optional(),observations_mission:text.optional(),entities_allow_free_form:z.boolean().optional(),entity_labels:z.array(z.object({key:text,type:z.literal('value'),values:z.array(z.object({value:text}).strict())}).strict()).optional()}).strict().optional(),
  mental_models:z.array(modelSchema).max(50).optional(),directives:z.array(directiveSchema).max(50).optional(),
}).strict().superRefine((v,ctx)=>{
  for(const [key,items] of [['mental_models',v.mental_models?.map(m=>m.id)],['directives',v.directives?.map(d=>d.name)]] as const)
    if(items && new Set(items).size!==items.length)ctx.addIssue({code:'custom',path:[key],message:'Names and IDs must be unique within each section.'});
  if(v.bank?.retain_extraction_mode==='custom'&&!v.bank.retain_custom_instructions?.trim())ctx.addIssue({code:'custom',path:['bank','retain_custom_instructions'],message:'Custom extraction requires instructions.'});
});
export type BankTemplate=z.infer<typeof templateSchema>;
export type MentalModel=z.infer<typeof modelSchema> & {content?:string;updated_at?:string;source_ids?:string[]};
export type KnowledgePage={id:string;name:string;folder:string;source_query:string;content:string;updated_at:string;source_ids:string[]};
export type Webhook={id:string;name:string;url:string;events:(typeof EVENT_TYPES[number])[];enabled:boolean};
export type Operation={id:string;name:string;at:string;detail:string;status:'completed'|'failed'};
export type BankWorkspace={config:NonNullable<BankTemplate['bank']>;models:MentalModel[];directives:NonNullable<BankTemplate['directives']>;pages:KnowledgePage[];hooks:Webhook[];operations:Operation[]};
export const presets=getBootstrap().presets;
export function initialWorkspace():BankWorkspace{return structuredClone(getBootstrap().state.bank);}
export function parseTemplate(raw:string):BankTemplate {if(raw.length>100000)throw new Error('Manifest must be under 100 KB.');let value;try{value=JSON.parse(raw);}catch{throw new Error('Enter a valid JSON manifest.');}const result=templateSchema.safeParse(value);if(!result.success)throw new Error(result.error.issues.map(i=>`${i.path.join('.')||'manifest'}: ${i.message}`).join('\n'));return result.data;}
export function applyTemplate(bank:BankWorkspace,template:BankTemplate):BankWorkspace {
  const value=templateSchema.parse(template);
  const merge=<T,>(existing:T[],incoming:T[]|undefined,key:(v:T)=>string)=>incoming?existing.map(old=>{const next=incoming.find(item=>key(item)===key(old));return next?{...old,...next}:old;}).concat(incoming.filter(next=>!existing.some(old=>key(old)===key(next)))):existing;
  return {...bank,config:{...bank.config,...value.bank},models:merge<MentalModel>(bank.models,value.mental_models,m=>m.id),directives:merge(bank.directives,value.directives,d=>d.name)};
}
export function exportTemplate(bank:BankWorkspace):BankTemplate {return {version:'1',bank:bank.config,mental_models:bank.models.map(({content,updated_at,source_ids,...model})=>model),directives:bank.directives};}
const workspaceSchema=z.object({config:templateSchema.shape.bank.unwrap(),models:z.array(modelSchema.extend({content:z.string().optional(),updated_at:z.string().optional(),source_ids:strings.optional()})),directives:z.array(directiveSchema),pages:z.array(z.object({id:text,name:text,folder:z.string(),source_query:text,content:z.string(),updated_at:text,source_ids:strings})),hooks:z.array(z.object({id:text,name:text,url:z.string().url(),events:z.array(z.enum(EVENT_TYPES)),enabled:z.boolean()})),operations:z.array(z.object({id:text,name:text,at:text,detail:z.string(),status:z.enum(['completed','failed'])}))});
export function readWorkspace(raw:string|null):BankWorkspace {if(!raw)return initialWorkspace();return workspaceSchema.parse(JSON.parse(raw));}

export function validateWebhook(name:string,url:string,events:string[]):Webhook {
  let address;try{address=new URL(url);}catch{throw new Error('Enter a valid HTTPS endpoint.');}
  if(address.protocol!=='https:'||address.username||address.password||address.hash)throw new Error('Use an HTTPS endpoint without credentials or a fragment.');
  if(!name.trim()||name.length>100)throw new Error('Enter a name under 100 characters.');
  if(!events.length||events.some(event=>!EVENT_TYPES.includes(event as typeof EVENT_TYPES[number])))throw new Error('Select at least one supported event.');
  return {id:crypto.randomUUID(),name:name.trim(),url:address.href,events:[...new Set(events)] as Webhook['events'],enabled:true};
}
export function eventEnvelope(event:typeof EVENT_TYPES[number],bankId:string,count:number,now:string) {
  return {event_id:crypto.randomUUID(),event,bank_id:bankId,operation_id:crypto.randomUUID(),status:event==='memory_defense.triggered'?'redact':'completed',timestamp:now,data:event==='retain.completed'?{document_id:'customer_360',tags:['customer-intelligence'],memory_unit_count:count}:event==='consolidation.completed'?{observations_created:0,observations_updated:count,observations_deleted:0,error_message:null}:{action:'redact',detector:'sensitive_data',document_id:'incoming-document',matched_types:['ssn_us'],message:'Sensitive pattern redacted before retention.'}};
}

export function memoryCorpus():Memory[]{return getBootstrap().knowledgeRecords;}
export {memoryGraph,relationColors,type Relation,type MemoryGraphData} from './graph';
// shortcut: these local learning helpers are deterministic; replace their action handlers with retrieval/model services for live reasoning.
export function recallMemories(memories:Memory[],query:string,limit=8) {
  const words=query.toLowerCase().match(/[a-z0-9]+/g)?.filter(w=>w.length>2&&!['what','which','the','are','and','how','with','from','does'].includes(w))||[];
  if(!words.length)return [];
  return memories.filter(m=>isRecallable(m,memories)).map(memory=>{const body=`${memory.title} ${memory.content}`.toLowerCase();const matches=words.filter(word=>body.includes(word)).length;return {memory,score:matches/words.length,strategies:[...(matches?['Keyword','Semantic']:[]),...(memoryEntities(memory).some(e=>query.toLowerCase().includes(e.toLowerCase()))?['Graph']:[]),...(/quarter|recent|2026|trend/.test(query.toLowerCase())?['Temporal']:[])]};}).filter(r=>r.score>0).sort((a,b)=>b.score-a.score||Number(factType(b.memory)==='observation')-Number(factType(a.memory)==='observation')).slice(0,limit);
}
export function synthesize(memories:Memory[],query:string,observationsOnly=false) {const matches=recallMemories(memories,query,observationsOnly?memories.length:4).filter(r=>!observationsOnly||factType(r.memory)==='observation').slice(0,4);return {content:matches.length?matches.map(({memory},i)=>`${memory.content} [${i+1}]`).join('\n\n'):'No confirmed evidence matches this query. Retain and review relevant facts before generating a conclusion.',source_ids:matches.map(r=>r.memory.id)};}
export function modelIsCurrent(model:{source_ids?:string[];updated_at?:string},memories:Memory[]):boolean {return !!model.source_ids?.length&&model.source_ids.every(id=>{const memory=memories.find(m=>m.id===id);return memory&&isRecallable(memory,memories)&&(!memory.editedAt||Date.parse(memory.editedAt)<=Date.parse(model.updated_at||''));});}

export function consolidateMemories(memories:Memory[],now:string):Memory[] {
  const facts=memories.filter(m=>m.confirmed&&m.state!=='invalidated'&&factType(m)==='world');
  const observations=[...new Set(facts.map(m=>m.source))].flatMap(source=>{
    const evidence=facts.filter(m=>m.source===source).slice(0,12);
    if(evidence.length<2)return [];
    const id=`consolidated-${encodeURIComponent(source)}`,content=evidence.slice(0,3).map(m=>m.content).join('\n\n');
    const old=memories.find(m=>m.id===id);
    if(old?.content===content&&JSON.stringify(old.sourceFactIds)===JSON.stringify(evidence.map(m=>m.id)))return [old];
    return [{id,type:'Learned pattern',title:`${source} · consolidated understanding`,content,source,confidence:Math.min(...evidence.map(m=>m.confidence)),confirmed:false,savedAt:old?.savedAt||now,editedAt:old?now:undefined,sourceFactIds:evidence.map(m=>m.id)}];
  });
  const ids=new Set(observations.map(m=>m.id));
  return [...memories.filter(m=>!ids.has(m.id)),...observations];
}
