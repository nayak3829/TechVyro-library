import { describe, expect, it } from "vitest"

import {
  getBoundedText,
  getTelegramAdminChatSessionId,
  getTelegramSessionCallbackData,
  isAdminChatSessionId,
  isValidPollCursor,
} from "./admin-chat-validation"

describe("admin chat input validation", () => {
  const capability = "8f44eb32-397c-4ff2-8ba0-c2d8d4a06122"

  it("accepts only complete UUID v4 capabilities", () => {
    expect(isAdminChatSessionId(capability)).toBe(true)
    expect(isAdminChatSessionId("8F44EB32")).toBe(false)
    expect(isAdminChatSessionId("8f44eb32-397c-1ff2-8ba0-c2d8d4a06122")).toBe(false)
    expect(isAdminChatSessionId(`${capability}extra`)).toBe(false)
  })

  it("accepts UUID and legacy short IDs at the Telegram boundary", () => {
    expect(getTelegramAdminChatSessionId(capability)).toBe(capability)
    expect(getTelegramAdminChatSessionId("ab12cd")).toBe("AB12CD")
    expect(getTelegramAdminChatSessionId("not-a-session")).toBeNull()
    expect(getTelegramAdminChatSessionId(`${capability}:Student`)).toBeNull()
  })

  it("creates callback data that fits Telegram's 64-byte limit", () => {
    const replyData = getTelegramSessionCallbackData("reply", capability)
    const endData = getTelegramSessionCallbackData("end", capability)

    expect(replyData).toBe(`reply:${capability}`)
    expect(endData).toBe(`end:${capability}`)
    expect(new TextEncoder().encode(replyData!).byteLength).toBeLessThanOrEqual(64)
    expect(new TextEncoder().encode(endData!).byteLength).toBeLessThanOrEqual(64)
    expect(getTelegramSessionCallbackData("reply", "not_valid")).toBeNull()
  })

  it("trims text and rejects blank, non-string, and oversized input", () => {
    expect(getBoundedText("  Hello  ", 5)).toBe("Hello")
    expect(getBoundedText("   ", 5)).toBeNull()
    expect(getBoundedText(123, 5)).toBeNull()
    expect(getBoundedText("toolong", 5)).toBeNull()
  })

  it("rejects malformed and implausibly future poll cursors", () => {
    expect(isValidPollCursor(null)).toBe(true)
    expect(isValidPollCursor("not-a-date")).toBe(false)
    expect(isValidPollCursor(new Date(Date.now() + 120_000).toISOString())).toBe(false)
  })
})