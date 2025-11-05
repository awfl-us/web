import GitHubIntegrationManager from '../components/integrations/GitHubIntegrationManager'
import { getCookie, setCookie } from '../utils/cookies'

export default function IntegrationsGitHub() {
  const initial = getCookie('awfl.projectId') || ''

  return (
    <div style={{ padding: 16, height: '100%', boxSizing: 'border-box', overflow: 'auto' }}>
      <GitHubIntegrationManager
        initialProjectId={initial}
        onProjectChange={(id) => setCookie('awfl.projectId', id)}
      />
    </div>
  )
}
