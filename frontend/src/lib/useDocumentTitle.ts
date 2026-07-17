import { useEffect } from 'react'

// Plain react-router v6/v7 `Routes`/`Route` (not the data-router API with
// route `handle` metadata) has no built-in per-page title support, so each
// page calls this directly instead of pulling in a routing-metadata library.
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = `${title} · Lost & Found Pet Matcher`
    return () => {
      document.title = previous
    }
  }, [title])
}
