import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Terminal as TerminalIcon, Trash2 } from 'lucide-react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface Props {
  lines: string[]
  onClear: () => void
}

const EXPANDED_HEIGHT = 240
const COLLAPSED_HEIGHT = 40

export default function TerminalPanel({ lines, onClear }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const writtenCountRef = useRef(0)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      convertEol: true,
      fontSize: 12.5,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      theme: {
        background: '#14161f',
        foreground: '#d6d8e4',
        cursor: '#5b5ff2'
      },
      disableStdin: true
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()
    termRef.current = term
    fitAddonRef.current = fitAddon

    const onResize = (): void => fitAddon.fit()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      term.dispose()
      termRef.current = null
      fitAddonRef.current = null
      writtenCountRef.current = 0
    }
  }, [])

  useEffect(() => {
    const term = termRef.current
    if (!term) return
    for (let i = writtenCountRef.current; i < lines.length; i++) {
      term.writeln(lines[i])
    }
    writtenCountRef.current = lines.length
  }, [lines])

  useEffect(() => {
    if (!collapsed) {
      const id = requestAnimationFrame(() => fitAddonRef.current?.fit())
      return () => cancelAnimationFrame(id)
    }
    return undefined
  }, [collapsed])

  const handleClear = (): void => {
    termRef.current?.clear()
    writtenCountRef.current = lines.length
    onClear()
  }

  return (
    <div className="terminal-panel" style={{ height: collapsed ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT }}>
      <div className="terminal-header">
        <div className="terminal-header-left">
          <TerminalIcon size={13} />
          Console
        </div>
        <div className="terminal-header-actions">
          <button className="icon-btn" title="Clear" onClick={handleClear}>
            <Trash2 size={14} />
          </button>
          <button className="icon-btn" title={collapsed ? 'Expand' : 'Collapse'} onClick={() => setCollapsed((c) => !c)}>
            {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      <div className="terminal-body">
        <div className="terminal-mount" ref={containerRef} />
        {lines.length === 0 && <div className="terminal-empty">Output from running steps will appear here</div>}
      </div>
    </div>
  )
}
