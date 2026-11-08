export const INVESTIGATION_KEY = 'super-agent-investigation-v1';

export type TaskBrief = {objective:string;region:string;period:string;metric:string;deliverable:string};
export type ActionDraft = {description:string;owner:string;due:string;measure:string;target:string;status:'Draft'|'In progress'|'Completed';outcome:string};
export type InvestigationDraft = {brief:TaskBrief;pinnedIds:string[];action:ActionDraft;lastRunId?:number;runBrief?:TaskBrief};
export type ContextCheck = {dimension:'Clarity'|'Actionability'|'Fidelity'|'Efficiency'|'Security';result:'pass'|'fail'|'unknown'|'not_applicable';required:boolean;summary:string;remedy?:string;method?:'deterministic'|'heuristic'|'human';evidenceRefs?:string[]};
export type CafeScenario = 'ready'|'missing_scope'|'stale_evidence'|'noisy_context'|'unsafe_context'|'draft_memory';
export type ContextReviewRequest = {brief:TaskBrief;pinnedIds:string[];scenario:CafeScenario};
export type ContextItem = {id:string;title:string;source:string;content:string;kind:string;version:string;expectedVersion:string;status:'included'|'excluded';reason:string};
export type ContextReview = {decision:'proceed'|'needs_input'|'blocked';checks:ContextCheck[];manifestId?:string;checkedAt?:string;mode?:'local_demo';scenario?:CafeScenario;evaluatedBrief?:TaskBrief;workspaceRevision?:number;items?:ContextItem[];metrics?:{candidates:number;included:number;excluded:number;memories:number;estimatedTokens:number;tokenBudget:number};limitations?:string[]};

export function emptyInvestigation():InvestigationDraft {
  return {brief:{objective:'What’s driving customer churn in the Northeast?',region:'Northeast',period:'Demo dataset coverage',metric:'Customer churn rate',deliverable:'Explain the evidence and propose a service recovery pilot.'},pinnedIds:[],action:{description:'',owner:'',due:'',measure:'',target:'',status:'Draft',outcome:''}};
}

const briefKeys = ['objective','region','period','metric','deliverable'] as const;
function isBrief(value:unknown):value is TaskBrief {
  return !!value&&typeof value==='object'&&briefKeys.every(key=>typeof (value as TaskBrief)[key]==='string'&&(value as TaskBrief)[key].length<=4000);
}

export function readInvestigation(raw:string|null):InvestigationDraft {
  try {
    const value=JSON.parse(raw||'null');
    if(!value||!isBrief(value.brief)||!Array.isArray(value.pinnedIds)||value.pinnedIds.length>200||!value.pinnedIds.every((id:unknown)=>typeof id==='string'&&id.length<=250))return emptyInvestigation();
    const action=value.action;
    if(!action||!['description','owner','due','measure','target','outcome'].every(key=>typeof action[key]==='string'&&action[key].length<=4000)||!['Draft','In progress','Completed'].includes(action.status))return emptyInvestigation();
    return {brief:value.brief,pinnedIds:[...new Set<string>(value.pinnedIds)],action,lastRunId:Number.isSafeInteger(value.lastRunId)&&value.lastRunId>0?value.lastRunId:undefined,runBrief:isBrief(value.runBrief)?value.runBrief:undefined};
  } catch {return emptyInvestigation();}
}

export function scopedQuestion(brief:TaskBrief):string {
  return `${brief.objective.trim()}\n\nInvestigation scope\nRegion: ${brief.region.trim()}\nPeriod: ${brief.period.trim()}\nMetric: ${brief.metric.trim()}\nExpected outcome: ${brief.deliverable.trim()}`;
}

export function sameBrief(a:TaskBrief,b:TaskBrief):boolean {
  return briefKeys.every(key=>a[key].trim()===b[key].trim());
}

// Preview findings describe entered fields, never backend evidence quality or authorization.
export function previewChecks(brief:TaskBrief):ContextCheck[] {
  const scoped=[brief.objective,brief.region,brief.period,brief.metric].every(value=>value.trim());
  return [
    {dimension:'Clarity',result:scoped?'pass':'fail',required:false,summary:scoped?'Question, region, period, and metric are specified.':'Complete the question, region, period, and metric.',remedy:scoped?undefined:'Edit task brief'},
    {dimension:'Actionability',result:brief.deliverable.trim()?'pass':'fail',required:false,summary:brief.deliverable.trim()?'The expected outcome is defined.':'Describe the result you need.',remedy:brief.deliverable.trim()?undefined:'Define the outcome'},
    {dimension:'Fidelity',result:'unknown',required:false,summary:'Source freshness, coverage, and contradictions await backend checks.'},
    {dimension:'Efficiency',result:'unknown',required:false,summary:'Context selection and token use await backend checks.'},
    {dimension:'Security',result:'unknown',required:false,summary:'Source and memory permissions await backend enforcement.'},
  ];
}
