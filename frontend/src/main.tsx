import {createRoot} from 'react-dom/client';
import {initializeApi} from './lib/api';
import './globals.css';
import './refinement.css';

const root=createRoot(document.getElementById('root')!);

async function start() {
  root.render(<div className="workspace-loading">Opening your workspace…</div>);
  try {
    // Load view models before importing the shell; inject a StudioApi here to use another backend.
    await initializeApi();
    const {default:App}=await import('./App');
    root.render(<App/>);
  } catch(error) {
    root.render(<main className="workspace-unavailable"><h1>Your workspace is unavailable.</h1><p>{error instanceof Error?error.message:'Please retry your connection.'}</p><button onClick={start}>Retry connection</button></main>);
  }
}
void start();
