"use client";

/**
 * The dashboard shell (plans/03 §2).
 *
 * Five tabs: the money screen, the per-product view, the timeline, the
 * robustness checks and the optimiser. Everything hangs off the same store, so
 * the seed and the rule in the left rail govern every tab.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopBar } from "@/components/TopBar";
import { ControlsRail } from "@/components/ControlsRail";
import { OverviewTab } from "@/components/OverviewTab";
import { ProductsTab } from "@/components/ProductsTab";
import { TimelineTab } from "@/components/TimelineTab";
import { RobustnessTab } from "@/components/RobustnessTab";
import { OptimizeTab } from "@/components/OptimizeTab";

export function Dashboard() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-bg text-brand-ink">
      <TopBar />

      <div className="flex flex-1 flex-col lg:flex-row">
        <ControlsRail />

        <main className="flex-1 p-4 lg:p-6">
          <Tabs defaultValue="overview" className="gap-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="robustness">Robustness</TabsTrigger>
              <TabsTrigger value="optimize">Optimize</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab />
            </TabsContent>
            <TabsContent value="products">
              <ProductsTab />
            </TabsContent>
            <TabsContent value="timeline">
              <TimelineTab />
            </TabsContent>
            <TabsContent value="robustness">
              <RobustnessTab />
            </TabsContent>
            <TabsContent value="optimize">
              <OptimizeTab />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
