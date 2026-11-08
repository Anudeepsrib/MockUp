import { useState } from 'react';
import { Plug, Plus, ShieldCheck, Wrench, FileText, MessageSquare } from 'lucide-react';
import { createMcpSource } from '@/lib/context';
import type { Source } from '@/lib/demo';

export default function McpForm({onAdd}:{onAdd:(source:Source)=>void}) {
  const [name,setName]=useState(''),[endpoint,setEndpoint]=useState(''),[error,setError]=useState('');
  return <><span className="modal-eyebrow">MODEL CONTEXT PROTOCOL</span><h2 id="dialog-title">Connect an MCP server.</h2><p className="modal-description">Bring tools, resources, and reusable prompts into your Context Layer.</p><form className="mcp-form" onSubmit={e=>{e.preventDefault();setError('');try{onAdd(createMcpSource(name,endpoint));}catch(e){setError(e instanceof Error?e.message:'Could not configure this server.');}}}><label>Server name<input autoFocus value={name} onChange={e=>setName(e.target.value)} maxLength={80} placeholder="Enterprise knowledge" required/></label><label>Server endpoint<input type="url" value={endpoint} onChange={e=>setEndpoint(e.target.value)} maxLength={2000} placeholder="https://your-server.example/mcp" required/></label><div className="mcp-capability-row">{[{Icon:Wrench,name:'Tools'},{Icon:FileText,name:'Resources'},{Icon:MessageSquare,name:'Prompts'}].map(({Icon,name})=><span key={name}><Icon size={14}/>{name}</span>)}</div><p className="mcp-form-note"><ShieldCheck size={14}/> Configure the context your agent can access.</p>{error&&<p className="ci-error" role="alert">{error}</p>}<button className="mcp-submit" type="submit"><Plug size={15}/> Add MCP connector <Plus size={14}/></button></form></>;
}
