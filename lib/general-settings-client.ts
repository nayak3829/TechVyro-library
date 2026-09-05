"use client"

export type PublicGeneralSettings = {
  whatsappChannelUrl?: string
  whatsappPopupEnabled?: boolean
  instagramUrl?: string
  facebookUrl?: string
  telegramUrl?: string
  [key: string]: unknown
}

let generalSettingsRequest: Promise<PublicGeneralSettings> | null = null

export function getPublicGeneralSettings() {
  if (!generalSettingsRequest) {
    generalSettingsRequest = fetch("/api/site-settings?key=general_settings")
      .then(response => {
        if (!response.ok) throw new Error("General settings unavailable")
        return response.json()
      })
      .then(data => (data.value || {}) as PublicGeneralSettings)
      .catch(error => {
        generalSettingsRequest = null
        throw error
      })
  }
  return generalSettingsRequest
}