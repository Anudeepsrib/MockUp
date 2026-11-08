import {createHttpStudioApi} from '../services/http-studio-api.ts';
import type {Bootstrap,StudioApi,StudioState} from './contracts';
export type {Answer,AgentRun,StudioState,Bootstrap,StudioApi} from './contracts';

// Composition boundary: change the URL here, or pass another StudioApi to initializeApi.
let backend:StudioApi=createHttpStudioApi(import.meta.env?.VITE_API_BASE_URL||'/api');
let bootstrap:Bootstrap|undefined;

export async function initializeApi(adapter?:StudioApi) {
  if(adapter)backend=adapter;
  bootstrap=undefined;
  const data=await backend.bootstrap();
  if(!Array.isArray(data?.state?.memories)||!Array.isArray(data.sources))throw new Error('The workspace API returned an invalid response.');
  bootstrap=data;
  return data;
}

export function getBootstrap():Bootstrap {
  if(!bootstrap)throw new Error('Workspace data has not loaded.');
  return bootstrap;
}

function remember(promise:Promise<StudioState>):Promise<StudioState> {
  return promise.then(state=>{getBootstrap().state=state;return state;});
}

// Keep components on the same interface when switching from FastAPI mocks to real services.
export const api:StudioApi={
  bootstrap:()=>backend.bootstrap(),
  saveContext:context=>remember(backend.saveContext(context)),
  saveMemories:memories=>remember(backend.saveMemories(memories)),
  saveBank:bank=>remember(backend.saveBank(bank)),
  startRun:(question,context)=>backend.startRun(question,context),
  reviewContext:context=>backend.reviewContext(context),
  pollRun:id=>backend.pollRun(id),
  query:question=>backend.query(question),
  evaluate:()=>backend.evaluate(),
  reset:()=>remember(backend.reset()),
};
