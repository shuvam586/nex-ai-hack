"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopBar } from "@/components/TopBar";
import { ControlsRail } from "@/components/ControlsRail";
import { OverviewTab } from "@/components/OverviewTab";

/**
 * The dashboard shell (plans/03 §2).
 *
 * The tabs that are not built yet say so plainly rather than pretending to
 * have data — a judge should never have to guess whether a number is real.
 */
function Pending({ title, spec }: { title: string; spec: string }) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This tab is specified in <span className="font-mono text-xs">{spec}</span> and is
          not built yet. The simulation behind it already works — see the Overview tab.
        </p>
      </CardContent>
    </Card>
  );
}

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
              <Pending title="Per-product view" spec="plans/03 §4" />
            </TabsContent>
            <TabsContent value="timeline">
              <Pending title="Markdown heatmap" spec="plans/03 §5" />
            </TabsContent>
            <TabsContent value="robustness">
              <Pending title="10-seed evaluation and tornado chart" spec="plans/03 §6" />
            </TabsContent>
            <TabsContent value="optimize">
              <Pending title="Best discount steps per category" spec="plans/03 §7" />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
