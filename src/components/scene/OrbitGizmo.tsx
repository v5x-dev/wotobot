import { GizmoHelper, GizmoViewport } from '@react-three/drei'
import { AXIS_COLORS } from '@/model/colors'

const GIZMO_SCALE = 0.75

export function OrbitGizmo() {
  return (
    <GizmoHelper alignment="top-right" margin={[48, 48]}>
      <group scale={GIZMO_SCALE}>
        <GizmoViewport
          axisColors={AXIS_COLORS}
          labels={['', '', '']}
          axisHeadScale={0.9}
        />
      </group>
    </GizmoHelper>
  )
}
