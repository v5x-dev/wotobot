import { findPart, type PlacedPart } from './parts'

export type LoadingBox = {
  position: [number, number, number]
  size: [number, number, number]
}

const FALLBACK_BOX: LoadingBox = {
  position: [0, 0, 0],
  size: [0.75, 0.75, 0.75],
}

function holeLength(value: string, fallback: number) {
  return (Number(value) || fallback) * 0.5
}

export function loadingBoxForPart(part?: PlacedPart): LoadingBox {
  if (!part) return FALLBACK_BOX
  const definition = findPart(part.key)
  if (!definition) return FALLBACK_BOX

  if (definition.id === 'CCHL') {
    const profile = Number(part.param1.split('x').at(-1)) || 2
    return {
      position: [0, 0, -0.225],
      size: [holeLength(part.param2, 15), profile * 0.5, 0.55],
    }
  }

  if (definition.id === 'ANGL') {
    const leg = (Number(part.param1.split('x')[0]) || 1) * 0.5
    return {
      position: [0, 0, 0],
      size: [holeLength(part.param2, 5), leg, leg],
    }
  }

  if (definition.id === 'UCHL') {
    return {
      position: [0, -0.008, -0.477],
      size: [holeLength(part.param2, 20), 1.142, 1.017],
    }
  }

  if (definition.generator === 'plate') {
    return {
      position: [0, 0, 0],
      size: [holeLength(part.param1, 5), holeLength(part.param2, 5), 0.046],
    }
  }

  if (definition.generator === 'shaft') {
    return {
      position: [0, 0, 0],
      size: [0.125, 0.125, Number(part.param2) || 6],
    }
  }

  return FALLBACK_BOX
}
