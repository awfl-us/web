import React, { useEffect, useMemo, useState } from 'react'
import { useFsTree } from '../hooks/useFsTree'
import { useFsSelection } from '../hooks/useFsSelection'
import { SelectionToolbar } from './SelectionToolbar'
import type { FsEntry } from '../types'

function sortEntries(items: FsEntry[]): FsEntry[] {
  const dirs: FsEntry[] = []
  const files: FsEntry[] = []
  const others: FsEntry[] = []
  for (const it of items) {
    if (it.type === 'dir') dirs.push(it)
    else if (it.type === 'file' || it.type === 'symlink') files.push(it)
    else others.push(it)
  }
  dirs.sort((a, b) => a.name.localeCompare(b.name))
  files.sort((a, b) => a.name.localeCompare(b.name))
  others.sort((a, b) => a.name.localeCompare(b.name))
  return [...dirs, ...files, ...others]
}

function Row({
  depth,
  isDir,
  name,
  path,
  onToggle,
  expanded,
  onRefresh,
  checked,
  onCheckedChange,
  onOpenFile,
}: {
  depth: number
  isDir: boolean
  name: string
  path: string
  expanded?: boolean
  onToggle?: () => void
  onRefresh?: () => void
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  onOpenFile?: (path: string) => void
}) {
  const pad = 8 + depth * 12
  const caret = isDir ? (expanded ? '\u25be' : '\u25b8') : '\u00b7'
  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isDir && onOpenFile) onOpenFile(path)
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 6px',
        paddingLeft: pad,
        cursor: isDir ? 'pointer' : 'default',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
      onClick={isDir ? onToggle : undefined}
      title={name}
    >
      <input
        type="checkbox"
        checked={!!checked}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onCheckedChange && onCheckedChange(e.target.checked)}
        style={{ margin: 0 }}
        aria-label={`Select ${name}`}
      />
      <span style={{ width: 12, display: 'inline-block', textAlign: 'center', color: '#6b7280' }}>{caret}</span>
      <span
        onClick={!isDir && onOpenFile ? handleOpen : undefined}
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12,
          color: !isDir && onOpenFile ? '#111827' : undefined,
          textDecoration: !isDir && onOpenFile ? 'underline' : undefined,
          cursor: !isDir && onOpenFile ? 'pointer' : undefined,
        }}
      >
        {name}
      </span>
      {isDir && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRefresh && onRefresh()
          }}
          style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
          aria-label="Refresh"
          title="Refresh"
        >
          {/* Inline SVG for a consistent refresh icon regardless of fonts */}
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-3.51-7.03" />
            <path d="M21 3v7h-7" />
          </svg>
        </button>
      )}
    </div>
  )
}

