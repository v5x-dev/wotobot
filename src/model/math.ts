import { Euler, Matrix4, Quaternion, Vector3 } from 'three'

export type Vec3 = [number, number, number]
export type Quat = [number, number, number, number]

const _euler = new Euler()
const _quat = new Quaternion()
const _local = new Quaternion()
const _pos = new Vector3()
const _fwd = new Vector3()
const _up = new Vector3()
const _right = new Vector3()
const _matrix = new Matrix4()

export function eulerToQuat(rotation: Vec3, target = new Quaternion()) {
  return target.setFromEuler(_euler.set(rotation[0], rotation[1], rotation[2], 'XYZ'))
}

export function quatToEuler(quat: Quaternion): Vec3 {
  _euler.setFromQuaternion(quat, 'XYZ')
  return [_euler.x, _euler.y, _euler.z]
}

export function quatFromArray(value: Quat, target = new Quaternion()) {
  return target.set(value[0], value[1], value[2], value[3])
}

export function lookRotation(forward: Vector3, up: Vector3, target = new Quaternion()) {
  _fwd.copy(forward)
  if (_fwd.lengthSq() < 1e-10) _fwd.set(0, 0, 1)
  else _fwd.normalize()
  _right.copy(up).cross(_fwd)
  if (_right.lengthSq() < 1e-10) {
    _up.set(0, 1, 0)
    if (Math.abs(_fwd.dot(_up)) > 0.999) _up.set(1, 0, 0)
    _right.copy(_up).cross(_fwd)
  }
  _right.normalize()
  _up.copy(_fwd).cross(_right).normalize()
  _matrix.makeBasis(_right, _up, _fwd)
  return target.setFromRotationMatrix(_matrix)
}

export function worldPosition(local: Vec3, partPosition: Vec3, partRotation: Vec3, target = new Vector3()) {
  eulerToQuat(partRotation, _quat)
  return target.set(local[0], local[1], local[2]).applyQuaternion(_quat).add(_pos.set(...partPosition))
}

export function worldQuaternion(local: Quat, partRotation: Vec3, target = new Quaternion()) {
  eulerToQuat(partRotation, _quat)
  return target.copy(_quat).multiply(quatFromArray(local, _local))
}

export function worldForward(local: Quat, partRotation: Vec3, target = new Vector3()) {
  worldQuaternion(local, partRotation, _quat)
  return target.set(0, 0, 1).applyQuaternion(_quat).normalize()
}

export function cloneVec3(value: Vec3): Vec3 {
  return [value[0], value[1], value[2]]
}
