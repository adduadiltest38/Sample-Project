// Starts the Python AI service with whichever Python is installed.
// If Python isn't available the app still works: the Node backend falls
// back to its TypeScript engine, so this exits quietly instead of failing.
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../ai-service/chargeflow_ai.py', import.meta.url));
const candidates = process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];
const python = candidates.find((cmd) => spawnSync(cmd, ['--version'], { stdio: 'ignore' }).status === 0);

if (!python) {
  console.warn('[chargeflow-ai] Python 3 not found — skipping the AI service (the TypeScript engine will answer).');
  process.exit(0);
}

const child = spawn(python, ['-u', script, ...process.argv.slice(2)], { stdio: 'inherit' });
const stop = () => child.kill('SIGTERM');
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', (code) => process.exit(code ?? 0));
