export function isValidLocation(location: { latitude: number; longitude: number }): boolean {
  const { latitude, longitude } = location

  if (typeof latitude !== 'number' || Number.isNaN(latitude)) {
    console.error('[WlMsgList] Invalid location: latitude is not a valid number', location)
    return false
  }

  if (typeof longitude !== 'number' || Number.isNaN(longitude)) {
    console.error('[WlMsgList] Invalid location: longitude is not a valid number', location)
    return false
  }

  if (latitude < -90 || latitude > 90) {
    console.error('[WlMsgList] Invalid location: latitude must be between -90 and 90', location)
    return false
  }

  if (longitude < -180 || longitude > 180) {
    console.error('[WlMsgList] Invalid location: longitude must be between -180 and 180', location)
    return false
  }

  return true
}
