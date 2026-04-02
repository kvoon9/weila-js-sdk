export interface TextEmojiToken {
  type: 'text' | 'emoji'
  value: string
}

const EMOJI_PATTERN =
  /\[(?:微笑|呲牙|傲慢|酷|白眼|不高兴|笑哭|闭嘴|持刀|大汗|发怒|感冒|鬼脸|害羞|汗|花痴|滑稽|坏笑|机智|惊吓|可怜|抠鼻|哭|左哼哼|右哼哼|苦笑|困|懒|流鼻血|亲亲|糗|热泪|认真|伤心|衰|委屈|疑问|邪恶|斜眼|中指|加好友|再见|皱眉|吐舌|赞|弱|OK|晕|吐|紫薇别走|大刀|鬼魂|骷髅|魔鬼|玫瑰|枯萎|心|心碎|药丸|咖啡|棒球|橙汁|篮球|礼物|啤酒|气球|眼镜|桌球|足球|0|1|2|3|4|5|6|7|8|9)\]/g

export function parseTextWithEmoji(text: string): TextEmojiToken[] {
  if (!text) return []

  const tokens: TextEmojiToken[] = []
  let lastIndex = 0
  let match

  while ((match = EMOJI_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    tokens.push({ type: 'emoji', value: match[0] })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return tokens
}

export * from './time'

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
