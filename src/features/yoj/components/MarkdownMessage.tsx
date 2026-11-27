import { memo, useRef, type ComponentPropsWithoutRef } from 'react'
import Markdown, { defaultUrlTransform, type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { CopyTextButton } from './CopyTextButton'
import styles from './MarkdownMessage.module.css'

// Only permit explicit safe protocols and in-document/relative links.
// react-markdown also rejects unsafe protocols; never interpret raw HTML.
export function messageUrl(value: string) {
  const safe = defaultUrlTransform(value)
  if (!safe || /[\u0000-\u0020\u007f]/.test(safe)) return ''
  try {
    const url = new URL(safe, 'https://awfl.invalid')
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? safe : ''
  } catch { return '' }
}

function CodeBlock({ children }: ComponentPropsWithoutRef<'pre'>) {
  const ref = useRef<HTMLPreElement>(null)
  return <div className={styles.codeBlock}>
    <div className={styles.codeToolbar}><CopyTextButton label="Copy code" getText={() => ref.current?.textContent || ''}/></div>
    <pre ref={ref} tabIndex={0}>{children}</pre>
  </div>
}

const components: Components = {
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  table: ({ children }) => <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Scrollable table"><table>{children}</table></div>,
  a: ({ href, children }) => href ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>,
  // Do not automatically fetch agent-supplied image URLs.
  img: ({ alt }) => <span>{alt ? '[Image: ' + alt + ']' : '[Image]'}</span>,
}
const remarkPlugins = [remarkGfm]
const rehypePlugins = [rehypeHighlight]

export const MarkdownMessage = memo(function MarkdownMessage({ text }: { text: string }) {
  return <div className={styles.markdown} data-awfl-slot="markdown">
    <Markdown skipHtml remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}
      urlTransform={messageUrl} components={components}>{text}</Markdown>
  </div>
})
