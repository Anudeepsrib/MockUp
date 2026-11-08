import {ArrowRight} from 'lucide-react';

const steps=[['Context Layer','Give the agent the right starting point'],['Knowledge Layer','Connect the supporting evidence'],['Super Agent','Turn evidence into a decision'],['Memory','Carry reviewed knowledge forward']];

export default function JourneyFlow({current,onGo}:{current:number;onGo:(stage:number)=>void}) {
  return <nav className="nf-journey" aria-label="Intelligence journey">{steps.map(([title,description],index)=><div key={title}><button className={current===index?'active':''} aria-current={current===index?'step':undefined} onClick={()=>onGo(index)}><span className="nf-step-number">0{index+1}</span><span><strong>{title}</strong><small>{description}</small></span></button>{index<3&&<ArrowRight size={14}/>}</div>)}</nav>;
}
