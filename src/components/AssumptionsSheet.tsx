"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ASSUMPTIONS } from "@/lib/assumptions";

/**
 * The assumption register, one click away.
 *
 * A judge should be able to see every number the model rests on without
 * leaving the page — that is what makes the results arguable.
 */
export function AssumptionsSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Info className="size-4" />
          Assumptions
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Every assumption, with a reason</SheetTitle>
          <SheetDescription>
            The store and its shoppers are synthetic. These are the numbers the
            simulation rests on — the full register is in the README.
          </SheetDescription>
        </SheetHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Assumption</TableHead>
              <TableHead className="w-32">Value</TableHead>
              <TableHead className="w-28">Range</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ASSUMPTIONS.map((assumption) => (
              <TableRow key={assumption.id}>
                <TableCell className="font-mono text-xs">{assumption.id}</TableCell>
                <TableCell>
                  <span className="font-medium">{assumption.assumption}</span>
                  <p className="mt-1 text-xs text-muted-foreground">{assumption.why}</p>
                </TableCell>
                <TableCell className="text-xs">{assumption.value}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {assumption.sensitivity}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SheetContent>
    </Sheet>
  );
}
