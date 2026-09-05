import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useRef, useState } from "react"
import { afterEach, describe, expect, it } from "vitest"

import { useDialogFocus } from "./use-dialog-focus"

function FocusHarness({ modal = true }: { modal?: boolean }) {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstRef = useRef<HTMLButtonElement>(null)
  useDialogFocus({
    active: open,
    containerRef: dialogRef,
    initialFocusRef: firstRef,
    onEscape: () => setOpen(false),
    trap: modal,
    modal,
  })

  return (
    <>
      <button onClick={() => setOpen(true)}>Open panel</button>
      {open && (
        <div ref={dialogRef} role="dialog" aria-modal={modal ? "true" : undefined} tabIndex={-1}>
          <button ref={firstRef}>First action</button>
          <button onClick={() => setOpen(false)}>Last action</button>
        </div>
      )}
    </>
  )
}

afterEach(() => {
  document.body.innerHTML = ""
})

describe("useDialogFocus", () => {
  it("moves focus in, wraps Tab, dismisses on Escape, and restores the opener", async () => {
    const background = document.createElement("main")
    document.body.appendChild(background)
    render(<FocusHarness />)
    const opener = screen.getByRole("button", { name: "Open panel" })
    opener.focus()
    fireEvent.click(opener)

    const first = screen.getByRole("button", { name: "First action" })
    const last = screen.getByRole("button", { name: "Last action" })
    await waitFor(() => expect(first).toHaveFocus())
    expect(background).toHaveAttribute("inert")

    last.focus()
    fireEvent.keyDown(document, { key: "Tab" })
    expect(first).toHaveFocus()

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true })
    expect(last).toHaveFocus()

    fireEvent.keyDown(document, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(opener).toHaveFocus())
    expect(background).not.toHaveAttribute("inert")
  })

  it("does not trap focus or claim modal semantics for a floating panel", async () => {
    render(<FocusHarness modal={false} />)
    fireEvent.click(screen.getByRole("button", { name: "Open panel" }))
    const dialog = screen.getByRole("dialog")
    const last = screen.getByRole("button", { name: "Last action" })
    await waitFor(() => expect(screen.getByRole("button", { name: "First action" })).toHaveFocus())

    last.focus()
    fireEvent.keyDown(document, { key: "Tab" })
    expect(last).toHaveFocus()
    expect(dialog).not.toHaveAttribute("aria-modal")
  })
})