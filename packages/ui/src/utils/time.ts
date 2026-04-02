/**
 * Format message timestamp for display in message list
 *
 * Rules:
 * - Same day: "HH:mm"
 * - Yesterday: "昨天 HH:mm"
 * - Within this year: "MM-DD HH:mm"
 * - Older: "YYYY-MM-DD HH:mm"
 */
export function formatMsgTime(timestamp: number): string {
  const date = new Date(timestamp * 1000) // Unix timestamp to Date
  const now = new Date()

  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth()
  const nowDay = now.getDate()

  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const timeStr = `${hours}:${minutes}`

  // Same day
  if (year === nowYear && month === nowMonth && day === nowDay) {
    return timeStr
  }

  // Yesterday
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (year === yesterday.getFullYear() && month === yesterday.getMonth() && day === yesterday.getDate()) {
    return `昨天 ${timeStr}`
  }

  // Same year
  if (year === nowYear) {
    return `${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${timeStr}`
  }

  // Older
  return `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${timeStr}`
}

/**
 * Format relative time like "刚刚", "5分钟前", "1小时前"
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = Math.floor((now - timestamp * 1000) / 1000) // seconds

  if (diff < 60) {
    return '刚刚'
  }

  const minutes = Math.floor(diff / 60)
  if (minutes < 60) {
    return `${minutes}分钟前`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}小时前`
  }

  const days = Math.floor(hours / 24)
  if (days < 7) {
    return `${days}天前`
  }

  // Fall back to absolute time
  return formatMsgTime(timestamp)
}

/**
 * Check if two timestamps should show a time separator between messages
 * (i.e., if the gap is more than 5 minutes)
 */
export function shouldShowTimeSeparator(timestamp1: number, timestamp2: number): boolean {
  const diffMinutes = Math.abs(timestamp2 - timestamp1) / 60
  return diffMinutes >= 5
}
