import {useEffect,useRef,useState} from 'react';
import {Check,ChevronDown,Info,LoaderCircle,Minus,Send} from 'lucide-react';
import {api} from '@/lib/api';
import type {QueryResult} from '@/lib/contracts';

export default function ContextQuestion({contextKey,hasSources}:{contextKey:string;hasSources:boolean}){
  const [question,setQuestion]=useState(''),[result,setResult]=useState<QueryResult>(),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const requestId=useRef(0);
  useEffect(()=>{requestId.current++;setResult(undefined);setError('');setBusy(false);return()=>{requestId.current++;};},[contextKey]);
  const ask=async()=>{
    if(busy||!hasSources||!question.trim())return;
    const current=++requestId.current;setBusy(true);setError('');setResult(undefined);
    try{const response=await api.query(question.trim());if(current===requestId.current)setResult(response);}
    catch(error){if(current===requestId.current)setError(error instanceof Error?error.message:'Could not run this question.');}
    finally{if(current===requestId.current)setBusy(false);}
  };
  return <aside className="panel context-question" aria-label="Try a question">
    <div className="section-heading"><div><h2>Try a question</h2><p>Preview an answer and check the available context.</p></div></div>
    <form onSubmit={event=>{event.preventDefault();void ask();}}><label htmlFor="context-question">Question</label><textarea id="context-question" rows={3} maxLength={4000} value={question} onChange={event=>{setQuestion(event.target.value);setResult(undefined);setError('');}} placeholder="Ask about your sources or data…" disabled={busy}/><button className="pi-primary" type="submit" disabled={busy||!hasSources||!question.trim()}>{busy?<LoaderCircle size={14} className="spin"/>:<Send size={13}/>} {busy?'Running…':'Ask & evaluate'}</button>{!hasSources&&<p className="cq-hint">Configure a source to try a question.</p>}</form>
    {error&&<p className="cq-error" role="alert"><Info size={14}/>{error}</p>}
    {result&&<div className="cq-results" aria-live="polite"><section className="cq-answer" aria-label="Question answer"><header><h3>Answer</h3><span className="pi-tag">Sample response</span></header><p>{result.answer}</p></section><section className="cq-evaluation" aria-label="Question evaluation"><header><h3>Evaluation</h3><span className="pi-tag">Local checks</span></header>{result.evaluation?<>{result.evaluation.checks.map(check=><div className={`cq-check ${check.result}`} key={check.name}><span>{check.result==='pass'?<Check size={14}/>:check.result==='not_applicable'?<Minus size={14}/>:<Info size={14}/>}</span><div><header><strong>{check.name}</strong><small>{check.result==='pass'?'Passed':check.result==='fail'?'Needs review':check.result==='not_applicable'?'Not applicable':'Not verified'}</small></header><p>{check.summary}</p></div></div>)}{!!result.evaluation.matchedRecords.length&&<details className="cq-matches"><summary>{result.evaluation.matchedRecords.length} matching records<ChevronDown size={12}/></summary><ul>{result.evaluation.matchedRecords.map(record=><li key={record.id}><strong>{record.title}</strong><span>{record.source}</span></li>)}</ul></details>}</>:<p className="cq-hint">This backend did not return an evaluation for this question.</p>}</section></div>}
    {!result&&!busy&&!error&&<p className="cq-footnote">Sample backend. Evaluation results apply only to the checks shown.</p>}
  </aside>;
}
