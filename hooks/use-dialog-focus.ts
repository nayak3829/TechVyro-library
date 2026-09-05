"use client"

import { RefObject, useEffect, useRef } from "react"

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

interface DialogFocusOptions {
  active: boolean
  containerRef: RefObject<HTMLElement | null>
  initialFocusRef?: RefObject<HTMLElement | null>
  onEscape: () => void
  trap?: boolean
  modal?: boolean
}

/**
 * Shared focus lifecycle for dialogs and floating, non-modal panels.
 * Modal dialogs trap focus and temporarily make body-level siblings inert.
 */
export function useDialogFocus({
  active,
  containerRef,
  initialFocusRef,
  onEscape,
  trap = true,
  modal = true,
}: DialogFocusOptions) {
  const openerRef = useRef<HTMLElement | null>(null)
  const onEscapeRef = useRef(onEscape)
  onEscapeRef.current = onEscape

  useEffect(() => {
    if (!active) return

    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const container = containerRef.current
    if (!container) return

    const bodyChild = Array.from(document.body.children).find(child => child.contains(container))
    const inerted = modal
      ? Array.from(document.body.children).filter(child => child !== bodyChild && !child.hasAttribute("inert"))
      : []
    inerted.forEach(element => element.setAttribute("inert", ""))

    const focusInitial = () => {
      const target = initialFocusRef?.current
        ?? container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
        ?? container
      target.focus()
    }
    const frame = requestAnimationFrame(focusInitial)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        onEscapeRef.current()
        return
      }
      if (!trap || event.key !== "Tab") return

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter(element => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true")
      if (focusable.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const keepFocusInside = (event: FocusEvent) => {
      if (trap && !container.contains(event.target as Node)) focusInitial()
    }

    document.addEventListener("keydown", handleKeyDown, true)
    if (trap) document.addEventListener("focusin", keepFocusInside)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener("keydown", handleKeyDown, true)
      document.removeEventListener("focusin", keepFocusInside)
      inerted.forEach(element => element.removeAttribute("inert"))
      const opener = openerRef.current
      requestAnimationFrame(() => {
        if (opener?.isConnected) opener.focus()
      })
    }
  }, [active, containerRef, initialFocusRef, modal, trap])
}