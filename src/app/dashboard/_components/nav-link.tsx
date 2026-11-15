'use client'

import Link, { useLinkStatus } from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

/**
 * Shows a spinner inside the link the instant it is clicked, while the next
 * server render is in flight. Pair with app/dashboard/loading.tsx so the route
 * shell is prefetched and navigation feels immediate.
 */
function PendingIndicator({ className = '' }: { className?: string }) {
  const { pending } = useLinkStatus()
  return (
    <span
      aria-hidden="true"
      className={`h-3 w-3 shrink-0 rounded-full border-2 border-current border-t-transparent transition-opacity ${
        pending ? 'animate-spin opacity-70' : 'opacity-0'
      } ${className}`}
    />
  )
}

export function NavLink({
  children,
  active,
  className,
  activeClassName = '',
  inactiveClassName = '',
  showPending = true,
  ...props
}: ComponentProps<typeof Link> & {
  children: ReactNode
  active?: boolean
  activeClassName?: string
  inactiveClassName?: string
  showPending?: boolean
}) {
  return (
    <Link
      {...props}
      aria-current={active ? 'page' : undefined}
      className={`${className ?? ''} ${active ? activeClassName : inactiveClassName}`}
    >
      {children}
      {showPending && <PendingIndicator className="ml-auto" />}
    </Link>
  )
}
