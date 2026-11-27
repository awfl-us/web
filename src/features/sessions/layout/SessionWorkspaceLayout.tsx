import type { CSSProperties, ReactNode } from 'react'
import { defaultAppearance, normalizeAppearance, type Appearance } from '../../ui/public'
import styles from './SessionWorkspaceLayout.module.css'

export const SESSION_MOBILE_QUERY = '(max-width: 640px)'

export function SessionWorkspaceLayout({ navigation, navigationContent, conversation, mobile, pane, appearance = defaultAppearance, children }: {
  navigation: ReactNode
  navigationContent: ReactNode
  conversation: ReactNode
  mobile: boolean
  pane: 'list' | 'detail'
  appearance?: Appearance
  children?: ReactNode
}) {
  const config = normalizeAppearance(appearance)
  const style = {
    '--awfl-navigation-width': config.navigationWidth + 'px',
    '--awfl-conversation-max-width': config.conversationMaxWidth + 'px',
  } as CSSProperties
  return (
    <div className={styles.workspace} style={style} data-awfl-slot="workspace"
      data-navigation={config.navigation} data-mobile={mobile} data-pane={pane}
      data-awfl-theme={config.theme} data-awfl-density={config.density}>
      <div className={styles.navigation} data-awfl-slot="navigation">
        {navigation}
        <div className={styles.navigationContent}>{navigationContent}</div>
      </div>
      <main className={styles.main} data-awfl-slot="conversation">{conversation}</main>
      {children}
    </div>
  )
}
