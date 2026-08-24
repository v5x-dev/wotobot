import { parseStepMetadata } from './stepMetadataParser'

self.onmessage = (event: MessageEvent<{ buffer: ArrayBuffer }>) => {
  try {
    self.postMessage({ type: 'progress', message: 'Decoding STEP text' })
    const source = new TextDecoder().decode(event.data.buffer)
    self.postMessage({ type: 'progress', message: 'Scanning assembly metadata' })
    const result = parseStepMetadata(source, (percent) => {
      self.postMessage({ type: 'progress', message: `Scanning assembly metadata: ${percent}%` })
    })
    self.postMessage({ type: 'result', result })
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'The STEP file could not be parsed.',
    })
  }
}
