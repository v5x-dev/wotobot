const MILLIMETERS_TO_INCHES = 1 / 25.4
const METERS_TO_INCHES = 39.37007874015748

const MODEL_SCALES: Record<string, number> = {
  'Electronics/5.5WMotor.fbx': MILLIMETERS_TO_INCHES,
  'Shafts and Hardware/HSBlockBearing.fbx': MILLIMETERS_TO_INCHES,
  'Shafts and Hardware/LSandCollarBearing.fbx': MILLIMETERS_TO_INCHES,
  'Shafts and Hardware/Wheels/V2OmniWheels.fbx': MILLIMETERS_TO_INCHES,
  'Shafts and Hardware/Wheels/V2TractionWheels.fbx': MILLIMETERS_TO_INCHES,
  'Shafts and Hardware/shaftcollar.fbx': METERS_TO_INCHES,
  'pnmatics/25mm Stroke Pneumatic Cylinder.fbx': METERS_TO_INCHES,
  'pnmatics/50mmPiston.fbx': METERS_TO_INCHES,
  'pnmatics/75mmPiston2.fbx': METERS_TO_INCHES,
  'pnmatics/NewRes.fbx': METERS_TO_INCHES,
  'pnmatics/25mmextended.fbx': 0.01,
  'pnmatics/50mmextended.fbx': 0.01,
  'pnmatics/75mmextended.fbx': 0.01,
}

export function modelScaleFor(fbx: string, meshName = '') {
  if (
    fbx === 'Shafts and Hardware/Wheels/V2OmniWheels.fbx'
    && meshName.startsWith('275 (220mm Travel)')
  ) return 1
  return MODEL_SCALES[fbx] ?? 1
}
