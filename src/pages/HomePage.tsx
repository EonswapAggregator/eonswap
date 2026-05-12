import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Landing } from '../components/Landing'

export function HomePage() {
  const { pathname, hash, key } = useLocation()

  useEffect(() => {
    if (hash === '#features') {
      const id = window.setTimeout(() => {
        document
          .getElementById('features')
          ?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
      return () => window.clearTimeout(id)
    }
    if (!hash) {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash, key])

  return <Landing />
}
