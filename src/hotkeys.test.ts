import { describe, expect, it } from 'vitest'
import { matchesDeleteHotkey } from './hotkeys'

function keyboardEvent(key: string, options: Partial<KeyboardEvent> = {}) {
  return { key, code: key, ...options } as KeyboardEvent
}

describe('matchesDeleteHotkey', () => {
  it('matches both Backspace and the configured delete binding', () => {
    expect(matchesDeleteHotkey(keyboardEvent('Backspace'), 'Delete')).toBe(true)
    expect(matchesDeleteHotkey(keyboardEvent('Delete'), 'Delete')).toBe(true)
  })

  it('does not treat modified Backspace as plain Backspace', () => {
    expect(matchesDeleteHotkey(keyboardEvent('Backspace', { ctrlKey: true }), 'Delete')).toBe(false)
  })
})
