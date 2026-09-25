import { RequestForm } from '@/features/public-request/RequestForm'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full px-4 py-10 sm:py-16">
      <div className="mx-auto mb-4 flex max-w-xl justify-end">
        <ThemeToggle />
      </div>
      <RequestForm />
      <p className="mt-6 text-center text-[11px] text-muted-foreground">Powered by Action Items</p>
    </div>
  )
}
