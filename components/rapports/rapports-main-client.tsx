"use client"

import { PageBanner } from "@/components/shared/page-banner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RapportsClient } from "@/components/rapports/rapports-client";
import { useReportsStore } from "@/lib/stores/ui-store";
import { Download, FileText } from "lucide-react";

export function RapportsMainClient() {
  const { selectedYear, setSelectedYear } = useReportsStore();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  return (
    <>
      <PageBanner
        title="Rapports"
        actions={
          <div className="flex items-center items-center gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y} className="text-xs">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              Export TEJ XML
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              Export PDF
            </Button>
          </div>
        }
      />
      <RapportsClient />
    </>
  );
}
