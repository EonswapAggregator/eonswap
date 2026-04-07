import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SwapDashboard } from '../components/SwapDashboard'

export function SwapPage() {
  const { hash, key } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (hash === '#activity') {
      navigate('/activity', { replace: true })
      return
    }
    window.scrollTo(0, 0)
  }, [hash, key, navigate])

  return <SwapDashboard />
}
