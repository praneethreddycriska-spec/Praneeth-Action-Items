import { useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data: notifications = [] } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="glass relative rounded-xl p-2" aria-label="Notifications">
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              className="glass-strong absolute right-0 top-11 z-50 max-h-96 w-80 overflow-hidden rounded-2xl"
            >
              <div className="flex items-center justify-between border-b border-border/60 p-3">
                <h3 className="text-sm font-semibold">Notifications</h3>
                {unread > 0 && (
                  <button onClick={() => markAll.mutate()} className="flex items-center gap-1 text-[11px] text-primary">
                    <Check size={12} /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => !n.read && markRead.mutate(n.id)}
                    className={cn('block w-full border-b border-border/40 p-3 text-left text-xs last:border-b-0', !n.read && 'bg-primary/5')}
                  >
                    <div className="mb-0.5 flex items-center gap-1.5">
                      {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className={cn(!n.read && 'font-medium')}>{n.message}</p>
                  </button>
                ))}
                {notifications.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">No notifications yet.</p>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
