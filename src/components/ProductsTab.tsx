"use client";

/**
 * The per-product view (plans/03 §4).
 *
 * One row per product: what was received, what was wasted under each policy,
 * how much sold at markdown, and the profit change. Clicking a row opens the
 * drill-down. The footer totals are the same numbers as the Overview, which is
 * the cross-check that nothing has gone missing in the table.
 */

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductDrawer } from "@/components/ProductDrawer";
import { CATALOG, PRODUCT_BY_ID } from "@/sim/catalog";
import { CATEGORIES, type Category, type Comparison, type DayProductRecord, type Totals } from "@/sim/types";
import { formatDeltaMoney, formatPercent, formatUnits } from "@/lib/format";
import { useSimStore } from "@/store/useSimStore";

interface ProductRow {
  id: string;
  name: string;
  category: Category;
  shelfLife: number;
  received: number;
  wastedFixed: number;
  wastedMarkdown: number;
  soldAtMarkdown: number;
  markdownShare: number;
  avgDiscount: number;
  lostSales: number;
  profitDelta: number;
}

type SortKey =
  | "name"
  | "category"
  | "shelfLife"
  | "received"
  | "wastedFixed"
  | "wastedMarkdown"
  | "soldAtMarkdown"
  | "avgDiscount"
  | "lostSales"
  | "profitDelta";

function avgDiscountFor(records: DayProductRecord[]): number {
  const unitsAtMarkdown = records.reduce((sum, record) => sum + record.soldAtMarkdown, 0);
  if (unitsAtMarkdown === 0) return 0;
  const weighted = records.reduce(
    (sum, record) => sum + record.maxDiscount * record.soldAtMarkdown,
    0,
  );
  return weighted / unitsAtMarkdown;
}

function buildRows(comparison: Comparison): ProductRow[] {
  const markdownByProduct = new Map<string, DayProductRecord[]>();
  for (const record of comparison.markdown.records) {
    const list = markdownByProduct.get(record.productId);
    if (list) list.push(record);
    else markdownByProduct.set(record.productId, [record]);
  }

  return CATALOG.map((product) => {
    const fixed: Totals = comparison.fixed.byProduct[product.id];
    const markdown: Totals = comparison.markdown.byProduct[product.id];
    const records = markdownByProduct.get(product.id) ?? [];
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      shelfLife: product.shelfLife,
      received: markdown.received,
      wastedFixed: fixed.wasted,
      wastedMarkdown: markdown.wasted,
      soldAtMarkdown: markdown.soldAtMarkdown,
      markdownShare: markdown.sold > 0 ? markdown.soldAtMarkdown / markdown.sold : 0,
      avgDiscount: avgDiscountFor(records),
      lostSales: markdown.lostSales,
      profitDelta: markdown.profit - fixed.profit,
    };
  });
}

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Product" },
  { key: "category", label: "Category" },
  { key: "shelfLife", label: "Shelf life", numeric: true },
  { key: "received", label: "Received", numeric: true },
  { key: "wastedFixed", label: "Wasted (fixed)", numeric: true },
  { key: "wastedMarkdown", label: "Wasted (markdown)", numeric: true },
  { key: "soldAtMarkdown", label: "At markdown", numeric: true },
  { key: "avgDiscount", label: "Avg discount", numeric: true },
  { key: "lostSales", label: "Lost sales", numeric: true },
  { key: "profitDelta", label: "Profit Δ", numeric: true },
];

