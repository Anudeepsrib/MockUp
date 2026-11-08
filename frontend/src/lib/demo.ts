export type Source = { id: string; name: string; kind: string; detail: string; color: string; category: 'Structured' | 'Unstructured' | 'Files' | 'MCP'; count: string; endpoint?:string };
import {getBootstrap} from './api';
import {isRecallable} from './memory';
export {isRecallable} from './memory';
export const sources=getBootstrap().sources;
export const initialConnections=getBootstrap().initialConnections;
export const prompts=getBootstrap().prompts;
// Backends can return new topic labels without changing the answer layout.
export type Topic = string;
export const answers=getBootstrap().answers;
export function topicFor(question:string):Topic{return /revenue|sales|growth|opportunit/i.test(question)?'revenue':/network|latency|outage|performance/i.test(question)?'network':'churn';}
export type Memory = {id:string; type:string; title:string; content:string; source:string; confidence:number; confirmed:boolean; edited?:boolean; question?:string; savedAt?:string; editedAt?:string; state?:'valid'|'invalidated'; stateChangedAt?:string; reason?:string; sourceFactIds?:string[]};
export function cleanMemoryCopy(memory: Memory): Memory {
  let content = memory.content;
  for (const [from,to] of [
    ['In this sample dataset,','In the dataset,'],
    ['The sample network data','The network data'],
    ['The sample account and billing data','The account and billing data'],
    ['households in the sample still','households in the dataset still'],
    ['Northeast demo churn is','Northeast churn is'],
    ['Network availability in the sample is','Network availability is'],
  ]) content = content.replaceAll(from,to);
  return content === memory.content ? memory : {...memory,content};
}
export function confirmMemory(memories: Memory[], id: string): Memory[] {
  return memories.map(memory => memory.id === id && memory.state !== 'invalidated' && memory.title.trim() && memory.content.trim() && (memory.sourceFactIds||[]).every(sourceId=>{const source=memories.find(m=>m.id===sourceId);return source&&isRecallable(source,memories);}) ? {...memory, confirmed:true} : memory);
}
export function isMemory(value: unknown): value is Memory {
  if (!value || typeof value !== 'object') return false;
  const memory = value as Record<string, unknown>;
  return ['id','type','title','content','source'].every(key => typeof memory[key] === 'string') && typeof memory.confirmed === 'boolean' && typeof memory.confidence === 'number' && Number.isFinite(memory.confidence) && memory.confidence >= 0 && memory.confidence <= 100 && (memory.state === undefined || memory.state === 'valid' || memory.state === 'invalidated') && ['question','savedAt','editedAt','stateChangedAt','reason'].every(key=>memory[key]===undefined||typeof memory[key]==='string') && (memory.edited===undefined||typeof memory.edited==='boolean') && (memory.sourceFactIds===undefined||Array.isArray(memory.sourceFactIds)&&memory.sourceFactIds.every(id=>typeof id==='string'));
}
export const agentSteps=getBootstrap().agentSteps;
