import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { format, subMonths, startOfMonth, isSameMonth, differenceInDays } from 'date-fns'
import { Users2, Timer, Percent, Download } from 'lucide-react'
import { useRequests } from '@/hooks/useRequests'
import { useActionItems } from '@/hooks/useActionItems'
import { CountUp, FadeUp } from '@/components/motion'
import { cn } from '@/lib/utils'

type Range = 3 | 6 | 12

const SEG = {
  converted: { label: 'Converted', color: 'hsl(var(--primary))' },
  review: { label: 'In review', color: 'hsl(205 80% 68%)' },
  rejected: { label: 'Rejected', color: 'hsl(12 85% 72%)' },
} as const

const DONUT = ['hsl(var(--primary))', 'hsl(160 55% 60%)', 'hsl(12 85% 72%)', 'hsl(205 80% 68%)', 'hsl(45 90% 65%)', 'hsl(0 0% 60%)']

function StatChip({ icon: Icon, value, suffix, label }: { icon: typeof Users2; value: number; suffix?: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="glass flex h-10 w-10 items-center justify-center rounded-full"><Icon size={16} /></span>
      <div>
        <div className="flex items-baseline gap-0.5"><CountUp value={value} className="text-lg font-semibold leading-none" />{suffix && <span className="text-sm font-semibold">{suffix}</span>}</div>
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

function Donut({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((a, d) => a + d.value, 0)
  const r = 46
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 120 120" className="-rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--foreground) / 0.08)" strokeWidth="12" />
          {total > 0 && data.map((d, i) => {
            const len = (d.value / total) * c
            const el = (
              <motion.circle
                key={d.label} cx="60" cy="60" r={r} fill="none" stroke={DONUT[i % DONUT.length]} strokeWidth="12" strokeLinecap="butt"
                strokeDasharray={`${Math.max(len - 2, 0)} ${c}`} strokeDashoffset={-offset}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 * i, duration: 0.5 }}
              />
            )
            offset += len
            return el
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <CountUp value={total} className="text-2xl font-semibold leading-none" />
          <span className="mt-0.5 text-[10px] text-muted-foreground">requests</span>
        </div>
      </div>
      <ul className="grid w-full grid-cols-1 gap-y-2 text-xs">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: DONUT[i % DONUT.length] }} />
            <span className="min-w-0 flex-1 truncate">{d.label}</span>
            <span className="font-semibold">{d.value}</span>
            <span className="w-9 text-right text-muted-foreground">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
        {data.length === 0 && <li className="text-muted-foreground">No data in this period.</li>}
      </ul>
    </div>
  )
}

