import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, DoubleSide, Vector3, type ShaderMaterial } from 'three'

/** World unit is 1 inch. */
const INCH = 1

const vertexShader = /* glsl */ `
  uniform vec3 uCameraPosition;
  uniform float uFadeDistance;
  varying vec3 vWorldPosition;

  void main() {
    vec3 pos = position * (uFadeDistance * 2.0);
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    worldPosition.xz += uCameraPosition.xz;
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uSectionColor;
  uniform vec3 uXAxisColor;
  uniform vec3 uZAxisColor;
  uniform vec3 uCameraPosition;
  uniform float uCellSize;
  uniform float uSectionSize;
  uniform float uOpacity;
  uniform float uSectionOpacity;
  uniform float uAxisOpacity;
  uniform float uFadeDistance;
  varying vec3 vWorldPosition;

  float gridLine(float size) {
    vec2 coord = vWorldPosition.xz / size;
    vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
    return 1.0 - min(min(grid.x, grid.y), 1.0);
  }

  float axisLine(float coord) {
    return 1.0 - min(abs(coord) / max(fwidth(coord) * 2.25, 1e-8), 1.0);
  }

  void main() {
    float line = gridLine(uCellSize);
    float section = gridLine(uSectionSize);
    float xAxis = axisLine(vWorldPosition.z);
    float zAxis = axisLine(vWorldPosition.x);

    float dist = length(vWorldPosition.xz - uCameraPosition.xz);
    float fade = 1.0 - clamp(dist / uFadeDistance, 0.0, 1.0);
    fade *= fade;

    vec3 color = mix(uColor, uSectionColor, section);
    float alpha = max(line * uOpacity, section * uSectionOpacity);

    color = mix(color, uXAxisColor, xAxis);
    alpha = max(alpha, xAxis * uAxisOpacity);
    color = mix(color, uZAxisColor, zAxis);
    alpha = max(alpha, zAxis * uAxisOpacity);

    alpha *= fade;
    if (alpha < 0.002) discard;

    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`

export function InfiniteGrid() {
  const materialRef = useRef<ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color('#4a4a4a') },
      uSectionColor: { value: new Color('#6e6e6e') },
      uXAxisColor: { value: new Color('#e53935') },
      uZAxisColor: { value: new Color('#1e88e5') },
      uOpacity: { value: 0.85 },
      uSectionOpacity: { value: 0.95 },
      uAxisOpacity: { value: 1 },
      uCellSize: { value: INCH },
      uSectionSize: { value: INCH * 12 },
      uFadeDistance: { value: 40 },
      uCameraPosition: { value: new Vector3() },
    }),
    [],
  )

  useFrame(({ camera }) => {
    const material = materialRef.current
    if (!material) return

    material.uniforms.uCameraPosition.value.copy(camera.position)
    material.uniforms.uFadeDistance.value = Math.max(camera.position.length() * 2.5, 8)
  })

  return (
    <mesh rotation-x={-Math.PI / 2} frustumCulled={false} renderOrder={-1} raycast={() => {}}>
      <planeGeometry />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        side={DoubleSide}
        toneMapped={false}
      />
    </mesh>
  )
}
