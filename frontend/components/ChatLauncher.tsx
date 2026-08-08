"use client"

import { ChatIcon } from "./Icons"

// A floating launcher rather than a sidebar row, so the assistant stays
// reachable from every view without occupying permanent navigation space.
export default function ChatLauncher({
  hidden,
  onOpen,
}: {
  hidden: boolean
  onOpen: () => void
}) {
  // Hidden on the assistant itself, where it would sit over the composer.
  if (hidden) {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Chat and ask about documents"
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-accent text-onaccent shadow-pop outline-none transition-transform duration-150 hover:scale-105 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:scale-95"
      >
        <ChatIcon className="h-6 w-6" />

        {/* Absolutely positioned inside the button so the label adds no hover
            area of its own, which would otherwise make an apparently empty
            strip to the left of the circle reveal the tooltip. */}
        <span className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-xl border border-line bg-surface px-3.5 py-2.5 text-right opacity-0 shadow-pop transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100">
          <span className="block text-[12.5px] font-medium text-ink">
            Chat and ask about documents
          </span>
          <span className="block text-[11px] text-ink-4">
            Answers cite clauses from the open contract
          </span>
        </span>
      </button>
    </div>
  )
}
