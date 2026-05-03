import { TopBar } from "@/components/dashboard/TopBar";
import { SofiaHero } from "@/components/dashboard/SofiaHero";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { TopTasks } from "@/components/dashboard/TopTasks";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { PedagogicalRadar } from "@/components/dashboard/PedagogicalRadar";
import { Footer } from "@/components/dashboard/Footer";

export function Dashboard() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <div className="space-y-8">
          <SofiaHero />
          <QuickStats />
          <TopTasks />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <UpcomingEvents />
            <PedagogicalRadar />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}