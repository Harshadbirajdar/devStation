import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Wrench, XCircle } from 'lucide-react'
import type { PrerequisiteConfig, ToolHealth, ToolStatus } from '../../../shared/types'

interface Props {
  title: string
  tools: PrerequisiteConfig[]
  onLog: (line: string) => void
}

type HealthState = Record<string, ToolHealth>

function StatusPill({ status }: { status: ToolStatus }): JSX.Element {
  switch (status) {
    case 'checking':
      return (
        <span className="status-pill checking">
          <Loader2 size={12} className="spin" /> Checking
        </span>
      )
    case 'missing':
      return (
        <span className="status-pill missing">
          <XCircle size={12} /> Missing
        </span>
      )
    case 'outdated':
      return (
        <span className="status-pill outdated">
          <AlertTriangle size={12} /> Outdated
        </span>
      )
    case 'ok':
      return (
        <span className="status-pill ok">
          <CheckCircle2 size={12} /> OK
        </span>
      )
    case 'error':
      return (
        <span className="status-pill error">
          <AlertTriangle size={12} /> Unrecognized
        </span>
      )
  }
}

async function runFix(tool: PrerequisiteConfig, onLog: (line: string) => void): Promise<void> {
  const runId = crypto.randomUUID()
  onLog(`$ ${tool.fixCmd}`)
  const { code } = await window.api.runCommand({ runId, cmd: tool.fixCmd }, (chunk) => {
    onLog(chunk.data.replace(/\n+$/, ''))
  })
  onLog(`[${tool.label}] fix command exited with code ${code}`)
}

/** Version-aware required-tools checklist: used both for machine-wide
 *  prerequisites (Health Check tab) and per-project tool requirements
 *  (Projects tab) — same check/fix/fix-all behavior either way. */
export default function ToolHealthTable({ title, tools, onLog }: Props): JSX.Element {
  const [health, setHealth] = useState<HealthState>({})
  const [fixingId, setFixingId] = useState<string | null>(null)
  const [fixingAll, setFixingAll] = useState(false)

  const checkOne = async (tool: PrerequisiteConfig): Promise<void> => {
    setHealth((prev) => ({ ...prev, [tool.id]: { id: tool.id, installedVersion: null, status: 'checking' } }))
    const result = await window.api.checkVersion(tool)
    setHealth((prev) => ({ ...prev, [tool.id]: result }))
  }

  useEffect(() => {
    tools.forEach((tool) => {
      checkOne(tool)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tools])

  const handleFix = async (tool: PrerequisiteConfig): Promise<void> => {
    setFixingId(tool.id)
    await runFix(tool, onLog)
    await checkOne(tool)
    setFixingId(null)
  }

  const handleFixAll = async (): Promise<void> => {
    setFixingAll(true)
    const needsFix = tools.filter((tool) => {
      const status = health[tool.id]?.status
      return status === 'missing' || status === 'outdated' || status === 'error'
    })
    for (const tool of needsFix) {
      setFixingId(tool.id)
      await runFix(tool, onLog)
      await checkOne(tool)
    }
    setFixingId(null)
    setFixingAll(false)
  }

  const needsFixCount = tools.filter((tool) => {
    const status = health[tool.id]?.status
    return status === 'missing' || status === 'outdated' || status === 'error'
  }).length

  return (
    <section>
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          <div className="section-subtitle">
            {needsFixCount === 0
              ? 'Everything meets the required version.'
              : `${needsFixCount} tool${needsFixCount > 1 ? 's need' : ' needs'} attention.`}
          </div>
        </div>
        <button className="btn btn-primary" disabled={needsFixCount === 0 || fixingAll} onClick={handleFixAll}>
          <Wrench size={13} />
          {fixingAll ? 'Fixing…' : 'Fix All'}
        </button>
      </div>
      <div className="card">
        <table className="health-table">
          <thead>
            <tr>
              <th>Tool</th>
              <th>Required</th>
              <th>Installed</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tools.map((tool) => {
              const result = health[tool.id]
              const status = result?.status ?? 'checking'
              const needsFix = status === 'missing' || status === 'outdated' || status === 'error'
              return (
                <tr key={tool.id}>
                  <td className="tool-name">{tool.label}</td>
                  <td className="version-chip">≥{tool.minVersion}</td>
                  <td className="version-chip">{result?.installedVersion ?? '—'}</td>
                  <td>
                    <StatusPill status={status} />
                  </td>
                  <td>
                    {needsFix && (
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={fixingId === tool.id || fixingAll}
                        onClick={() => handleFix(tool)}
                      >
                        {fixingId === tool.id ? 'Fixing…' : 'Fix'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
