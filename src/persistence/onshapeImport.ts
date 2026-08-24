type WorkerMessage =
  | { type: 'progress'; message: string }
  | { type: 'result'; result: import('./stepMetadataParser').StepMetadata }
  | { type: 'error'; message: string }

function parseStep(
  buffer: ArrayBuffer,
  onProgress: (message: string) => void,
  signal: AbortSignal,
) {
  return new Promise<Extract<WorkerMessage, { type: 'result' }>['result']>((resolve, reject) => {
    const worker = new Worker(new URL('./stepImport.worker.ts', import.meta.url), { type: 'module' })
    const abort = () => {
      worker.terminate()
      reject(new DOMException('Import canceled.', 'AbortError'))
    }
    signal.addEventListener('abort', abort, { once: true })
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      if (event.data.type === 'progress') {
        onProgress(event.data.message)
        return
      }
      worker.terminate()
      signal.removeEventListener('abort', abort)
      if (event.data.type === 'error') reject(new Error(event.data.message))
      else resolve(event.data.result)
    }
    worker.onerror = (event) => {
      worker.terminate()
      signal.removeEventListener('abort', abort)
      reject(new Error(event.message || 'The STEP converter stopped unexpectedly.'))
    }
    if (signal.aborted) abort()
    else worker.postMessage({ buffer }, [buffer])
  })
}

export async function convertStepToMetadata(
  file: File,
  onProgress: (message: string) => void,
  signal: AbortSignal,
) {
  onProgress('Reading file from disk')
  const buffer = await file.arrayBuffer()
  if (signal.aborted) throw new DOMException('Import canceled.', 'AbortError')
  const metadata = await parseStep(buffer, onProgress, signal)

  return {
    source: {
      fileName: file.name,
      format: 'STEP',
      schema: metadata.schema,
      units: metadata.units,
      coordinateConvention: 'World-space position and XYZ Euler rotation in degrees.',
    },
    parts: metadata.parts,
  }
}
