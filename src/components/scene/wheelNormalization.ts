const PINCH_GESTURE_GAP_MS = 150

type PinchAnchor = { x: number; y: number; timeStamp: number }

/** Keeps one cursor anchor for a pinch and bypasses OrbitControls' 10x pinch boost. */
export function createWheelNormalizer() {
  let pinchAnchor: PinchAnchor | null = null

  return (event: WheelEvent): WheelEvent => {
    if (!event.ctrlKey) {
      pinchAnchor = null
      return event
    }

    const elapsed = pinchAnchor ? event.timeStamp - pinchAnchor.timeStamp : Infinity
    if (!pinchAnchor || elapsed < 0 || elapsed > PINCH_GESTURE_GAP_MS) {
      pinchAnchor = { x: event.clientX, y: event.clientY, timeStamp: event.timeStamp }
    } else {
      pinchAnchor.timeStamp = event.timeStamp
    }

    return {
      clientX: pinchAnchor.x,
      clientY: pinchAnchor.y,
      ctrlKey: false,
      deltaMode: event.deltaMode,
      deltaY: event.deltaY,
    } as WheelEvent
  }
}