export function FileSystemSidebar({
  idToken,
  sessionId: _sessionId,
  pendingCount = 0,
  errorCount = 0,
  onPlainify,
  onDismissError,
  onOpenFile,
}: {
  idToken?: string | null
  sessionId?: string | null
  pendingCount?: number
  errorCount?: number
  onPlainify?: (paths: string[], helpers: { onItemDone: (path: string) => void }) => void
  onDismissError?: () => void
  onOpenFile?: (path: string) => void
}) {
  const { nodes, toggle, expand, refresh, rootPath } = useFsTree({ idToken, enabled: true })
  const { isSelected, select, clear, count, paths } = useFsSelection()
  const root = nodes[rootPath]

  // Tracks files we should not auto-reselect after completion-driven deselection
  const [suppressAutoSelect, setSuppressAutoSelect] = useState<Set<string>>(new Set())

  // When a folder is selected and its children become available, select all immediate file children (idempotently),
  // skipping any paths in suppressAutoSelect so we don't reselect files that were deselected upon completion.
  useEffect(() => {
    for (const key in nodes) {
      const node = nodes[key]
      if (!node) continue
      if (!isSelected(node.path)) continue
      const children = node.children
      if (!children || !children.length) continue
      for (const child of children) {
        if ((child.type === 'file' || child.type === 'symlink') && !isSelected(child.path) && !suppressAutoSelect.has(child.path)) {
          select(child.path, true)
        }
      }
    }
  }, [nodes, isSelected, select, suppressAutoSelect])

  const selectDirAndChildren = (path: string, checked: boolean) => {
    // Select/deselect the folder itself
    select(path, checked)
    if (checked) {
      // Expand to make children visible and trigger load if needed
      expand(path)
    }
    const node = nodes[path]
    const children = node?.children || []
    for (const child of children) {
      if (child.type === 'file' || child.type === 'symlink') {
        if (checked) {
          if (!isSelected(child.path)) select(child.path, true)
        } else {
          if (isSelected(child.path)) select(child.path, false)
        }
      }
    }
  }

  // Build an index of entry types from currently loaded directory listings
  const entryTypeIndex = useMemo(() => {
    const idx: Record<string, FsEntry['type']> = {}
    for (const key in nodes) {
      const children = nodes[key]?.children
      if (!children) continue
      for (const child of children) idx[child.path] = child.type
    }
    return idx
  }, [nodes])

  // Derive selected file paths using the entry-type index (files/symlinks only)
  const selectedFilePaths = useMemo(() => {
    return paths.filter((p) => {
      const t = entryTypeIndex[p]
      return t === 'file' || t === 'symlink'
    })
  }, [paths, entryTypeIndex])

  const handlePlainifyClick = () => {
    // Unconditional diagnostic log at the handler entry to prove delegation from toolbar
    try {
      console.log('[fs][sidebar] handlePlainifyClick', {
        hasHandler: !!onPlainify,
        selectedFiles: selectedFilePaths,
        selectedFileCount: selectedFilePaths.length,
        totalSelected: count,
      })
    } catch {}

    if (!onPlainify) {
      // Log even outside DEV so we can see this in production builds
      console.warn('[fs][sidebar] Plainify: no onPlainify handler wired')
      return
    }

    // If no files were explicitly selected, but directories are selected,
    // try to gather files from within the selected directories (recursively)
    let files = selectedFilePaths
    if (files.length === 0 && count > 0) {
      const selectedDirs = paths.filter((p) => {
        const t = entryTypeIndex[p]
        // It's a directory if we have it indexed as 'dir' or if it exists as a tree node (root or expanded dir)
        return t === 'dir' || !!nodes[p]
      })

      const acc = new Set<string>()
      const gatherFilesFromDir = (dirPath: string) => {
        const n = nodes[dirPath]
        const children = n?.children || []
        for (const ch of children) {
          if (ch.type === 'file' || ch.type === 'symlink') acc.add(ch.path)
          else if (ch.type === 'dir') gatherFilesFromDir(ch.path)
        }
      }

      for (const d of selectedDirs) {
        // Expand to load children if not already loaded; user can click again once loaded
        try { expand(d) } catch {}
        gatherFilesFromDir(d)
      }

      files = Array.from(acc)

      try {
        console.log('[fs][sidebar] gathered files from selected directories', { selectedDirs: selectedDirs.length, gathered: files.length })
      } catch {}
    }

    if (files.length === 0) {
      console.warn('[fs][sidebar] Plainify: no files selected (directories are ignored unless expanded). Expand folders to load files, select files, then retry.')
      return
    }

    try {
      console.log('[fs][sidebar] invoking onPlainify', { count: files.length })
    } catch {}

    onPlainify(files, {
      onItemDone: (p: string) => {
        try { console.log('[fs][sidebar] onItemDone', p) } catch {}
        setSuppressAutoSelect((prev) => {
          const next = new Set(prev)
          next.add(p)
          return next
        })
        // Deselect the file as it completes
        select(p, false)
      },
    })
  }

  const handleClear = () => {
    clear()
    setSuppressAutoSelect(new Set())
  }

  const renderDir = (path: string, depth: number): React.ReactNode => {
    const node = nodes[path]
    const name = node?.name || path
    const loading = node?.loading
    const error = node?.error
    const expanded = !!node?.expanded

    const onToggle = () => toggle(path)
    const onRefresh = () => refresh(path)

    const childrenList = sortEntries(node?.children || [])

    return (
      <div key={path}>
        <Row
          depth={depth}
          isDir
          name={name}
          path={path}
          expanded={expanded}
          onToggle={onToggle}
          onRefresh={onRefresh}
          checked={isSelected(path)}
          onCheckedChange={(v) => selectDirAndChildren(path, v)}
        />
        {expanded && (
          <div>
            {loading && (
              <div style={{ paddingLeft: 8 + (depth + 1) * 12, color: '#6b7280', fontSize: 12 }}>Loading…</div>
            )}
            {error && (
              <div style={{ paddingLeft: 8 + (depth + 1) * 12, color: '#ef4444', fontSize: 12 }}>Error: {error}</div>
            )}
            {childrenList.map((child) =>
              child.type === 'dir' ? (
                <div key={child.path}>{renderDir(child.path, depth + 1)}</div>
              ) : (
                <Row
                  key={child.path}
                  depth={depth + 1}
                  isDir={false}
                  name={child.name}
                  path={child.path}
                  checked={isSelected(child.path)}
                  onCheckedChange={(v) => select(child.path, v)}
                  onOpenFile={onOpenFile}
                />
              )
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        overflow: 'auto',
        overscrollBehavior: 'contain',
        paddingRight: 8,
      }}
    >
      <SelectionToolbar
        count={count}
        pendingCount={pendingCount}
        errorCount={errorCount}
        onAddToContext={() => {
          if ((import.meta as any)?.env?.DEV) console.debug('[fs] Add to context clicked')
        }}
        onPlainify={handlePlainifyClick}
        onClear={handleClear}
        onDismissError={onDismissError}
      />
      {!root ? (
        <div style={{ color: '#6b7280', fontSize: 12 }}>Initializing…</div>
      ) : (
        renderDir(rootPath, 0)
      )}
    </div>
  )
}

export default FileSystemSidebar
