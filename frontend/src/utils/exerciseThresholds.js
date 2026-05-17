// Rep counting state machine: 'extended' -> 'contracted' -> 'extended' = 1 rep

export const EXERCISES = {
  squat: {
    label: 'Squat',
    repAngle: 'leftKnee',
    contractedBelow: 100,
    extendedAbove: 160,
    injuryRisk: {
      check: (angles) => angles.leftKnee < 60 || angles.rightKnee < 60,
      message: 'Knees too deep — risk of joint stress. Keep knees above 70°.',
    },
    goodForm: (angles) => angles.leftKnee > 85 && angles.leftKnee < 120,
    feedback: {
      good: 'Good squat depth!',
      low: 'Go lower — aim for 90°',
      high: 'Stand taller at the top',
    },
  },

  bicep_curl: {
    label: 'Bicep Curl',
    repAngle: 'leftElbow',
    contractedBelow: 60,
    extendedAbove: 150,
    injuryRisk: {
      check: (angles) => angles.leftShoulder > 45,
      message: 'Keep elbow tucked — shoulder swinging detected.',
    },
    goodForm: (angles) => angles.leftElbow > 40 && angles.leftElbow < 70,
    feedback: {
      good: 'Good curl!',
      low: 'Curl all the way up',
      high: 'Extend fully at the bottom',
    },
  },

  push_up: {
    label: 'Push Up',
    repAngle: 'leftElbow',
    contractedBelow: 90,
    extendedAbove: 160,
    injuryRisk: {
      check: (angles) => angles.leftHip < 150 || angles.rightHip < 150,
      message: 'Keep your body straight — hips are sagging.',
    },
    goodForm: (angles) => angles.leftElbow < 95 && angles.leftElbow > 70,
    feedback: {
      good: 'Great push-up!',
      low: 'Lower your chest to the ground',
      high: 'Fully extend arms at the top',
    },
  },

  deadlift: {
    label: 'Deadlift',
    repAngle: 'leftHip',
    contractedBelow: 140,
    extendedAbove: 170,
    injuryRisk: {
      check: (angles) => angles.leftHip < 100 && angles.leftKnee > 160,
      message: 'Spine rounding detected — engage your core, keep back flat.',
    },
    goodForm: (angles) => angles.leftHip > 130 && angles.leftKnee > 155,
    feedback: {
      good: 'Good hip hinge!',
      low: 'Drive hips back further',
      high: 'Stand tall at the top',
    },
  },
}

// Returns updated { count, phase } state
export function updateRepCount(state, angles, exercise) {
  const config = EXERCISES[exercise]
  if (!config || !angles) return state

  const angle = angles[config.repAngle]
  if (angle === undefined) return state

  let { count, phase } = state

  if (phase === 'extended' && angle < config.contractedBelow) {
    phase = 'contracted'
  } else if (phase === 'contracted' && angle > config.extendedAbove) {
    phase = 'extended'
    count += 1
  }

  return { count, phase }
}
