import type { Metadata } from "next";
import Link from "next/link";
import { Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { RestorePanel } from "../../export/restore-panel";
import { QuickExports } from "./quick-exports";

export const metadata: Metadata = { title: "Data management" };

export default function DataPage() {
  return (
    <>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Export all data</CardTitle>
            <CardDescription>Everything you have recorded, in the format you need.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <QuickExports />
          <p className="text-sm text-muted-foreground">
            Need a specific month, year or type?{" "}
            <Link href="/export" className="font-medium text-foreground underline underline-offset-2">
              Open Export
            </Link>
            .
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Import records</CardTitle>
            <CardDescription>Bring Home, Shopping or Outing records in from CSV or Excel, with a preview first.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Link href="/export#import" className={buttonVariants({ variant: "outline" })}>
            <Upload /> Import records
          </Link>
        </CardContent>
      </Card>
      <RestorePanel />
    </>
  );
}
