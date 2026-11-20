import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { noteRoute } from '@/lib/routeTrail'

/** Keeps lib/routeTrail in sync with the router. Mount once, above all routes (Layout). */
export function useRouteTrail(): void {
  const { pathname } = useLocation()
  useEffect(() => noteRoute(pathname), [pathname])
}
