type IconProps = { className?: string }

const SIZE = "h-[18px] w-[18px]"

function Svg({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? SIZE}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function GridIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </Svg>
  )
}

export function FolderIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h9A1.5 1.5 0 0 1 21 10v7.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z" />
    </Svg>
  )
}

export function FileIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5Z" />
      <path d="M14 3v4.5h4.5" />
    </Svg>
  )
}

export function ScaleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 4v16" />
      <path d="M7 20h10" />
      <path d="M4 8h16" />
      <path d="M7 8l-3 6h6Z" />
      <path d="M17 8l-3 6h6Z" />
    </Svg>
  )
}

export function AlertIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 4.5 2.8 20h18.4Z" />
      <path d="M12 10v4" />
      <path d="M12 17.2h.01" />
    </Svg>
  )
}

export function ChatIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M21 12a7.5 7.5 0 0 1-7.5 7.5H8L4 22v-4.2A7.5 7.5 0 0 1 8.5 4.5h5A7.5 7.5 0 0 1 21 12Z" />
    </Svg>
  )
}

export function BookIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5Z" />
      <path d="M5 19.5A1.5 1.5 0 0 1 6.5 21H19" />
    </Svg>
  )
}

export function GearIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1 2 2 0 1 1-4 0 1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15a2 2 0 1 1 0-4 1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9.6 4.4a2 2 0 1 1 4 0 1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7 2 2 0 1 1 0 4 1.6 1.6 0 0 0-.8.9Z" />
    </Svg>
  )
}

export function BellIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5Z" />
      <path d="M13.7 19a2 2 0 0 1-3.4 0" />
    </Svg>
  )
}

export function SearchIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.6-3.6" />
    </Svg>
  )
}

export function UploadIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 16V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" />
    </Svg>
  )
}

export function SendIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M21 3 10.5 13.5" />
      <path d="M21 3l-6.8 18-3.7-7.5L3 9.8Z" />
    </Svg>
  )
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m14.5 6-6 6 6 6" />
    </Svg>
  )
}

export function DotsIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="5.5" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="12" cy="18.5" r="1.2" />
    </Svg>
  )
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3l7 3v5.5c0 4.3-2.9 7.9-7 9.5-4.1-1.6-7-5.2-7-9.5V6Z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  )
}
