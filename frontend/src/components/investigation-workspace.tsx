import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowUp,BookOpen,Check,ChevronDown,FileText,Info,LoaderCircle,Plus,ShieldCheck,SlidersHorizontal,Sparkles,X} from 'lucide-react';
import type {AgentRun,Answer} from '@/lib/contracts';
import type {Memory} from '@/lib/demo';
import {isRecallable} from '@/lib/memory';
import type {ContextReview,InvestigationDraft} from '@/lib/investigation';

type Props={draft:InvestigationDraft;onChange:(draft:InvestigationDraft)=>void;turns:AgentRun[];memories:Memory[];running:boolean;tick:number;onAsk:(question:string)=>void;onNewChat:()=>void;onEvidence:()=>void;onSources:()=>void;onReview:(id?:string)=>void;onCitation:(answer:Answer,index:number)=>void;chatInput:string;setChatInput:(value:string)=>void;storageError:boolean;contextReview?:ContextReview;contextBusy:boolean;contextError:string;onContextReview:()=>void};

export default function InvestigationWorkspace({draft,onChange,turns,memories,running,tick,onAsk,onNewChat,onEvidence,onSources,onReview,onCitation,chatInput,setChatInput,storageError,contextReview,contextBusy,contextError,onContextReview}:Props){
  const [contextOpen,setContextOpen]=useState(false),[validation,setValidation]=useState('');
  const dialogRef=useRef<HTMLDialogElement>(null),composerRef=useRef<HTMLTextAreaElement>(null),chatEnd=useRef<HTMLDivElement>(null);
  const approved=memories.filter(memory=>isRecallable(memory,memories)).length;
  const contextComplete=[draft.brief.region,draft.brief.period,draft.brief.metric,draft.brief.deliverable].every(value=>value.trim());
  const lastTurn=turns.at(-1);
  useEffect(()=>{if(contextOpen)dialogRef.current?.showModal();else dialogRef.current?.close();},[contextOpen]);
  useEffect(()=>{if(turns.length)chatEnd.current?.scrollIntoView({behavior:'smooth',block:'end'});},[turns.length,lastTurn?.complete]);
  const updateMessage=(value:string)=>{setChatInput(value);onChange({...draft,brief:{...draft.brief,objective:value}});setValidation('');};
  const updateContext=(field:keyof InvestigationDraft['brief'],value:string)=>{onChange({...draft,brief:{...draft.brief,[field]:value}});setValidation('');};
  const send=()=>{
    if(!chatInput.trim()||running)return;
    if(!contextComplete){setValidation('Add the scope and expected outcome for this conversation.');setContextOpen(true);return;}
    if(contextBusy){setValidation('Context checks are still running.');return;}
    if(contextError||contextReview?.decision!=='proceed'){setValidation(contextError||'Review the context check before sending.');return;}
    setValidation('');onAsk(chatInput);
  };
  return <section className={`sa-chat ${turns.length?'has-messages':'is-empty'}`} aria-label="Super Agent chat">
    <header className="sa-chat-header"><h1>Super Agent</h1><button disabled={running} onClick={()=>{onNewChat();setValidation('');composerRef.current?.focus();}}><Plus size={15}/>New chat</button></header>
    <div className="sa-chat-content" aria-label="Conversation">
      {!turns.length?<div className="sa-welcome"><span><Sparkles size={29} strokeWidth={1.5}/></span><h2>What would you like to explore?</h2><p>Ask a question. Bring your context. Build on what you know.</p></div>:<div className="sa-messages">{turns.map(turn=>{
        const pending=memories.filter(memory=>memory.id.startsWith(`${turn.id}-`)&&!isRecallable(memory,memories)&&memory.state!=='invalidated');
        return <article className="sa-turn" key={turn.id}><div className="sa-user-message"><p>{turn.question}</p></div><div className="sa-assistant-message"><span className="sa-assistant-mark"><Sparkles size={18}/></span><div className="sa-answer"><header><strong>Super Agent</strong><span>{turn.complete?'Sample response':'Working…'}</span></header>{turn.complete?<>
          <h2>{turn.answer.title}</h2><p>{turn.answer.summary}</p>
          {!!turn.answer.metrics.length&&<div className="sa-answer-metrics">{turn.answer.metrics.map(([value,label])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>}
          <ul className="sa-findings">{turn.answer.findings.map((finding,index)=><li key={finding}>{finding}<button onClick={()=>onCitation(turn.answer,index)} aria-label={`Inspect citation ${index+1}`}>{index+1}</button></li>)}</ul>
          {turn.answer.action&&<div className="sa-next-step"><strong>Suggested next step</strong><p>{turn.answer.action}</p></div>}
          <div className="sa-answer-sources">{turn.answer.sources.map((source,index)=><button key={source} onClick={()=>onCitation(turn.answer,index)}><FileText size={12}/>{source}</button>)}</div>
          {!!turn.recalled.length&&<details className="sa-recalled"><summary>{turn.recalled.length} memories used<ChevronDown size={12}/></summary>{turn.recalled.map(memory=><button key={memory.id} onClick={()=>onReview(memory.id)}>{memory.title}<ArrowRight size={12}/></button>)}</details>}
          {!!pending.length&&<button className="sa-review-memory" onClick={()=>onReview(pending[0]?.id)}><BookOpen size={14}/>Review {pending.length} new memories<ArrowRight size={13}/></button>}
        </>:<div className="sa-thinking" role="status"><LoaderCircle size={16} className="spin"/><span>{tick<4?'Preparing context':tick<8?'Reviewing relevant records':'Writing the response'}</span></div>}</div></div></article>;
      })}<div ref={chatEnd}/></div>}
    </div>
    <div className="sa-composer-area">
      {validation&&<div className="sa-feedback" role="alert"><Info size={14}/><span>{validation}</span>{contextComplete&&!contextBusy&&<button onClick={onContextReview}>Review checks<ArrowRight size={12}/></button>}</div>}
      <form className="sa-composer" onSubmit={event=>{event.preventDefault();send();}}>
        <label htmlFor="agent-message" className="sr-only">Message Super Agent</label><textarea ref={composerRef} id="agent-message" value={chatInput} onChange={event=>updateMessage(event.target.value)} placeholder="Message Super Agent…" maxLength={2000} rows={2} disabled={running} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();send();}}}/>
        <div className="sa-composer-tools"><div><button type="button" disabled={running} onClick={()=>setContextOpen(true)}><SlidersHorizontal size={14}/>Context{contextComplete&&<Check size={12}/>}</button><button type="button" onClick={onEvidence}><Plus size={15}/>{draft.pinnedIds.length?`${draft.pinnedIds.length} pinned`:'Knowledge'}</button></div><button className="sa-send" type="submit" aria-label="Send message" disabled={running||contextBusy||!chatInput.trim()}>{running?<LoaderCircle size={17} className="spin"/>:<ArrowUp size={19}/>}</button></div>
      </form>
      <div className="sa-composer-meta"><button onClick={onContextReview} className={contextReview?.decision==='proceed'?'ready':''}><ShieldCheck size={12}/>{contextBusy?'Checking context':contextError?'Context review unavailable':contextReview?.decision==='proceed'?'CAFE(S) checks passed':contextReview?.decision==='blocked'?'Context needs review':'CAFE(S) context review'}</button><button onClick={()=>onReview()}><BookOpen size={12}/>{approved} memories available</button></div>
      <p className="sa-disclaimer">{storageError?'Draft could not be saved in this browser.':'Sample backend · Review source references before using an answer.'}</p>
    </div>
    <dialog ref={dialogRef} className="app-dialog sa-context-dialog" aria-labelledby="chat-context-title" onCancel={()=>setContextOpen(false)} onClick={event=>{if(event.target===event.currentTarget)setContextOpen(false);}}><button className="dialog-close icon-button" aria-label="Close chat context" onClick={()=>setContextOpen(false)}><X size={19}/></button><h2 id="chat-context-title">Chat context</h2><p className="modal-description">Define the boundaries and the result you need.</p>{validation&&!contextComplete&&<p className="sa-feedback" role="alert">{validation}</p>}<form onSubmit={event=>{event.preventDefault();if(!contextComplete){setValidation('Complete each context field.');return;}setContextOpen(false);setValidation('');composerRef.current?.focus();}}><div className="pi-brief-form"><label>Scope<input value={draft.brief.region} maxLength={150} required placeholder="Project, team, topic, or region" onChange={event=>updateContext('region',event.target.value)}/></label><label>Timeframe<input value={draft.brief.period} maxLength={150} required placeholder="Date range or not time-bound" onChange={event=>updateContext('period',event.target.value)}/></label><label className="pi-full">Focus<input value={draft.brief.metric} maxLength={300} required placeholder="Information or criteria that matter" onChange={event=>updateContext('metric',event.target.value)}/></label><label className="pi-full">Expected outcome<textarea rows={2} value={draft.brief.deliverable} maxLength={1000} required placeholder="What should a useful response include?" onChange={event=>updateContext('deliverable',event.target.value)}/></label></div><div className="sa-context-footer"><button type="button" className="pi-text-button" onClick={()=>{setContextOpen(false);onSources();}}>Manage sources<ArrowRight size={13}/></button><button className="pi-primary" type="submit">Save context</button></div></form></dialog>
  </section>;
}
