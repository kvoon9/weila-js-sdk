/**
 * Format message timestamp for display in message list
 *
 * Rules:
 * - Same day: "HH:mm"
 * - Yesterday: translated "Yesterday HH:mm"
 * - Within this year: "MM-DD HH:mm"
 * - Older: "YYYY-MM-DD HH:mm"
 */
import type { WeilaUiTranslate } from '../i18n'
import { translateWeilaUi } from '../i18n'

export function formatMsgTime(timestamp: number, translate?: WeilaUiTranslate): string {
  const t = translate ?? translateWeilaUi
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
    return t('time.yesterday', { time: timeStr })
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
export function formatTimeAgo(timestamp: number, translate?: WeilaUiTranslate): string {
  const t = translate ?? translateWeilaUi
  const now = Date.now()
  const diff = Math.floor((now - timestamp * 1000) / 1000) // seconds

  if (diff < 60) {
    return t('time.justNow')
  }

  const minutes = Math.floor(diff / 60)
  if (minutes < 60) {
    return t('time.minutesAgo', { minutes })
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return t('time.hoursAgo', { hours })
  }

  const days = Math.floor(hours / 24)
  if (days < 7) {
    return t('time.daysAgo', { days })
  }

  // Fall back to absolute time
  return formatMsgTime(timestamp, t)
}

/**
 * Check if two timestamps should show a time separator between messages
 * (i.e., if the gap is more than 5 minutes)
 */
export function shouldShowTimeSeparator(timestamp1: number, timestamp2: number): boolean {
  const diffMinutes = Math.abs(timestamp2 - timestamp1) / 60
  return diffMinutes >= 5
}
