export const AVATAR_CONFIG = {
  TOTAL_AVATARS: 6,
  BASE_PATH: "/avatars",
  DEFAULT_AVATAR: "avatar_1",
  FILE_EXTENSION: ".png",
} as const

export type AvatarId = `avatar_${number}`

export const getAvatarPath = (avatarId?: string | null): string => {
  if (avatarId && (avatarId.startsWith('/') || avatarId.startsWith('http'))) {
    return avatarId
  }
  const safeId = avatarId && isValidAvatarId(avatarId) ? avatarId : AVATAR_CONFIG.DEFAULT_AVATAR
  return `${AVATAR_CONFIG.BASE_PATH}/${safeId}${AVATAR_CONFIG.FILE_EXTENSION}`
}

export const getAvailableAvatars = (): AvatarId[] =>
  Array.from({ length: AVATAR_CONFIG.TOTAL_AVATARS }, (_, index) => `avatar_${index + 1}` as AvatarId)

export const isValidAvatarId = (avatarId: string | null | undefined): avatarId is AvatarId =>
  Boolean(avatarId && getAvailableAvatars().includes(avatarId as AvatarId))

export const getDefaultAvatarId = (): AvatarId => AVATAR_CONFIG.DEFAULT_AVATAR as AvatarId

export const getUserAvatarPath = (avatarId?: string | null): string => getAvatarPath(avatarId)
