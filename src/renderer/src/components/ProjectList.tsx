import { useState } from 'react'
import { CheckCircle2, Circle, FolderGit2, Loader2, Play, XCircle } from 'lucide-react'
import type { ProjectConfig, ProjectStepConfig } from '../../../shared/types'
import ToolHealthTable from './ToolHealthTable'

interface Props {
  projects: ProjectConfig[]
  onLog: (line: string) => void
}

type StepStatus = 'idle' | 'running' | 'success' | 'failed'

async function runStep(step: ProjectStepConfig, onLog: (line: string) => void): Promise<boolean> {
  const runId = crypto.randomUUID()
  onLog(`$ ${step.cmd}`)
  const { code } = await window.api.runCommand({ runId, cmd: step.cmd, cwd: step.cwd }, (chunk) => {
    onLog(chunk.data.replace(/\n+$/, ''))
  })
  onLog(`[${step.label}] exited with code ${code}`)
  return code === 0
}

function StepIcon({ status }: { status: StepStatus }): JSX.Element {
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

export default function ProjectList({ projects, onLog }: Props): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(projects[0]?.id ?? null)
  const [stepStatus, setStepStatus] = useState<Record<string, StepStatus>>({})
  const [runningAll, setRunningAll] = useState(false)

  const selected = projects.find((p) => p.id === selectedId) ?? null
  const requiredTools = selected?.requiredTools ?? []

  const handleRunStep = async (step: ProjectStepConfig): Promise<boolean> => {
    setStepStatus((prev) => ({ ...prev, [step.id]: 'running' }))
    const ok = await runStep(step, onLog)
    setStepStatus((prev) => ({ ...prev, [step.id]: ok ? 'success' : 'failed' }))
    return ok
  }

  const handleRunAll = async (): Promise<void> => {
    if (!selected) return
    setRunningAll(true)
    for (const step of selected.steps) {
      const ok = await handleRunStep(step)
      if (!ok) break
    }
    setRunningAll(false)
  }

  return (
    <section className="project-layout">
      <aside className="project-sidebar">
        <div className="section-header">
          <h2>Projects</h2>
        </div>
        <ul className="project-sidebar-list">
          {projects.map((p) => (
            <li key={p.id}>
              <button
                className={`project-sidebar-item ${p.id === selectedId ? 'active' : ''}`}
                onClick={() => setSelectedId(p.id)}
              >
                <FolderGit2 size={15} strokeWidth={2} />
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="project-detail">
        {selected ? (
          <div className="project-detail-sections">
            <h1 className="project-detail-title">{selected.name}</h1>

            {requiredTools.length > 0 && (
              <ToolHealthTable
                title="Required tools for this project"
                tools={requiredTools}
                onLog={onLog}
              />
            )}

            <section>
              <div className="section-header">
                <div>
                  <h2>Setup steps</h2>
                  <div className="section-subtitle">{selected.steps.length} setup steps</div>
                </div>
                <button className="btn btn-primary" disabled={runningAll} onClick={handleRunAll}>
                  <Play size={13} />
                  {runningAll ? 'Running…' : 'Run All'}
                </button>
              </div>
              <div className="card">
                <ul className="step-list">
                  {selected.steps.map((step) => {
                    const status = stepStatus[step.id] ?? 'idle'
                    return (
                      <li key={step.id} className="step">
                        <span className={`step-icon ${status}`}>
                          <StepIcon status={status} />
                        </span>
                        <div className="step-body">
                          <div className="step-label">{step.label}</div>
                          <code className="step-cmd">{step.cmd}</code>
                        </div>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={runningAll || status === 'running'}
                          onClick={() => handleRunStep(step)}
                        >
                          Run
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </section>
          </div>
        ) : (
          <p className="loading-state">No projects in config.</p>
        )}
      </div>
    </section>
  )
}
