export type PlateInstancePosition = [number, number, number]

export function plateInstancePositions(length: number, width: number): PlateInstancePosition[] {
  const positions: PlateInstancePosition[] = []
  const position = (cell: number, size: number) => 0.5 * ((-size + 1) / 2 + cell)

  for (let x = 0; x < length; x += 1) {
    for (let y = 0; y < width; y += 1) {
      positions.push([position(x, length), position(y, width), 0])
    }
  }

  return positions
}
