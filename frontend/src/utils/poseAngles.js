// Calculate angle (degrees) at point B formed by A-B-C
export function angleBetween(a, b, c) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs((radians * 180) / Math.PI)
  if (angle > 180) angle = 360 - angle
  return angle
}

// Extract joint angles from MediaPipe PoseLandmarker landmarks array (33 points)
// Landmark indices: 11=lShoulder, 12=rShoulder, 13=lElbow, 14=rElbow,
// 15=lWrist, 16=rWrist, 23=lHip, 24=rHip, 25=lKnee, 26=rKnee, 27=lAnkle, 28=rAnkle
export function extractAngles(landmarks) {
  if (!landmarks || landmarks.length < 29) return null

  const lShoulder = landmarks[11]
  const rShoulder = landmarks[12]
  const lElbow    = landmarks[13]
  const rElbow    = landmarks[14]
  const lWrist    = landmarks[15]
  const rWrist    = landmarks[16]
  const lHip      = landmarks[23]
  const rHip      = landmarks[24]
  const lKnee     = landmarks[25]
  const rKnee     = landmarks[26]
  const lAnkle    = landmarks[27]
  const rAnkle    = landmarks[28]

  return {
    leftElbow:    angleBetween(lShoulder, lElbow, lWrist),
    rightElbow:   angleBetween(rShoulder, rElbow, rWrist),
    leftKnee:     angleBetween(lHip, lKnee, lAnkle),
    rightKnee:    angleBetween(rHip, rKnee, rAnkle),
    leftHip:      angleBetween(lShoulder, lHip, lKnee),
    rightHip:     angleBetween(rShoulder, rHip, rKnee),
    leftShoulder: angleBetween(lElbow, lShoulder, lHip),
    rightShoulder:angleBetween(rElbow, rShoulder, rHip),
  }
}
