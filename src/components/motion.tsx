import { useEffect, useRef, type ReactNode } from 'react'
import { motion, animate, useInView, useReducedMotion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1] as const

export function FadeUp({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

export function Stagger({ children, className, step = 0.06 }: { children: ReactNode; className?: string; step?: number }) {
  return (
    <motion.div className={className} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: step } } }}>
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{ hidden: { opacity: 0, y: 18, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE } } }}
    >
      {children}
    </motion.div>
  )
}

export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const last = useRef(0)

  useEffect(() => {
    if (!inView || !ref.current) return
    const node = ref.current
    if (reduce) { node.textContent = String(value); last.current = value; return }
    const controls = animate(last.current, value, {
      duration: 0.9,
      ease: EASE,
      onUpdate: (v) => { node.textContent = String(Math.round(v)) },
    })
    last.current = value
    return () => controls.stop()
  }, [value, inView, reduce])

  return <span ref={ref} className={className}>0</span>
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? ''}`} />
}
