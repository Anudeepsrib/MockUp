import {ArrowRight,ClipboardCheck} from 'lucide-react';
import type {ContextCheck} from '@/lib/investigation';

export default function ContextReviewPanel({checks,live=false,decision,onEdit,busy=false,error='',onInspect}:{busy?:boolean;error?:string;onInspect:()=>void;checks:ContextCheck[];live?:boolean;decision?:string;onEdit:()=>void}){
  return <section className="pi-context panel" aria-label="Context review">
    <header><span className="pi-icon"><ClipboardCheck size={18}/></span><h2>Context</h2></header>
    <div className={`pi-context-status ${live&&decision==='proceed'?'ready':''}`} aria-live="polite"><span className="pi-status-dot"/><strong>{busy?'Checking context':error?'Review unavailable':live?decision==='blocked'?'Needs review':decision==='needs_input'?'Complete task context':'Ready to run':'Not reviewed'}</strong><p>{busy?'Reviewing the current task.':live&&decision==='proceed'?`${checks.filter(check=>check.result==='pass').length} checks passed`:'Define your task and review the required context.'}</p></div>
    {error&&<p className="nf-review-error" role="alert">{error}</p>}
    {live&&decision==='needs_input'&&<button className="pi-text-button context-edit" onClick={onEdit}>Add task context<ArrowRight size={14}/></button>}
    <button className="pi-text-button context-inspect" onClick={onInspect}>View context quality<ArrowRight size={14}/></button>
  </section>;
}
