'use client'

import { useEffect, useState } from 'react'

export function useIsPortraitMobile() {
  const [is, setIs] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 768px) and (orientation: portrait)').matches
      : false
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px) and (orientation: portrait)')
    setIs(mq.matches)
    const h = () => setIs(mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return is
}
