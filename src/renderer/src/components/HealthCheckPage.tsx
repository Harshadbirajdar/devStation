import type { PrerequisiteConfig } from '../../../shared/types'
import ToolHealthTable from './ToolHealthTable'

interface Props {
  prerequisites: PrerequisiteConfig[]
  onLog: (line: string) => void
}

export default function HealthCheckPage({ prerequisites, onLog }: Props): JSX.Element {
  return <ToolHealthTable title="Required tools" tools={prerequisites} onLog={onLog} />
}
