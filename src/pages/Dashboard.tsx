import { Sidebar } from "@/components/dashboard/Sidebar";
import { RightPanel } from "@/components/dashboard/RightPanel";
import { Hero } from "@/components/dashboard/Hero";
import { TimeAndFocus } from "@/components/dashboard/TimeAndFocus";
import { StudentsSection } from "@/components/dashboard/StudentsSection";
import { WeekTimeline } from "@/components/dashboard/WeekTimeline";
import { AgendaEmpty } from "@/components/dashboard/AgendaEmpty";
import { ReferralCard } from "@/components/dashboard/ReferralCard";
import { AuthorToggleCard } from "@/components/dashboard/AuthorToggleCard";

export function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <RightPanel />
      <main className="lg:pl-60 xl:pr-72">
        <div className="mx-auto w-full max-w-3xl px-5 py-8 md:px-8 md:py-12">
          <div className="space-y-10">
            <Hero />
            <TimeAndFocus />
            <StudentsSection />
            <WeekTimeline />
            <AgendaEmpty />
            <ReferralCard />
            <AuthorToggleCard />
          </div>
        </div>
      </main>
    </div>
  );
}