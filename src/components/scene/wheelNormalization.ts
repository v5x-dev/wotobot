export function withoutTrackpadPinchAcceleration(event: WheelEvent): WheelEvent {
  if (!event.ctrlKey) return event
  return {
    clientX: event.clientX,
    clientY: event.clientY,
    ctrlKey: false,
    deltaMode: event.deltaMode,
    deltaY: event.deltaY,
  } as WheelEvent
}
