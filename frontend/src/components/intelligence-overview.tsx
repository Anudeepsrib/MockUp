import {ArrowRight,ArrowUpRight,CheckCheck,Clock,Network} from 'lucide-react';
import type {Memory} from '@/lib/demo';
import {factType,isRecallable,memoryPurpose,summarizeMemories} from '@/lib/memory';
import MemoryGraph from './memory-graph';
import './intelligence-overview.css';

export type IntelligenceOverviewProps={
  memories:Memory[];
  onInspect:(memory:Memory)=>void;
  onBrowse:()=>void;
  onGraph:()=>void;
  onAsk?:(question:string)=>void;
};

// The host owns navigation and persistence; this view describes only the records it receives.
export default function IntelligenceOverview({memories,onInspect,onBrowse,onGraph,onAsk}:IntelligenceOverviewProps) {
  const summary=summarizeMemories(memories);
  const question=summary.takeaways.find(memory=>memory.question?.trim())?.question;
  return <section className="ci-overview" aria-label="Your compounding intelligence">
    <dl className="ci-outcomes">
      <div><dt>Ready to reuse</dt><dd>{summary.readyCount}</dd><small>Approved, with valid evidence</small></div>
      <div><dt>Needs your review</dt><dd>{summary.reviewCount}</dd><small>Held back from future answers</small></div>
      <div><dt>Reusable patterns</dt><dd>{summary.patternCount}</dd><small>Insights linked to approved facts</small></div>
      <div><dt>Knowledge sources</dt><dd>{summary.sourceCount}</dd><small>Trace every fact to its origin</small></div>
    </dl>
    <div className="ci-review-next">
      <span className={summary.reviewNext?'needs-review':''}>{summary.reviewNext?<Clock size={17}/>:<CheckCheck size={17}/>}</span>
      <div><h2>{summary.reviewNext?'Your next review':summary.readyCount?'Your knowledge is ready':'Start building useful context'}</h2><p>{summary.reviewNext?<><strong>{summary.reviewNext.title}</strong> · Check the evidence and decide what the agent can keep.</>:summary.readyCount?'Approved knowledge is available as context when relevant to a question.':'Ask the agent a question to start building knowledge you can review.'}</p></div>
      {summary.reviewNext&&<button onClick={()=>onInspect(summary.reviewNext!)}>Review memory <ArrowRight size={14}/></button>}
    </div>
    <div className="ci-overview-body">
      <section className="ci-takeaways" aria-labelledby="ci-learned-heading">
        <div className="ci-section-title"><h2 id="ci-learned-heading">What the agent learned</h2><button onClick={onBrowse}>View all <ArrowUpRight size={13}/></button></div>
        <p className="ci-section-intro">Recent knowledge, its evidence, and how it can help next time.</p>
        {summary.takeaways.map(memory=>{
          const ready=isRecallable(memory,memories);
          return <article key={memory.id}>
            <div className="ci-takeaway-meta"><span>{factType(memory)==='observation'?'Pattern':factType(memory)==='experience'?'Conversation note':'Fact'}</span><span className={ready?'ready':''}>{ready?<CheckCheck size={11}/>:<Clock size={11}/>} {ready?'Ready to reuse':'Needs review'}</span></div>
            <h3>{memory.title}</h3><p className="ci-takeaway-text">{memory.content}</p>
            <p className="ci-takeaway-purpose">{!ready&&'After approval: '}{memoryPurpose(memory)}</p>
            <div className="ci-takeaway-source"><span title={memory.source}>{memory.source}</span><button onClick={()=>onInspect(memory)}>{ready?'View evidence':'Review memory'} <ArrowUpRight size={12}/></button></div>
          </article>;
        })}
        {!summary.takeaways.length&&<p className="ci-overview-empty">Facts and patterns will appear here after your first conversation.</p>}
        {onAsk&&question&&<div className="ci-continue"><h3>Put this knowledge to work</h3><p>{question}</p><button onClick={()=>onAsk(question)}>Ask a related question <ArrowRight size={13}/></button></div>}
      </section>
      <section className="ci-overview-graph" aria-label="Explore connected knowledge">
        <div className="ci-section-title"><h2><Network size={16}/> How knowledge connects</h2><button onClick={onGraph}>Expand graph <ArrowUpRight size={13}/></button></div>
        <p className="ci-section-intro">Move the canvas, select a memory, and follow its connections.</p>
        <MemoryGraph memories={memories} onInspect={onInspect}/>
      </section>
    </div>
  </section>;
}
