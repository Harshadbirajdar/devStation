import { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronRight, Circle, Loader2, Play, XCircle } from 'lucide-react'
import type { ScriptConfig } from '../../../shared/types'

interface Props {
  scripts: ScriptConfig[]
  onLog: (line: string) => void
}

type RunStatus = 'idle' | 'running' | 'success' | 'failed'

function joinScript(script: string | string[]): string {
  return Array.isArray(script) ? script.join('\n') : script
}

function StatusIcon({ status }: { status: RunStatus }): JSX.Element {
  switch (status) {
    case 'running':
      return <Loader2 size={18} className="spin" />
    case 'success':
      return <CheckCircle2 size={18} />
    case 'failed':
      return <XCircle size={18} />
    default:
      return <Circle size={18} />
  }
}

export default function ScriptsPage({ scripts, onLog }: Props): JSX.Element {
  const [status, setStatus] = useState<Record<string, RunStatus>>({})
  const [runningId, setRunningId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleRun = async (entry: ScriptConfig): Promise<void> => {
    const body = joinScript(entry.script)
    setRunningId(entry.id)
    setStatus((prev) => ({ ...prev, [entry.id]: 'running' }))

    const runId = crypto.randomUUID()
    onLog(`$ ${entry.label}${entry.cwd ? `  (in ${entry.cwd})` : ''}`)
    const { code } = await window.api.runCommand({ runId, cmd: body, cwd: entry.cwd }, (chunk) => {
      onLog(chunk.data.replace(/\n+$/, ''))
    })
    onLog(`[${entry.label}] exited with code ${code}`)

    setStatus((prev) => ({ ...prev, [entry.id]: code === 0 ? 'success' : 'failed' }))
    setRunningId(null)
  }

  if (scripts.length === 0) {
    return <p className="loading-state">No scripts in config.</p>
  }

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>Scripts</h2>
          <div className="section-subtitle">Reusable scripts kept up to date in the shared config.</div>
        </div>
      </div>
      <div className="card">
        <ul className="step-list">
          {scripts.map((entry) => {
            const entryStatus = status[entry.id] ?? 'idle'
            const isOpen = expanded.has(entry.id)
            const body = joinScript(entry.script)
            return (
              <li key={entry.id} className="script-item">
                <div className="step">
                  <span className={`step-icon ${entryStatus}`}>
                    <StatusIcon status={entryStatus} />
                  </span>
                  <div className="step-body">
                    <div className="step-label">{entry.label}</div>
                    {entry.description && <div className="script-description">{entry.description}</div>}
                    <div className="script-meta">
                      {entry.cwd && <code className="step-cmd">{entry.cwd}</code>}
                      <button className="script-toggle" onClick={() => toggleExpanded(entry.id)}>
                        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        {isOpen ? 'Hide script' : 'View script'}
                      </button>
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={runningId !== null}
                    onClick={() => handleRun(entry)}
                  >
                    <Play size={12} />
                    {entryStatus === 'running' ? 'Running…' : 'Run'}
                  </button>
                </div>
                {isOpen && (
                  <pre className="script-source">
                    <code>{body}</code>
                  </pre>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
