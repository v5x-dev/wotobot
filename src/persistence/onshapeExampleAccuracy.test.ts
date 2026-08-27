import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Euler, Quaternion, Vector3 } from 'three'
import { parseStepMetadata } from './stepMetadataParser'
import { stepMetadataToParts } from './onshapeParts'

const EXAMPLE_DIR = '/home/pingu/Work/r3f/wotobot/example-onshape-models'
const EXAMPLE_FILES = [
  `${EXAMPLE_DIR}/WIP.step`,
  `${EXAMPLE_DIR}/override-v13-bot.step`,
]

function axisDistance(origin: Vector3, direction: Vector3, point: Vector3) {
  return point.clone().sub(origin).cross(direction).length()
}

describe.skipIf(!EXAMPLE_FILES.every((file) => existsSync(file)))('Onshape example assemblies', () => {
  it('imports the WIP brain with the catalog-aligned rotation', () => {
    const source = readFileSync(`${EXAMPLE_DIR}/WIP.step`, 'utf8')
    const imported = stepMetadataToParts(parseStepMetadata(source))
    const brain = imported.parts.find((part) => part.key.includes(':BRAN:'))

    expect(brain).toBeDefined()
    expect(brain!.rotation.map((angle) => angle * 180 / Math.PI)).toEqual([0, -90, -48])
  })

  it('keeps pillow-block bores on high-strength shaft axes', () => {
    const source = readFileSync(`${EXAMPLE_DIR}/WIP.step`, 'utf8')
    const imported = stepMetadataToParts(parseStepMetadata(source))
    const shafts = imported.parts.filter((part) => part.key.includes(':SHFT:') && part.param1 === 'High Strength')
    const blocks = imported.parts.filter((part) => part.key.includes(':BLCK:'))
    expect(blocks.length).toBeGreaterThan(0)

    const rotation = new Quaternion()
    for (const block of blocks) {
      const origin = new Vector3(...block.position)
      let best = Infinity
      for (const shaft of shafts) {
        rotation.setFromEuler(new Euler(...shaft.rotation, 'XYZ'))
        const direction = new Vector3(0, 0, 1).applyQuaternion(rotation).normalize()
        best = Math.min(best, axisDistance(new Vector3(...shaft.position), direction, origin))
      }
      expect(best, block.onshapeName).toBeLessThan(0.05)
    }
  })

  it('keeps sprockets coaxial with a nearby shaft', () => {
    const source = readFileSync(`${EXAMPLE_DIR}/WIP.step`, 'utf8')
    const imported = stepMetadataToParts(parseStepMetadata(source))
    const shafts = imported.parts.filter((part) => part.key.includes(':SHFT:'))
    const sprockets = imported.parts.filter((part) => part.key.includes(':SPKT:'))
    expect(sprockets.length).toBeGreaterThan(0)

    const rotation = new Quaternion()
    const coaxial = sprockets.filter((sprocket) => {
      const origin = new Vector3(...sprocket.position)
      return shafts.some((shaft) => {
        rotation.setFromEuler(new Euler(...shaft.rotation, 'XYZ'))
        const direction = new Vector3(0, 0, 1).applyQuaternion(rotation).normalize()
        return axisDistance(new Vector3(...shaft.position), direction, origin) < 0.05
      })
    })
    expect(coaxial.length).toBeGreaterThanOrEqual(sprockets.length - 1)
  })

  it('imports nested override-v13 subassemblies without dropping C-channels', () => {
    const source = readFileSync(`${EXAMPLE_DIR}/override-v13-bot.step`, 'utf8')
    const metadata = parseStepMetadata(source)
    expect(metadata.parts.some((part) => part.kind === 'assembly')).toBe(true)
    const imported = stepMetadataToParts(metadata)
    const channels = imported.parts.filter((part) => part.key.includes(':CCHL:'))
    const shafts = imported.parts.filter((part) => part.key.includes(':SHFT:'))
    expect(channels.length).toBeGreaterThan(10)
    expect(shafts.length).toBeGreaterThan(0)
    const xs = imported.parts.map((part) => part.position[0])
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(5)
  })
})
