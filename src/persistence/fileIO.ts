const WBB_TYPE = {
  description: 'Protobot robot',
  accept: { 'application/json': ['.wbb', '.json'] },
}

const TEXT_TYPE = {
  description: 'Text file',
  accept: { 'text/plain': ['.txt'] },
}

type FilePickerAcceptType = {
  description?: string
  accept: Record<string, string[]>
}

type FileSystemWritableFileStream = {
  write: (data: string | BufferSource | Blob) => Promise<void>
  close: () => Promise<void>
}

export type FileSystemFileHandle = {
  name: string
  getFile: () => Promise<File>
  createWritable: () => Promise<FileSystemWritableFileStream>
}

type WindowWithFS = Window & {
  showOpenFilePicker?: (options?: {
    multiple?: boolean
    types?: FilePickerAcceptType[]
  }) => Promise<FileSystemFileHandle[]>
  showSaveFilePicker?: (options?: {
    suggestedName?: string
    types?: FilePickerAcceptType[]
  }) => Promise<FileSystemFileHandle>
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function pickWithInput(accept: string) {
  return new Promise<File | null>((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true })
    input.addEventListener('cancel', () => resolve(null), { once: true })
    input.click()
  })
}

export async function openTextFile(): Promise<{
  name: string
  text: string
  handle: FileSystemFileHandle | null
} | null> {
  const fs = window as WindowWithFS
  if (fs.showOpenFilePicker) {
    const [handle] = await fs.showOpenFilePicker({ multiple: false, types: [WBB_TYPE] })
    const file = await handle.getFile()
    return { name: file.name, text: await file.text(), handle }
  }

  const file = await pickWithInput('.wbb,.json,application/json')
  if (!file) return null
  return { name: file.name, text: await file.text(), handle: null }
}

export async function writeTextFile(
  handle: FileSystemFileHandle,
  text: string,
  mime = 'application/json',
) {
  const writable = await handle.createWritable()
  await writable.write(new Blob([text], { type: mime }))
  await writable.close()
}

export async function saveTextFile(options: {
  text: string
  suggestedName: string
  handle?: FileSystemFileHandle | null
  mime?: string
  types?: FilePickerAcceptType[]
}): Promise<{ name: string; handle: FileSystemFileHandle | null } | null> {
  const mime = options.mime ?? 'application/json'
  if (options.handle) {
    await writeTextFile(options.handle, options.text, mime)
    return { name: options.handle.name, handle: options.handle }
  }

  const fs = window as WindowWithFS
  if (fs.showSaveFilePicker) {
    const handle = await fs.showSaveFilePicker({
      suggestedName: options.suggestedName,
      types: options.types ?? [WBB_TYPE],
    })
    await writeTextFile(handle, options.text, mime)
    return { name: handle.name, handle }
  }

  downloadBlob(options.suggestedName, new Blob([options.text], { type: mime }))
  return { name: options.suggestedName, handle: null }
}

export function exportTextFile(filename: string, text: string) {
  return saveTextFile({
    text,
    suggestedName: filename,
    mime: 'text/plain',
    types: [TEXT_TYPE],
  })
}