export function ProductsTab() {
  const comparison = useSimStore((state) => state.comparison);
  const loading = useSimStore((state) => state.loading);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Set<Category>>(new Set());
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "wastedFixed",
    dir: "desc",
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => (comparison ? buildRows(comparison) : []), [comparison]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (categoryFilter.size > 0 && !categoryFilter.has(row.category)) return false;
      if (needle && !row.name.toLowerCase().includes(needle)) return false;
      return true;
    });
    const factor = sort.dir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      if (typeof left === "string" && typeof right === "string") {
        return left.localeCompare(right) * factor;
      }
      return ((left as number) - (right as number)) * factor;
    });
  }, [rows, query, categoryFilter, sort]);

  const totals = useMemo(
    () =>
      visible.reduce(
        (acc, row) => ({
          received: acc.received + row.received,
          wastedFixed: acc.wastedFixed + row.wastedFixed,
          wastedMarkdown: acc.wastedMarkdown + row.wastedMarkdown,
          soldAtMarkdown: acc.soldAtMarkdown + row.soldAtMarkdown,
          lostSales: acc.lostSales + row.lostSales,
          profitDelta: acc.profitDelta + row.profitDelta,
        }),
        {
          received: 0,
          wastedFixed: 0,
          wastedMarkdown: 0,
          soldAtMarkdown: 0,
          lostSales: 0,
          profitDelta: 0,
        },
      ),
    [visible],
  );

  if (loading || !comparison) {
    return <Skeleton className="h-96 w-full" />;
  }

  const toggleCategory = (category: Category) => {
    setCategoryFilter((previous) => {
      const next = new Set(previous);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const toggleSort = (key: SortKey) => {
    setSort((previous) =>
      previous.key === key
        ? { key, dir: previous.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" || key === "category" ? "asc" : "desc" },
    );
  };

  const selected = selectedId ? PRODUCT_BY_ID[selectedId] : null;
  const filterRecords = (records: DayProductRecord[]) =>
    selectedId ? records.filter((record) => record.productId === selectedId) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((category) => (
          <Button
            key={category}
            size="sm"
            variant={categoryFilter.has(category) ? "default" : "outline"}
            onClick={() => toggleCategory(category)}
          >
            {category}
          </Button>
        ))}
        {categoryFilter.size > 0 ? (
          <Button size="sm" variant="ghost" onClick={() => setCategoryFilter(new Set())}>
            Clear
          </Button>
        ) : null}
        <div className="relative ml-auto">
          <Search className="absolute top-2 left-2 size-4 text-muted-foreground" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products"
            className="w-56 pl-8"
            aria-label="Search products"
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead
                key={column.key}
                className={column.numeric ? "text-right" : undefined}
                aria-sort={
                  sort.key === column.key
                    ? sort.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <button
                  type="button"
                  onClick={() => toggleSort(column.key)}
                  className={
                    column.numeric
                      ? "ml-auto flex items-center gap-1 hover:text-foreground"
                      : "flex items-center gap-1 hover:text-foreground"
                  }
                >
                  {column.label}
                  {sort.key === column.key ? (
                    <span aria-hidden="true">{sort.dir === "asc" ? "▲" : "▼"}</span>
                  ) : null}
                </button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer"
              onClick={() => setSelectedId(row.id)}
            >
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-muted-foreground">{row.category}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{row.shelfLife}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatUnits(row.received)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatUnits(row.wastedFixed)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatUnits(row.wastedMarkdown)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatUnits(row.soldAtMarkdown)} · {formatPercent(row.markdownShare)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatPercent(row.avgDiscount)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatUnits(row.lostSales)}
              </TableCell>
              <TableCell
                className={`text-right font-mono tabular-nums ${
                  row.profitDelta >= 0 ? "text-policy-markdown" : "text-waste"
                }`}
              >
                {formatDeltaMoney(row.profitDelta)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total ({visible.length})</TableCell>
            <TableCell />
            <TableCell />
            <TableCell className="text-right font-mono tabular-nums">
              {formatUnits(totals.received)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatUnits(totals.wastedFixed)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatUnits(totals.wastedMarkdown)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatUnits(totals.soldAtMarkdown)}
            </TableCell>
            <TableCell />
            <TableCell className="text-right font-mono tabular-nums">
              {formatUnits(totals.lostSales)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatDeltaMoney(totals.profitDelta)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      <ProductDrawer
        product={selected}
        fixedRecords={filterRecords(comparison.fixed.records)}
        markdownRecords={filterRecords(comparison.markdown.records)}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
