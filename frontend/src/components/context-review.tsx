import {ArrowRight,Check,ChevronDown,ClipboardCheck,Info,ShieldCheck} from 'lucide-react';
import type {ContextCheck} from '@/lib/investigation';

export default function ContextReviewPanel({checks,live=false,decision,onEdit,onEvidence,manifestId,busy=false,error='',onInspect}:{busy?:boolean;error?:string;onInspect?:()=>void;checks:ContextCheck[];live?:boolean;decision?:string;onEdit:()=>void;onEvidence:()=>void;manifestId?:string}) {
  const pending=checks.filter(check=>check.result==='unknown').length;
  return <section className="pi-context panel" aria-label="Context review">
    <header><span className="pi-icon"><ClipboardCheck size={20}/></span><div><h2>Context review</h2><p>Is the agent ready for this task?</p></div><span className="pi-tag">{busy?'Checking':live?'Backend report':'Preview'}</span></header>
    <div className="pi-context-status"><span className="pi-status-dot"/><strong>{busy?'Checking this context':live?decision==='blocked'?'Action blocked':decision==='needs_input'?'Your input is needed':'Reviewed demo context':checks.some(check=>check.result==='fail')?'Brief needs attention':'Brief prepared'}</strong><p>{busy?'Waiting for the backend assessment.':live?'Review the evidence behind each check.':`${checks.filter(check=>check.result==='pass').length} brief checks passed · ${pending} checks pending`}</p></div>
    {error&&<p className="nf-review-error" role="alert">{error}</p>}
    <div className="pi-checks">{checks.map(check=><details key={check.dimension} className={`pi-check ${check.result}`}><summary><span className="pi-check-icon">{check.result==='pass'?<Check size={13}/>:check.result==='fail'?<Info size={13}/>:<span/>}</span><strong>{check.dimension}</strong><span>{check.result==='pass'?(live?'Passed':'Specified'):check.result==='fail'?'Needs attention':check.result==='not_applicable'?'Not applicable':'Not checked'}</span><ChevronDown size={12}/></summary><p>{check.summary}</p>{live&&check.method&&<small>Assessment: {check.method}</small>}{live&&!!check.evidenceRefs?.length&&<p>Evidence: {check.evidenceRefs?.join(' · ')}</p>}{check.required&&<small>Required by backend policy</small>}{check.remedy&&<button onClick={onEdit}>{check.remedy}<ArrowRight size={12}/></button>}</details>)}</div>
    <div className="pi-context-foot"><ShieldCheck size={15}/><p>{live?'Live local-demo checks. Passed results apply only to the stated demo rules and evidence.':'Preview checks describe your brief. Live source, memory, and access verification is not connected.'}</p></div>
    {onInspect&&<button className="pi-text-button nf-inspect-checks" onClick={onInspect}>Open CAFE(S) review <ArrowRight size={14}/></button>}
    <button className="pi-text-button" onClick={onEvidence}>Inspect available evidence <ArrowRight size={14}/></button>
    {manifestId&&<p className="pi-manifest">Context manifest · {manifestId}</p>}
  </section>;
}
