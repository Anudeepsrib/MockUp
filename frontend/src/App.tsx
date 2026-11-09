import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Brain,Cable,Check,ChevronRight,CircleHelp,Database,FileText,Folder,Layers,Network,Plus,RotateCcw,Search,ShieldCheck,Snowflake,Sparkles,Upload,Workflow,X,Cloud,Box,ChartNoAxesCombined} from 'lucide-react';
import CompoundingConsole from '@/components/compounding-console';
import InvestigationWorkspace from '@/components/investigation-workspace';
import EvidenceExplorer from '@/components/evidence-explorer';
import ContextQuality from '@/components/context-quality';
import ContextQuestion from '@/components/context-question';
import McpForm from '@/components/mcp-form';
import {INVESTIGATION_KEY,emptyInvestigation,readInvestigation,type InvestigationDraft,type ContextReview} from '@/lib/investigation';
import {api,getBootstrap,type AgentRun,type Answer} from '@/lib/api';
import {memoryCorpus} from '@/lib/compounding';
import {sources,type Source,type Memory} from '@/lib/demo';

const icons:Record<string,typeof Database>={upload:Upload,database:Database,layers:Layers,snow:Snowflake,share:Workflow,cloud:Cloud,folder:Folder,file:FileText,box:Box,workflow:Workflow,sparkles:Sparkles,network:Network,brain:Brain,chart:ChartNoAxesCombined,check:Check};
const pages=[{name:'Context Layer',icon:Cable},{name:'Knowledge Layer',icon:Network},{name:'Super Agent',icon:Sparkles},{name:'Memory',icon:Brain},{name:'Context quality',icon:ShieldCheck}];
const knowledgeRecords=memoryCorpus();
function SourceLogo({source}:{source:Source}){const Icon=icons[source.kind]||Database;return <span className="source-logo" style={{color:source.color}}><Icon size={21}/></span>;}

