export type FsEntryType = 'file' | 'dir' | 'symlink' | 'other'

export type FsEntry = {
  name: string
  path: string
  type: FsEntryType
  executable?: boolean
}

export type FsListResult = {
  path: string
  items: FsEntry[]
}

export type FsTreeNode = {
  path: string
  name: string
  expanded: boolean
  loading: boolean
  error: string | null
  children: FsEntry[] | null
}
