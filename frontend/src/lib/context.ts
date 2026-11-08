import type { Source } from './demo';

export function createMcpSource(name:string,endpoint:string):Source {
  if(!name.trim()||name.trim().length>80)throw new Error('Enter a server name under 80 characters.');
  let url:URL;try{url=new URL(endpoint);}catch{throw new Error('Enter a valid HTTPS server endpoint.');}
  if(url.protocol!=='https:'||url.username||url.password||url.hash)throw new Error('Use HTTPS without credentials or a fragment.');
  return {id:`mcp-${crypto.randomUUID()}`,name:name.trim(),kind:'workflow',detail:'Tools, resources & prompts',color:'#008cba',category:'MCP',count:'3 capabilities',endpoint:url.href};
}
export function isMcpSource(value:unknown):value is Source {
  if(!value||typeof value!=='object')return false;
  const v=value as Record<string,unknown>;
  if(!['id','name','kind','detail','color','count','endpoint'].every(k=>typeof v[k]==='string')||v.category!=='MCP'||!/^mcp-[0-9a-f-]{36}$/.test(v.id as string))return false;
  try{createMcpSource(v.name as string,v.endpoint as string);return true;}catch{return false;}
}