export default function Home(){
  const bootstrap=getBootstrap();
  const [stage,setStage]=useState(2),[connections,setConnections]=useState(bootstrap.state.connections),[memories,setMemories]=useState<Memory[]>(bootstrap.state.memories),[turns,setTurns]=useState<AgentRun[]>([]);
  const [draft,setDraft]=useState<InvestigationDraft>(()=>{try{return readInvestigation(localStorage.getItem(INVESTIGATION_KEY));}catch{return emptyInvestigation();}});
  const initialRunId=useRef(draft.lastRunId);
  const [storageError,setStorageError]=useState(false),[reviewMemoryId,setReviewMemoryId]=useState<string>();
  const [reviewNonce,setReviewNonce]=useState(0),[reviewState,setReviewState]=useState<{key:string;report?:ContextReview;busy:boolean;error:string}>({key:'',busy:true,error:''});
  const reviewKey=JSON.stringify([draft.brief,draft.pinnedIds,connections,memories.map(memory=>[memory.id,memory.confirmed,memory.state,memory.editedAt,memory.sourceFactIds])]);
  const liveReview=reviewState.key===reviewKey?reviewState.report:undefined;
  const contextBusy=reviewState.key!==reviewKey||reviewState.busy;
  const contextError=reviewState.key===reviewKey?reviewState.error:'';
  const [modal,setModal]=useState<string|null>(null),[sourceRecord,setSourceRecord]=useState<Memory>(),[citation,setCitation]=useState<{source:string;evidence:string}|null>(null);
  const [search,setSearch]=useState(''),[filter,setFilter]=useState('All sources'),[toast,setToast]=useState('');
  const [chatInput,setChatInput]=useState(()=>draft.lastRunId?'':draft.brief.objective),[running,setRunning]=useState(false),[starting,setStarting]=useState(false),[tick,setTick]=useState(0);
  const [mcpServers,setMcpServers]=useState<Source[]>(bootstrap.state.mcpServers),[files,setFiles]=useState<string[]>(bootstrap.state.files);
  const fileRef=useRef<HTMLInputElement>(null),dialogRef=useRef<HTMLDialogElement>(null);
  const allSources=[...sources,...mcpServers],configured=allSources.filter(source=>connections.includes(source.id));
  const selectedSource=allSources.find(source=>source.id===modal);
  const notify=(message:string)=>setToast(message);
  const go=(next:number)=>{setStage(next);window.scrollTo({top:0,behavior:'instant'});};

  useEffect(()=>{try{localStorage.setItem(INVESTIGATION_KEY,JSON.stringify(draft));setStorageError(false);}catch{setStorageError(true);}},[draft]);
  useEffect(()=>{
    let current=true;setReviewState({key:reviewKey,busy:true,error:''});
    const timer=setTimeout(()=>{void api.reviewContext({brief:draft.brief,pinnedIds:draft.pinnedIds,scenario:'ready'}).then(report=>{if(current)setReviewState({key:reviewKey,report,busy:false,error:''});}).catch(error=>{if(current)setReviewState({key:reviewKey,busy:false,error:error instanceof Error?error.message:'Context review is unavailable.'});});},250);
    return()=>{current=false;clearTimeout(timer);};
  },[reviewKey,reviewNonce]);
  const contextSnapshot=useRef(JSON.stringify({connections,files,mcpServers}));
  useEffect(()=>{const next=JSON.stringify({connections,files,mcpServers});if(next===contextSnapshot.current)return;contextSnapshot.current=next;void api.saveContext({connections,files,mcpServers}).catch(error=>notify(error.message));},[connections,files,mcpServers]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(timer);},[toast]);
  useEffect(()=>{if(modal)dialogRef.current?.showModal();else dialogRef.current?.close();},[modal]);
  const activeRunId=turns.at(-1)?.id;
  useEffect(()=>{
    if(!running||!activeRunId)return;let cancelled=false,pending=false;
    const poll=async()=>{if(pending)return;pending=true;try{const run=await api.pollRun(activeRunId);if(cancelled)return;setTick(run.tick);setTurns(previous=>previous.map(turn=>turn.id===run.id?run:turn));if(run.complete){setRunning(false);if(run.memories)setMemories(run.memories);}}catch(error){if(!cancelled){setRunning(false);notify(error instanceof Error?error.message:'Could not read this run.');}}finally{pending=false;}};
    void poll();const timer=setInterval(poll,500);return()=>{cancelled=true;clearInterval(timer);};
  },[running,activeRunId]);
  useEffect(()=>{if(!draft.lastRunId||draft.lastRunId!==initialRunId.current)return;let abandoned=false;void api.pollRun(draft.lastRunId).then(run=>{if(abandoned)return;setTurns([run]);setTick(run.tick);setRunning(!run.complete);if(run.memories)setMemories(run.memories);}).catch(()=>{if(!abandoned){setChatInput(previous=>previous||draft.brief.objective);notify('The previous run is unavailable. Your draft is still saved.');}});return()=>{abandoned=true;};},[draft.lastRunId]);

  const connect=(id:string)=>{if(!connections.includes(id)){setConnections(previous=>[...previous,id]);notify('Source configuration saved.');}setModal(null);};
  // shortcut: this adapter stores file names only; add byte upload APIs when connecting the private backend.
  const addFiles=(incoming:FileList|null)=>{if(!incoming)return;const accepted=Array.from(incoming).filter(file=>file.size<=25*1024*1024);if(accepted.length){setFiles(previous=>[...new Set([...previous,...accepted.map(file=>file.name)])]);setConnections(previous=>previous.includes('local')?previous:[...previous,'local']);notify('File names saved. Content ingestion is unavailable in this sample workspace.');}if(accepted.length<incoming.length)notify('Files larger than 25 MB were skipped.');if(fileRef.current)fileRef.current.value='';};
  const ask=async(question:string)=>{
    if(running||starting||!question.trim())return;
    if(contextBusy||!liveReview){notify(contextError||'Context review is still running.');return;}
    if(liveReview.decision!=='proceed'){notify('Review the task context before running.');go(4);return;}
    if(!connections.length){notify('Add a source before running.');go(0);return;}
    const runBrief={...draft.brief,objective:question.trim()};setDraft(previous=>({...previous,brief:runBrief}));setStarting(true);setTick(0);setChatInput('');
    try{const run=await api.startRun(runBrief.objective,{brief:runBrief,pinnedIds:draft.pinnedIds,scenario:'ready'});setDraft(previous=>({...previous,lastRunId:run.id,runBrief}));setTurns(previous=>[...previous,run]);setRunning(!run.complete);}catch(error){setChatInput(previous=>previous||runBrief.objective);notify(error instanceof Error?error.message:'Could not start this task.');go(4);}finally{setStarting(false);}
  };
  const resetWorkspace=async()=>{try{const state=await api.reset();contextSnapshot.current=JSON.stringify({connections:state.connections,files:state.files,mcpServers:state.mcpServers});setConnections(state.connections);setMcpServers(state.mcpServers);setFiles(state.files);setMemories(state.memories);setDraft(emptyInvestigation());setReviewMemoryId(undefined);setRunning(false);setTurns([]);setTick(0);setModal(null);go(2);notify('Workspace reset.');}catch(error){notify(error instanceof Error?error.message:'Could not reset this workspace.');}};
  const reviewKnowledge=(id?:string)=>{setReviewMemoryId(id);go(3);};
  const openCitation=(answer:Answer,index:number)=>{setCitation({source:answer.sources[index]||'Source evidence',evidence:answer.findings[index]||answer.summary});setModal('citation');};

  return <div className="app-shell product-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={event=>{event.preventDefault();go(2);}} aria-label="Super Agent Insights home"><span className="brand-symbol"><Sparkles size={22}/></span><strong>Super Agent<span>Insights</span></strong></a>
      <div className="workspace-selector"><span className="workspace-avatar"><Layers size={17}/></span><div><strong>Workspace</strong><small>Sources, tasks & knowledge</small></div></div>
      <nav className="side-nav" aria-label="Workspace pages">{pages.slice(0,4).map((page,index)=>{const Icon=page.icon;return <button key={page.name} className={stage===index?'active':''} aria-current={stage===index?'page':undefined} onClick={()=>go(index)}><Icon size={18}/>{page.name}</button>;})}</nav>
      <div className="quality-nav"><button className={stage===4?'active':''} aria-current={stage===4?'page':undefined} onClick={()=>go(4)}><ShieldCheck size={18}/><span>Context quality</span><span className={`quality-dot ${liveReview?.decision==='proceed'?'ready':''}`}/></button></div>
      <div className="sidebar-bottom"><button className="sidebar-link" onClick={()=>setModal('guide')}><CircleHelp size={17}/>Help & workspace info</button><span className="sample-label">Sample workspace</span></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumbs"><span>Super Agent Insights</span><ChevronRight size={14}/><strong>{pages[stage].name}</strong></div><label className="mobile-page-switch"><span className="sr-only">Switch page</span><select aria-label="Switch page" value={stage} onChange={event=>go(Number(event.target.value))}>{pages.map((page,index)=><option key={page.name} value={index}>{page.name}</option>)}</select></label><div className="topbar-right"><span className="pi-tag">Sample data</span><button className="icon-button" aria-label="Help & workspace info" onClick={()=>setModal('guide')}><CircleHelp size={18}/></button></div></header>
      <main className={`page-content stage-${stage}`}>
        {stage===0&&<>
          <div className="pi-page-heading"><div><h1>Context Layer</h1><p>Manage the sources and tools available to your agent.</p></div><button className="pi-primary" onClick={()=>{setSearch('');setFilter('All sources');setModal('sources');}}><Plus size={16}/>Add source</button></div>
          <div className="context-layer-layout"><div className="context-layer-main">
          <section className="panel source-panel"><div className="section-heading"><div><h2>Sources <span className="count-tag">{configured.filter(source=>source.category!=='MCP').length}</span></h2><p>Your configured data connections and files.</p></div></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Name</th><th>Type</th><th>Status</th><th/></tr></thead><tbody>{configured.filter(source=>source.category!=='MCP').map(source=><tr key={source.id}><td><span className="table-source"><SourceLogo source={source}/><span><strong>{source.name}</strong><small>{source.detail}</small></span></span></td><td>{source.category}</td><td><span className="config-status"><i/>Configured</span></td><td><button className="pi-secondary" aria-label={`Manage ${source.name}`} onClick={()=>setModal(source.id)}>Manage</button></td></tr>)}{!configured.some(source=>source.category!=='MCP')&&<tr><td colSpan={4}><div className="pi-empty"><Database size={25}/><h2>Add your first source</h2><p>Choose a data connection or register files to use as context.</p><button className="pi-secondary" onClick={()=>setModal('sources')}>Add source</button></div></td></tr>}</tbody></table></div><div className="source-note"><FileText size={14}/><span>Source configurations are saved. Live ingestion is not connected in this sample workspace.</span></div></section>
          <section className="panel source-panel"><div className="section-heading"><div><h2>Tools</h2><p>Add capabilities through an MCP server.</p></div><button className="pi-secondary" onClick={()=>setModal('mcp')}><Plus size={15}/>Add MCP server</button></div><div className="tool-list">{configured.filter(source=>source.category==='MCP').map(source=><button key={source.id} onClick={()=>setModal(source.id)}><SourceLogo source={source}/><span><strong>{source.name}</strong><small>{source.detail}</small></span><ChevronRight size={16}/></button>)}{!configured.some(source=>source.category==='MCP')&&<p className="tool-empty">No tools configured. Add a server when your task needs external tools.</p>}</div></section>
          </div><ContextQuestion hasSources={connections.length>0} contextKey={JSON.stringify({connections,files,mcpServers})}/></div>
        </>}
        {stage===1&&<EvidenceExplorer records={knowledgeRecords} pinnedIds={draft.pinnedIds} onPins={pinnedIds=>setDraft(previous=>({...previous,pinnedIds}))} onAsk={question=>{setChatInput(question);setDraft(previous=>({...previous,brief:{...previous.brief,objective:question}}));go(2);}} onSource={memory=>{setSourceRecord(memory);setModal('record-source');}}/>}
        {stage===2&&<InvestigationWorkspace draft={draft} onChange={setDraft} turns={turns} memories={memories} running={running||starting} tick={tick} onAsk={ask} onNewChat={()=>{setTurns([]);setChatInput('');setTick(0);setDraft(previous=>({...previous,lastRunId:undefined,runBrief:undefined,brief:{...previous.brief,objective:''}}));}} onEvidence={()=>go(1)} onSources={()=>go(0)} onReview={reviewKnowledge} onCitation={openCitation} chatInput={chatInput} setChatInput={setChatInput} storageError={storageError} contextReview={liveReview} contextBusy={contextBusy} contextError={contextError} onContextReview={()=>go(4)}/>}
        {stage===3&&<CompoundingConsole embedded initialMemoryId={reviewMemoryId} records={memories} onMemoriesChange={setMemories} onAsk={question=>{const message=question.split('\n\nInvestigation scope\n')[0];setChatInput(message);setDraft(previous=>({...previous,brief:{...previous.brief,objective:message}}));go(2);}}/>}
        {stage===4&&<ContextQuality report={liveReview} busy={contextBusy} error={contextError} onRefresh={()=>setReviewNonce(value=>value+1)} onGo={go}/>}
      </main>
    </div>
    <input ref={fileRef} type="file" hidden multiple aria-label="Register local files" onChange={event=>addFiles(event.target.files)}/>
    <dialog ref={dialogRef} className="app-dialog" onCancel={()=>setModal(null)} onClick={event=>{if(event.target===event.currentTarget)setModal(null);}} aria-labelledby="dialog-title">
      <button className="dialog-close icon-button" onClick={()=>setModal(null)} aria-label="Close dialog"><X size={20}/></button>
      {modal==='mcp'?<McpForm onAdd={source=>{setMcpServers(previous=>[...previous,source]);setConnections(previous=>[...previous,source.id]);setModal(null);notify('MCP server configuration saved.');}}/>:modal==='sources'?<>
        <h2 id="dialog-title">Add a source</h2><p className="modal-description">Choose the data you want available in your workspace.</p><div className="connector-search"><Search size={17}/><input autoFocus placeholder="Search sources" aria-label="Search sources" value={search} onChange={event=>setSearch(event.target.value)}/></div><div className="filter-row">{['All sources','Structured','Unstructured','Files','MCP'].map(value=><button className={filter===value?'active':''} onClick={()=>setFilter(value)} key={value}>{value}</button>)}</div><div className="source-catalog">{allSources.filter(source=>(filter==='All sources'||source.category===filter)&&`${source.name} ${source.detail}`.toLowerCase().includes(search.toLowerCase())).map(source=><div key={source.id}><SourceLogo source={source}/><span><strong>{source.name}</strong><small>{source.detail}</small></span><button onClick={()=>setModal(source.id)}>{connections.includes(source.id)?'Manage':'Configure'}<ChevronRight size={13}/></button></div>)}{!allSources.some(source=>(filter==='All sources'||source.category===filter)&&`${source.name} ${source.detail}`.toLowerCase().includes(search.toLowerCase()))&&<p className="catalog-empty">No sources match your search.</p>}</div>
      </>:selectedSource?<>
        <SourceLogo source={selectedSource}/><h2 id="dialog-title">{selectedSource.name}</h2><p className="modal-description">{selectedSource.detail}</p><div className="connector-detail"><strong>{connections.includes(selectedSource.id)?'Configured':'Not configured'}</strong><p>{selectedSource.endpoint||'This sample workspace saves connection selections. Authentication and live ingestion require your backend connector.'}</p></div>{selectedSource.id==='local'&&<div className="uploaded-list"><h3>Registered files</h3>{files.length?files.map(file=><p key={file}><FileText size={14}/>{file}</p>):<p>No registered files.</p>}<button className="pi-secondary" onClick={()=>fileRef.current?.click()}><Upload size={15}/>Register files</button><small>File names only. File contents are not uploaded.</small></div>}<div className="dialog-actions"><button className="pi-secondary" onClick={()=>setModal(null)}>Cancel</button>{connections.includes(selectedSource.id)?<button className="pi-secondary" onClick={()=>{setConnections(previous=>previous.filter(id=>id!==selectedSource.id));setModal(null);notify('Source disconnected.');}}>Disconnect source</button>:<button className="pi-primary" onClick={()=>connect(selectedSource.id)}>Save configuration</button>}</div>
      </>:modal==='record-source'&&sourceRecord?<>
        <h2 id="dialog-title">{sourceRecord.source}</h2><p className="modal-description">Source reference for the selected record.</p><div className="source-evidence"><strong>{sourceRecord.title}</strong><p>{sourceRecord.content}</p></div><p className="dialog-footnote">The original document is not available through the current backend.</p>
      </>:modal==='citation'&&citation?<>
        <h2 id="dialog-title">{citation.source}</h2><p className="modal-description">Source reference</p><div className="source-evidence"><p>{citation.evidence}</p></div><p className="dialog-footnote">This sample response includes an evidence summary. The original passage has not been verified.</p>
      </>:modal==='guide'?<>
        <h2 id="dialog-title">Workspace information</h2><p className="modal-description">Use the workspace in the order that fits your task.</p><div className="workspace-help">{pages.map((page,index)=><button key={page.name} onClick={()=>{go(index);setModal(null);}}><strong>{page.name}</strong><p>{['Manage data sources and external tools.','Search records and pin evidence for a task.','Define a task, review its context, and inspect results.','Review, edit, and approve reusable knowledge.','Inspect the current context assessment and its evidence.'][index]}</p><ArrowUpRight size={15}/></button>)}</div><details className="environment-details"><summary>About this environment</summary><p>This repository uses sample data and prepared answers. Context checks run on the local backend. Live retrieval, model execution, enterprise authorization, and private Deep Agents, LangSmith, and Hindsight services are not connected.</p></details><button className="text-link guide-reset" onClick={()=>setModal('reset')}><RotateCcw size={14}/>Reset workspace</button>
      </>:modal==='reset'?<>
        <h2 id="dialog-title">Reset workspace?</h2><p className="modal-description">This restores the sample workspace and clears conversations, source selections, and edited memories. Your current task and saved draft will also be cleared.</p><div className="dialog-actions"><button className="pi-secondary" onClick={()=>setModal(null)}>Keep workspace</button><button className="pi-primary" onClick={resetWorkspace}>Reset workspace</button></div>
      </>:null}
    </dialog>
    {toast&&<div className="toast" role="status"><span>{toast}</span><button onClick={()=>setToast('')} aria-label="Dismiss notification"><X size={15}/></button></div>}
  </div>;
}
