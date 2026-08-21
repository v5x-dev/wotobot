export const DEFAULT_COLOR: [number, number, number] = [0.94902, 0.94902, 0.94902]

export const COLOR_PRESETS: { name: string; rgb: [number, number, number] }[] = [
  { name: 'Default', rgb: DEFAULT_COLOR },
  { name: 'Gray', rgb: [0.39623, 0.37941, 0.37941] },
  { name: 'Black', rgb: [0.16038, 0.16038, 0.16038] },
  { name: 'Brown', rgb: [0.41176, 0.27843, 0.20784] },
  { name: 'Red', rgb: [0.64151, 0.18459, 0.18723] },
  { name: 'Orange', rgb: [0.74528, 0.39851, 0.13007] },
  { name: 'Yellow', rgb: [0.84906, 0.80781, 0.12415] },
  { name: 'Lime', rgb: [0.51577, 0.85098, 0.12549] },
  { name: 'Green', rgb: [0.06218, 0.35849, 0.04566] },
  { name: 'Light Blue', rgb: [0.14413, 0.71036, 0.74528] },
  { name: 'Blue', rgb: [0.18904, 0.21052, 0.67925] },
  { name: 'Pink', rgb: [0.97647, 0.80784, 0.90588] },
  { name: 'Purple', rgb: [0.43276, 0.06902, 0.4434] },
]

export function rgbToHex(rgb: [number, number, number]) {
  return `#${rgb
    .map((channel) => Math.round(channel * 255)
      .toString(16)
      .padStart(2, '0'))
    .join('')}`
}

export function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  ]
}

export function sameRgb(a: [number, number, number] | null | undefined, b: [number, number, number] | null | undefined) {
  if (!a && !b) return true
  if (!a || !b) return false
  return Math.abs(a[0] - b[0]) < 1e-4 && Math.abs(a[1] - b[1]) < 1e-4 && Math.abs(a[2] - b[2]) < 1e-4
}
