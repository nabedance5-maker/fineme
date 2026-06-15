'use client'

import { useEffect, useRef } from 'react'

export function AnimatedSection({ children, className = '', direction = 'up', delay = 0 }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    el.style.opacity = '0'
    el.style.transition = `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`
    if (direction === 'up') el.style.transform = 'translateY(32px)'
    if (direction === 'left') el.style.transform = 'translateX(-32px)'
    if (direction === 'right') el.style.transform = 'translateX(32px)'

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1'
          el.style.transform = 'none'
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [direction, delay])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

export function HeroTitle({ children }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(24px)'
    el.style.transition = 'opacity 1s ease 200ms, transform 1s ease 200ms'
    requestAnimationFrame(() => {
      el.style.opacity = '1'
      el.style.transform = 'none'
    })
  }, [])

  return <div ref={ref}>{children}</div>
}
