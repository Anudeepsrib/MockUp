import type {Memory,Source,Topic} from './demo';
import type {BankTemplate,BankWorkspace} from './compounding';

// These are the view models the design consumes; normalize provider-specific data in an adapter.
export type Answer={title:string;summary:string;metrics:string[][];findings:string[];action:string;sources:string[]};
export type AgentRun={id:number;question:string;topic:Topic;answer:Answer;recalled:Memory[];complete:boolean;tick:number;memories?:Memory[]};
export type StudioState={connections:string[];files:string[];mcpServers:Source[];memories:Memory[];bank:BankWorkspace;revision:number};
export type Bootstrap={sources:Source[];initialConnections:string[];prompts:string[];answers:Record<Topic,Answer>;agentSteps:{at:number;name:string;verb:string;detail:string;icon:string}[];presets:{name:string;description:string;template:BankTemplate}[];knowledgeRecords:Memory[];schemaNodes:{id:string;label:string;sub:string;x:number;y:number;type:string;source:string;fields:string[];color:string}[];evaluations:{passed:number;total:number;metrics:{name:string;score:number}[];reviewQuestion:string;reviewReason:string};testAnswer:string;readinessScore:number;knowledgeSummary:{sourceCollections:number;vectorEmbeddings:number};profile:{name:string;initials:string;role:string};state:StudioState};

/** One backend implementation per studio. Methods return canonical state after a write. */
export interface StudioApi {
  bootstrap():Promise<Bootstrap>;
  saveContext(context:Pick<StudioState,'connections'|'files'|'mcpServers'>):Promise<StudioState>;
  saveMemories(memories:Memory[]):Promise<StudioState>;
  saveBank(bank:BankWorkspace):Promise<StudioState>;
  startRun(question:string):Promise<AgentRun>;
  pollRun(id:number):Promise<AgentRun>;
  query(question:string):Promise<{answer:string}>;
  evaluate():Promise<Bootstrap['evaluations']>;
  reset():Promise<StudioState>;
}
