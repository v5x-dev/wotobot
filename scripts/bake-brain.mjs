import { readFileSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { MeshBVH } from 'three-mesh-bvh'
import { Vector3, Triangle } from 'three'

const SIZE = 1024
const PAD = 8

function loadFbx(path) {
  const buffer = readFileSync(path)
  return new FBXLoader().parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '')
}

function firstMesh(root) {
  let mesh
  root.traverse((obj) => { if (obj.isMesh && !mesh) mesh = obj })
  return mesh
}

function crc32(data) {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(tag, data) {
  const out = Buffer.alloc(8 + data.length + 4)
  out.writeUInt32BE(data.length, 0)
  out.write(tag, 4)
  data.copy(out, 8)
  const crcBuf = Buffer.alloc(4 + data.length)
  crcBuf.write(tag, 0)
  data.copy(crcBuf, 4)
  out.writeUInt32BE(crc32(crcBuf), 8 + data.length)
  return out
}

function writePng(path, w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  writeFileSync(path, png)
}

function dilate(rgb, mask, w, h, radius) {
  const next = Buffer.from(rgb)
  const nextMask = Buffer.from(mask)
  for (let pass = 0; pass < radius; pass++) {
    rgb.set(next)
    mask.set(nextMask)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (mask[i]) continue
        let found = false
        for (let dy = -1; dy <= 1 && !found; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
            const ni = ny * w + nx
            if (!mask[ni]) continue
            next[i * 3] = rgb[ni * 3]
            next[i * 3 + 1] = rgb[ni * 3 + 1]
            next[i * 3 + 2] = rgb[ni * 3 + 2]
            nextMask[i] = 1
            found = true
            break
          }
        }
      }
    }
  }
  rgb.set(next)
}

const low = firstMesh(loadFbx('public/protobot-models/Electronics/Brain.fbx'))
const high = firstMesh(loadFbx('/tmp/Brain-original.fbx'))
const lpos = low.geometry.getAttribute('position')
const luv = low.geometry.getAttribute('uv')
const hpos = high.geometry.getAttribute('position')
const hnrm = high.geometry.getAttribute('normal')
const groups = high.geometry.groups
const mats = Array.isArray(high.material) ? high.material : [high.material]
const colors = mats.map((m) => {
  const c = m.color
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)]
})

function materialOfFace(faceIndex) {
  const v = faceIndex * 3
  for (const g of groups) {
    if (v >= g.start && v < g.start + g.count) return g.materialIndex
  }
  return 0
}

console.time('bvh')
const bvh = new MeshBVH(high.geometry)
console.timeEnd('bvh')

const albedo = Buffer.alloc(SIZE * SIZE * 3, 0)
const normal = Buffer.alloc(SIZE * SIZE * 3, 128)
const mask = Buffer.alloc(SIZE * SIZE, 0)
const hit = { point: new Vector3() }
const p = new Vector3()
const n = new Vector3()
const a = new Vector3()
const b = new Vector3()
const c = new Vector3()
const bary = new Vector3()
const tri = new Triangle()
const na = new Vector3()
const nb = new Vector3()
const nc = new Vector3()

function writePixel(x, y, w0, w1, w2, i0, i1, i2) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return
  p.set(
    lpos.getX(i0) * w0 + lpos.getX(i1) * w1 + lpos.getX(i2) * w2,
    lpos.getY(i0) * w0 + lpos.getY(i1) * w1 + lpos.getY(i2) * w2,
    lpos.getZ(i0) * w0 + lpos.getZ(i1) * w1 + lpos.getZ(i2) * w2,
  )
  const result = bvh.closestPointToPoint(p, hit, 0, 2)
  if (!result) return
  const face = result.faceIndex
  const v = face * 3
  a.fromBufferAttribute(hpos, v)
  b.fromBufferAttribute(hpos, v + 1)
  c.fromBufferAttribute(hpos, v + 2)
  tri.set(a, b, c)
  tri.getBarycoord(result.point, bary)
  na.fromBufferAttribute(hnrm, v)
  nb.fromBufferAttribute(hnrm, v + 1)
  nc.fromBufferAttribute(hnrm, v + 2)
  n.set(0, 0, 0).addScaledVector(na, bary.x).addScaledVector(nb, bary.y).addScaledVector(nc, bary.z)
  if (n.lengthSq() < 1e-8) tri.getNormal(n)
  else n.normalize()
  const imgY = SIZE - 1 - y
  const idx = imgY * SIZE + x
  const col = colors[materialOfFace(face)]
  albedo[idx * 3] = col[0]
  albedo[idx * 3 + 1] = col[1]
  albedo[idx * 3 + 2] = col[2]
  normal[idx * 3] = Math.round((n.x * 0.5 + 0.5) * 255)
  normal[idx * 3 + 1] = Math.round((n.y * 0.5 + 0.5) * 255)
  normal[idx * 3 + 2] = Math.round((n.z * 0.5 + 0.5) * 255)
  mask[idx] = 1
}

console.time('raster')
let filled = 0
for (let i = 0; i < luv.count; i += 3) {
  const u0 = luv.getX(i), v0 = luv.getY(i)
  const u1 = luv.getX(i + 1), v1 = luv.getY(i + 1)
  const u2 = luv.getX(i + 2), v2 = luv.getY(i + 2)
  const minx = Math.max(0, Math.floor(Math.min(u0, u1, u2) * SIZE))
  const maxx = Math.min(SIZE - 1, Math.ceil(Math.max(u0, u1, u2) * SIZE))
  const miny = Math.max(0, Math.floor(Math.min(v0, v1, v2) * SIZE))
  const maxy = Math.min(SIZE - 1, Math.ceil(Math.max(v0, v1, v2) * SIZE))
  const area = (u1 - u0) * (v2 - v0) - (v1 - v0) * (u2 - u0)
  if (Math.abs(area) < 1e-12) continue
  for (let y = miny; y <= maxy; y++) {
    for (let x = minx; x <= maxx; x++) {
      const u = (x + 0.5) / SIZE
      const v = (y + 0.5) / SIZE
      const w0 = ((u1 - u) * (v2 - v1) - (v1 - v) * (u2 - u1)) / area
      const w1 = ((u2 - u) * (v0 - v2) - (v2 - v) * (u0 - u2)) / area
      const w2 = 1 - w0 - w1
      if (w0 < -1e-5 || w1 < -1e-5 || w2 < -1e-5) continue
      writePixel(x, y, w0, w1, w2, i, i + 1, i + 2)
      filled++
    }
  }
}
console.timeEnd('raster')
console.log('filled samples', filled)

dilate(albedo, mask, SIZE, SIZE, PAD)
const nmask = Buffer.from(mask)
dilate(normal, nmask, SIZE, SIZE, PAD)

writePng('public/protobot-models/Electronics/Brain.png', SIZE, SIZE, albedo)
writePng('public/protobot-models/Electronics/BrainNormal.png', SIZE, SIZE, normal)
console.log('wrote maps', SIZE)
