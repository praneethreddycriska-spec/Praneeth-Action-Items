import { RequestForm } from '@/features/public-request/RequestForm'

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full px-4 py-10 sm:py-16">
      <RequestForm />
      <p className="mt-6 text-center text-[11px] text-muted-foreground">Powered by Action Items</p>
    </div>
  )
}
