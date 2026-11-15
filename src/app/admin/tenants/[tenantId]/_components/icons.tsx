import type { TabKey } from './types'

type IconProps = { className?: string }

const svgProps = { viewBox: '0 0 20 20', fill: 'currentColor', 'aria-hidden': true } as const

export function OverviewIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} {...svgProps}>
      <path d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75H4.25a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h4a.75.75 0 010 1.5h-4A2.25 2.25 0 012 15.75V4.25z" />
      <path d="M12.75 9a.75.75 0 01.75-.75h3.5a.75.75 0 01.75.75v6a.75.75 0 01-.75.75h-3.5a.75.75 0 01-.75-.75v-6z" />
    </svg>
  )
}

export function CodeIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} {...svgProps}>
      <path
        fillRule="evenodd"
        d="M6.28 5.22a.75.75 0 010 1.06L2.56 10l3.72 3.72a.75.75 0 01-1.06 1.06L.97 10.53a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0zm7.44 0a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function PersonIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} {...svgProps}>
      <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
    </svg>
  )
}

export function GearIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} {...svgProps}>
      <path
        fillRule="evenodd"
        d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function TeamIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} {...svgProps}>
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 4.163 1.225 1.225 0 01-.549 1.096A8.06 8.06 0 0114.5 16z" />
    </svg>
  )
}

export function DetailTabIcon({ id, className = 'h-3.5 w-3.5' }: { id: TabKey; className?: string }) {
  switch (id) {
    case 'overview':
      return <OverviewIcon className={className} />
    case 'embed':
      return <CodeIcon className={className} />
    case 'agent':
      return <PersonIcon className={className} />
    case 'integrations':
      return <GearIcon className={className} />
    default:
      return <TeamIcon className={className} />
  }
}

export function ChevronLeftIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} {...svgProps}>
      <path
        fillRule="evenodd"
        d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function ExternalIcon({ className = 'h-3.5 w-3.5' }: IconProps) {
  return (
    <svg className={className} {...svgProps}>
      <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h4a.75.75 0 010 1.5h-4z" clipRule="evenodd" />
      <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
    </svg>
  )
}

export function MicIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} {...svgProps}>
      <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
      <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.58 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
    </svg>
  )
}

export function ChatIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} {...svgProps}>
      <path fillRule="evenodd" d="M10 2c-4.418 0-8 3.134-8 7 0 1.76.74 3.37 1.97 4.6-.28 1.1-.94 2.12-1.87 2.87a.75.75 0 00.5 1.33c2.3 0 4.14-.9 5.23-1.92.7.08 1.43.12 2.17.12 4.418 0 8-3.134 8-7s-3.582-7-8-7z" clipRule="evenodd" />
    </svg>
  )
}

export function UsersIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} {...svgProps}>
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
    </svg>
  )
}

export function SparkleIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} {...svgProps}>
      <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a8.03 8.03 0 01-6.19 6.19l-1.192.24a1 1 0 000 1.96l1.192.24a8.03 8.03 0 016.19 6.19l.24 1.192a1 1 0 001.96 0l.24-1.192a8.03 8.03 0 016.19-6.19l1.192-.24a1 1 0 000-1.96l-1.192-.24a8.03 8.03 0 01-6.19-6.19l-.24-1.192z" />
    </svg>
  )
}

export function ChecklistIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} {...svgProps}>
      <path
        fillRule="evenodd"
        d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v11.5A2.25 2.25 0 0115.75 18H4.25A2.25 2.25 0 012 15.75V4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.72 9.72a.75.75 0 000 1.06l.25.25a.75.75 0 001.06 0l3-3a.75.75 0 00-1.06-1.06L6.5 8.44l-.47-.47zm6.47-2.78a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5a.75.75 0 01-.75-.75zm0 4.5a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5a.75.75 0 01-.75-.75z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function BuildingIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} {...svgProps}>
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function RefreshIcon({ className = 'h-3.5 w-3.5' }: IconProps) {
  return (
    <svg className={className} {...svgProps}>
      <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.75a.75.75 0 00-.75.75v4.482a.75.75 0 001.5 0v-2.148l.424.424a7 7 0 0011.89-3.23.75.75 0 00-1.502-.483zM4.688 8.576a5.5 5.5 0 019.201-2.466l.312.311H11.77a.75.75 0 000 1.5h4.482a.75.75 0 00.75-.75V2.689a.75.75 0 00-1.5 0v2.148l-.424-.424A7 7 0 003.186 7.643a.75.75 0 001.502.483z" clipRule="evenodd" />
    </svg>
  )
}

export function CheckCircleIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} {...svgProps}>
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  )
}
