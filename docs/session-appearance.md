# Session appearance customization

The appearance layer is intentionally separate from workflow execution and session data. The first three checkpoints cover the composer, model selector, workspace layout and conversation timeline. Existing task, file and header styling has not yet been migrated. The inspector and full Appearance settings screen are planned, not available yet.

## Change the defaults

- `src/features/ui/theme/tokens.css`: scoped palette, semantic defaults, theme and density presets.
- `src/features/ui/theme/appearance.ts`: default typed configuration and validation.
- `src/features/sessions/layout/SessionWorkspaceLayout.tsx` and its CSS Module: named navigation, navigation content and conversation slots, responsive arrangement and geometry.
- `src/features/sessions/components/PromptComposer.module.css` and `ModelSelector.module.css`: component-specific presentation. Existing composer className/style props remain supported.

A host may supply scoped semantic/component CSS variables without modifying the component or its hooks. Example:

```css
.my-session-host {
  --awfl-accent: #174c5b;
  --awfl-on-accent: white;
  --awfl-font: Georgia, serif;
  --awfl-radius: 16px;
  --awfl-gap: 10px;
  --awfl-composer-font-size: 17px;
  --awfl-composer-padding: 12px;
  --awfl-composer-radius: 20px;
  --awfl-workspace-padding: 12px;
  --awfl-message-font-size: 16px;
  --awfl-message-line-height: 1.7;
  --awfl-user-message-max-width: 80%;
  --awfl-message-radius: 14px;
  --awfl-assistant-message-surface: transparent;
  --awfl-code-string: #166534;
  --awfl-activity-surface: #f5f6f8;
  --awfl-activity-radius: 10px;
  --awfl-activity-padding: 8px 12px;
  --awfl-activity-output-max-height: 480px;
}
```

Semantic overrides fall back to scoped preset defaults, then component fallbacks. A component-specific override wins over its semantic alias. Keep foreground and background contrast accessible. Layout geometry is set through the typed config (rather than overriding its internal CSS variables). Stable named regions use `data-awfl-slot`; CSS Modules remain implementation details.

```ts
import { defaultAppearance } from '@awfl/web/features/ui/public'

const appearance = {
  ...defaultAppearance,
  navigation: 'right' as const,
  navigationWidth: 260,
  conversationMaxWidth: 720,
  density: 'compact' as const,
  theme: 'light' as const,
  messageStyle: 'conversation' as const,
  showTimestamps: true,
  showCosts: true,
  activityMode: 'compact' as const,
}
```

Pass this as the `appearance` prop of `SessionWorkspaceLayout` and the `messagePresentation` prop of `SessionDetail`. The max width constrains the composer and conversational timeline. Set `messageStyle: 'legacy'` for the previous full-width, literal text rendering. Direct `YojMessageList` consumers default to legacy unless they pass `presentation={{messageStyle: 'conversation'}}`. Existing `--yoj-*` variables override new conversation defaults. Cost and time toggles only affect message metadata, not accounting or the session header. Widths are normalized to bounded ranges. The SPA reads the versioned account-specific appearance preferences via `useAppearance`; the current production UI does not expose an editor. No appearance configuration changes workflow requests.

## Technical activity

Set `activityMode: 'compact'` (default) for expandable request/result rows, or `'detailed'` for the previous inline arguments and output. This is independent of the conversation style; legacy message style always retains the legacy activity display. Tool calls correlate by a unique call ID in the visible window and retain chronological positions. Counts represent recorded results, not successful operations. Unmatched results remain accessible. Expand any row to inspect literal raw data or the original message. Use `--awfl-activity-border`, `--awfl-activity-surface`, `--awfl-activity-radius`, `--awfl-activity-padding`, `--awfl-activity-font-size` and `--awfl-activity-output-max-height` for appearance overrides. No effect on execution or billing.

## Preview without running an agent

Run `npm run dev`, then open `http://localhost:5173/scripts/session-ux-browser.html`. This dev-only synthetic fixture mounts the actual session components and supports changing theme, layout, message style, activity detail, metadata and session, toggling failures/running state, and resetting appearance. Try resizing the browser and edit the CSS files with Vite hot reload. No real execution or authentication bypass is involved. The production build does not bundle the fixture as an entry.

The automated browser check is `node scripts/test-session-ux-browser.mjs` (install Playwright/Chromium as in deploy CI; optionally set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` for an existing Chromium binary).

## Drafts

When provided an account/project/session `draftScope`, the composer stores the unsent draft in browser sessionStorage (tab lifetime, survives reload). Successful acknowledgement clears only the submitted revision, never a newly edited draft. The key contains scope IDs, not authentication tokens; drafts are not stored on the server. Applications embedding the composer may omit draftScope to avoid browser persistence.