function Spark({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1)
  const w = 240, h = 70
  const pts = values.map((v, i) => [(i / Math.max(values.length - 1, 1)) * w, h - 6 - (v / max) * (h - 14)] as const)
  const line = pts.map(([x, y]) => `${x},${y}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[70px] w-full" preserveAspectRatio="none">
      <motion.polygon points={`0,${h} ${line} ${w},${h}`} fill={color} opacity="0.14" initial={{ opacity: 0 }} animate={{ opacity: 0.14 }} />
      <motion.polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: 'easeOut' }} />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill={color} />)}
    </svg>
  )
}

export default function ReportsPage() {
  const { data: requests = [] } = useRequests()
  const { data: items = [] } = useActionItems()
  const [range, setRange] = useState<Range>(6)

  const months = useMemo(() => {
    const now = startOfMonth(new Date())
    return Array.from({ length: range }, (_, i) => subMonths(now, range - 1 - i))
  }, [range])

  const monthly = useMemo(() => months.map((m) => {
    const inMonth = requests.filter((r) => isSameMonth(new Date(r.created_at), m) && r.status !== 'archived')
    const converted = inMonth.filter((r) => ['converted', 'in_progress', 'waiting', 'completed'].includes(r.status)).length
    const rejected = inMonth.filter((r) => r.status === 'rejected').length
    const review = inMonth.length - converted - rejected
    const doneItems = items.filter((i) => i.completed_at && isSameMonth(new Date(i.completed_at), m)).length
    return { m, converted, rejected, review, total: inMonth.length, doneItems }
  }), [months, requests, items])

  const inRange = useMemo(() => requests.filter((r) => r.status !== 'archived' && new Date(r.created_at) >= months[0]), [requests, months])
  const maxTotal = Math.max(...monthly.map((x) => x.total), 1)
  const convertedTotal = monthly.reduce((a, x) => a + x.converted, 0)
  const convRate = inRange.length ? Math.round((convertedTotal / inRange.length) * 100) : 0

  const avgDays = useMemo(() => {
    const done = inRange.filter((r) => r.converted_at)
    if (!done.length) return 0
    return Math.round(done.reduce((a, r) => a + Math.max(0, differenceInDays(new Date(r.converted_at as string), new Date(r.created_at))), 0) / done.length)
  }, [inRange])

  const byOrg = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of inRange) { const k = r.organization?.trim() || 'Unspecified'; map.set(k, (map.get(k) ?? 0) + 1) }
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, 5).map(([label, value]) => ({ label, value }))
    const rest = sorted.slice(5).reduce((a, [, v]) => a + v, 0)
    return rest ? [...top, { label: 'Other', value: rest }] : top
  }, [inRange])

  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = [['Request ID', 'Name', 'Email', 'Phone', 'Organization', 'Status', 'Submitted', 'Deadline', 'Requirement'],
      ...requests.map((r) => [r.request_code, r.name_snapshot, r.email_snapshot, r.phone_snapshot, r.organization, r.status, r.created_at, r.deadline, r.requirement])]
    const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `requests-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="h-full overflow-y-auto px-3 pb-8 md:px-6">
      <div className="mb-5 flex flex-wrap items-center gap-x-7 gap-y-3">
        <h1 className="text-[30px] font-light leading-[1.02] tracking-tight md:text-[38px]">Growth <br className="hidden md:block" />Reports</h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <StatChip icon={Users2} value={inRange.length} label={`New requests, last ${range} months`} />
          <StatChip icon={Percent} value={convRate} suffix="%" label="Conversion rate" />
          <StatChip icon={Timer} value={avgDays} label="Avg days to convert" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="glass flex items-center rounded-full p-1">
            {([3, 6, 12] as Range[]).map((r) => (
              <button key={r} onClick={() => setRange(r)} aria-pressed={range === r} className={cn('rounded-full px-3 py-1.5 text-xs font-medium transition-colors', range === r ? 'bg-foreground/15 text-foreground' : 'text-muted-foreground')}>{r}M</button>
            ))}
          </div>
          <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-full accent-gradient px-4 py-2 text-xs font-semibold transition-transform hover:scale-[1.03] active:scale-95"><Download size={13} /> Export CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FadeUp className="lg:col-span-2">
          <div className="glass rounded-[2rem] p-5">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Requests by status</h3>
              <div className="flex flex-wrap gap-1.5">
                {Object.values(SEG).map((s) => (
                  <span key={s.label} className="flex items-center gap-1.5 rounded-full bg-foreground/8 px-2.5 py-1 text-[11px]"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
                ))}
              </div>
            </div>
            <div className="mb-3 flex items-baseline gap-2"><CountUp value={inRange.length} className="text-3xl font-semibold" /><span className="text-xs text-muted-foreground">requests, last {range} months</span></div>
            <div className="relative flex h-56 items-end gap-3 border-b border-foreground/10 px-1">
              {[0.25, 0.5, 0.75].map((g) => <div key={g} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground/10" style={{ bottom: `${g * 100}%` }} />)}
              {monthly.map((x, i) => (
                <div key={x.m.toISOString()} className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${format(x.m, 'MMM yyyy')}: ${x.total} requests`}>
                  <span className="text-[10px] font-semibold text-muted-foreground">{x.total || ''}</span>
                  <motion.div
                    className="flex w-full max-w-[56px] flex-col-reverse overflow-hidden rounded-t-xl"
                    initial={{ height: 0 }} animate={{ height: `${(x.total / maxTotal) * 88}%` }}
                    transition={{ duration: 0.8, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div style={{ flex: x.converted, background: SEG.converted.color }} />
                    <div style={{ flex: x.review, background: SEG.review.color }} />
                    <div style={{ flex: x.rejected, background: SEG.rejected.color }} />
                  </motion.div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-3 px-1">
              {monthly.map((x) => <span key={x.m.toISOString()} className="min-w-0 flex-1 text-center text-[10px] text-muted-foreground">{format(x.m, 'MMM')}</span>)}
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="glass h-full rounded-[2rem] p-5">
            <h3 className="mb-1 text-sm font-semibold">Requests by organization</h3>
            <p className="mb-4 text-[11px] text-muted-foreground">Where your requests come from.</p>
            <Donut data={byOrg} />
          </div>
        </FadeUp>

        <FadeUp delay={0.18}>
          <div className="glass rounded-[2rem] p-5">
            <h3 className="mb-1 text-sm font-semibold">New requests per month</h3>
            <p className="mb-3 text-[11px] text-muted-foreground">Intake volume trend.</p>
            <Spark values={monthly.map((x) => x.total)} color="hsl(var(--primary))" />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">{monthly.map((x) => <span key={x.m.toISOString()}>{format(x.m, 'MMM')}</span>)}</div>
          </div>
        </FadeUp>

        <FadeUp delay={0.24}>
          <div className="glass rounded-[2rem] p-5">
            <h3 className="mb-1 text-sm font-semibold">Actions completed per month</h3>
            <p className="mb-3 text-[11px] text-muted-foreground">Delivery throughput.</p>
            <Spark values={monthly.map((x) => x.doneItems)} color="hsl(160 55% 60%)" />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">{monthly.map((x) => <span key={x.m.toISOString()}>{format(x.m, 'MMM')}</span>)}</div>
          </div>
        </FadeUp>

        <FadeUp delay={0.3}>
          <div className="glass rounded-[2rem] p-5">
            <h3 className="mb-1 text-sm font-semibold">Conversion trend</h3>
            <p className="mb-3 text-[11px] text-muted-foreground">% of requests that became actions.</p>
            <Spark values={monthly.map((x) => (x.total ? Math.round((x.converted / x.total) * 100) : 0))} color="hsl(12 85% 72%)" />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">{monthly.map((x) => <span key={x.m.toISOString()}>{format(x.m, 'MMM')}</span>)}</div>
          </div>
        </FadeUp>
      </div>
    </div>
  )
}
