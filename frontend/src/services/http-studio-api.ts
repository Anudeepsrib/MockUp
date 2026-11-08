import type {StudioApi,StudioState,Bootstrap,AgentRun} from '../lib/contracts';

export type StudioFetch=(input:RequestInfo|URL,init?:RequestInit)=>Promise<Response>;

/** Replace this adapter's routes/response mapping when a backend uses different DTOs. */
export function createHttpStudioApi(baseUrl:string,fetcher:StudioFetch=globalThis.fetch.bind(globalThis)):StudioApi {
  const base=baseUrl.replace(/\/$/,'');
  let writes:Promise<unknown>=Promise.resolve();

  async function request<T>(path:string,method='GET',body?:unknown):Promise<T> {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    try {
      // An authenticated fetch implementation can be supplied without adding credentials to components.
      const response=await fetcher(`${base}${path}`,{method,signal:controller.signal,headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
      const value=await response.json().catch(()=>null);
      if(!response.ok){const detail=value?.detail;throw new Error(typeof detail==='string'?detail:Array.isArray(detail)?detail.map((item:{msg:string})=>item.msg).join(' '):'The workspace could not complete this request.');}
      if(value===null)throw new Error('The workspace API returned an invalid JSON response.');
      return value as T;
    } catch(error) {
      if(error instanceof TypeError||error instanceof DOMException)throw new Error('The workspace API is unavailable. Check the local backend and retry.');
      throw error;
    } finally {clearTimeout(timer);}
  }

  function save(path:string,body:unknown):Promise<StudioState> {
    // Preserve edit order; a rejected save must not permanently block later retries.
    const next=writes.then(()=>request<StudioState>(path,'PUT',body));
    writes=next.catch(()=>undefined);
    return next;
  }

  return {
    bootstrap:()=>request<Bootstrap>('/bootstrap'),
    saveContext:context=>save('/context',context),
    saveMemories:memories=>save('/memories',{memories}),
    saveBank:bank=>save('/bank',bank),
    startRun:async question=>{await writes;return request<AgentRun>('/runs','POST',{question});},
    pollRun:id=>request<AgentRun>(`/runs/${id}`),
    query:question=>request<{answer:string}>('/query','POST',{question}),
    evaluate:()=>request<Bootstrap['evaluations']>('/evaluations','POST'),
    reset:async()=>{await writes;return request<StudioState>('/reset','POST');},
  };
}
