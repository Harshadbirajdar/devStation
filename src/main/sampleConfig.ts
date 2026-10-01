import type { DevStationConfig } from '../shared/types'

/**
 * Bundled fallback used only when the remote config can't be reached and
 * there is no local cache yet (e.g. very first run, offline). Replace
 * CONFIG_URL in configClient.ts with your real devstation-config repo once
 * it exists — this sample exists so the app is usable/testable before that.
 */
export const sampleConfig: DevStationConfig = {
  version: '0.0.1-sample',
  updatedAt: new Date().toISOString(),
  prerequisites: [
    {
      id: 'homebrew',
      label: 'Homebrew',
      platform: 'darwin',
      versionCmd: 'brew --version',
      versionRegex: '(\\d+\\.\\d+\\.\\d+)',
      minVersion: '4.0.0',
      fixCmd:
        '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    },
    {
      id: 'node',
      label: 'Node.js',
      platform: 'darwin',
      versionCmd: 'node --version',
      versionRegex: 'v?(\\d+\\.\\d+\\.\\d+)',
      minVersion: '24.0.0',
      fixCmd: 'nvm install 24 && nvm alias default 24'
    },
    {
      id: 'git',
      label: 'Git',
      platform: 'darwin',
      versionCmd: 'git --version',
      versionRegex: '(\\d+\\.\\d+\\.\\d+)',
      minVersion: '2.30.0',
      fixCmd: 'brew install git'
    }
  ],
  projects: [
    {
      id: 'sample-project',
      name: 'Sample Project',
      requiredTools: [
        {
          id: 'node-18',
          label: 'Node.js (this project requires ≥18, lower than the machine default)',
          platform: 'darwin',
          versionCmd: 'node --version',
          versionRegex: 'v?(\\d+\\.\\d+\\.\\d+)',
          minVersion: '18.0.0',
          fixCmd: 'nvm install 18 && nvm alias default 18'
        }
      ],
      steps: [
        { id: 'echo', label: 'Say hello', cmd: 'echo "Hello from Dev Station"' }
      ]
    }
  ],
  scripts: [
    {
      id: 'sample-script',
      label: 'Say hello (generic)',
      description: 'A script with no specific working directory.',
      script: 'echo "Hello from a shared script"'
    },
    {
      id: 'sample-script-with-path',
      label: 'List files (runs in a specific path)',
      description: 'Demonstrates a script that needs to run inside a particular directory.',
      cwd: '~',
      script: ['echo "Listing your home directory:"', 'ls -la']
    }
  ]
}
