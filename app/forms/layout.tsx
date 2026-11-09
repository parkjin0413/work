import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";

export default function FormsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-12 2xl:px-[max(4rem,calc((100%-106.6667rem)/2))]">
        {children}
      </main>
    </div>
  );
}
