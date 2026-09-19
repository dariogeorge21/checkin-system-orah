"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface CsvColumn<T> {
  key: string;
  label: string;
  getValue: (item: T) => string | number | null | undefined;
}

export interface CsvSortOption<T> {
  label: string;
  key: string;
  getValue: (item: T) => string | number | boolean | null | undefined;
}

export interface CsvFilterOption<T> {
  id: string;
  label: string;
  options: { label: string; value: string }[];
  filterFn: (item: T, selectedValue: string) => boolean;
}

export interface ExportCsvModalProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  defaultFilename: string;
  data: T[];
  columns: CsvColumn<T>[];
  sortOptions: CsvSortOption<T>[];
  filterOptions?: CsvFilterOption<T>[];
}

/**
 * Escapes a cell value for RFC 4180 CSV compliance
 */
function escapeCsvValue(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  // If string contains comma, double-quote, or newline, escape double quotes and wrap in quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates and triggers download of CSV file
 */
export function downloadCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  items: T[]
): void {
  const headerRow = columns.map((c) => escapeCsvValue(c.label)).join(",");
  const dataRows = items.map((item) =>
    columns.map((col) => escapeCsvValue(col.getValue(item))).join(",")
  );

  // Prepend UTF-8 BOM for Microsoft Excel compatibility
  const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const cleanFilename = filename.trim().endsWith(".csv")
    ? filename.trim()
    : `${filename.trim() || "export"}.csv`;

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExportCsvModal<T>({
  open,
  onOpenChange,
  title,
  description,
  defaultFilename,
  data,
  columns,
  sortOptions,
  filterOptions = [],
}: ExportCsvModalProps<T>) {
  const [filename, setFilename] = useState(defaultFilename);
  const [sortKey, setSortKey] = useState<string>(sortOptions[0]?.key || "");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    filterOptions.forEach((f) => {
      initial[f.id] = f.options[0]?.value || "ALL";
    });
    return initial;
  });
  const [exportedSuccess, setExportedSuccess] = useState(false);

  // Reset filename & feedback when reopened or defaultFilename changes
  useEffect(() => {
    if (open) {
      setFilename(defaultFilename);
      setExportedSuccess(false);
    }
  }, [open, defaultFilename]);

  // Handle filter changes
  const handleFilterChange = (filterId: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [filterId]: value }));
  };

  const handleResetFilters = () => {
    const reset: Record<string, string> = {};
    filterOptions.forEach((f) => {
      reset[f.id] = f.options[0]?.value || "ALL";
    });
    setFilterValues(reset);
    setSortKey(sortOptions[0]?.key || "");
    setSortDirection("asc");
    setFilename(defaultFilename);
  };

  // Filtered and sorted dataset
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply filters
    for (const filter of filterOptions) {
      const selectedValue = filterValues[filter.id];
      if (selectedValue && selectedValue !== "ALL") {
        result = result.filter((item) => filter.filterFn(item, selectedValue));
      }
    }

    // Apply sorting
    const activeSort = sortOptions.find((s) => s.key === sortKey);
    if (activeSort) {
      result.sort((a, b) => {
        const valA = activeSort.getValue(a);
        const valB = activeSort.getValue(b);

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        let comparison = 0;
        if (typeof valA === "number" && typeof valB === "number") {
          comparison = valA - valB;
        } else {
          comparison = String(valA).localeCompare(String(valB), undefined, {
            numeric: true,
            sensitivity: "base",
          });
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [data, filterOptions, filterValues, sortOptions, sortKey, sortDirection]);

  // First 5 sample rows for preview
  const previewRows = useMemo(() => {
    return filteredData.slice(0, 5);
  }, [filteredData]);

  const handleExport = () => {
    if (filteredData.length === 0) return;
    downloadCsv(filename, columns, filteredData);
    setExportedSuccess(true);
    setTimeout(() => {
      setExportedSuccess(false);
    }, 4000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-1rem)] sm:max-w-4xl max-h-[92dvh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-1 pr-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <svg
                className="size-5 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {title}
            </DialogTitle>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {filteredData.length} records ready
            </span>
          </div>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            {description || "Configure export filters, sort order, and verify the 5-row sample preview before downloading."}
          </DialogDescription>
        </DialogHeader>

        {/* Configuration Section */}
        <div className="space-y-4 rounded-xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Export Configuration
            </h3>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Reset to default
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Custom Filename */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-semibold text-foreground">
                Export Filename
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="export.csv"
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono text-foreground shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                File will download as a UTF-8 BOM CSV.
              </p>
            </div>

            {/* Sort Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Sort By Field
              </label>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order Direction */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Sort Direction
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-input bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setSortDirection("asc")}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-md py-1 text-xs font-medium transition-colors cursor-pointer",
                    sortDirection === "asc"
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                  Asc (A-Z, 1-9)
                </button>
                <button
                  type="button"
                  onClick={() => setSortDirection("desc")}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-md py-1 text-xs font-medium transition-colors cursor-pointer",
                    sortDirection === "desc"
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M19 12l-7 7-7-7" />
                  </svg>
                  Desc (Z-A, 9-1)
                </button>
              </div>
            </div>

            {/* Dynamic Filter Dropdowns */}
            {filterOptions.map((filter) => (
              <div key={filter.id} className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {filter.label}
                </label>
                <select
                  value={filterValues[filter.id] || "ALL"}
                  onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* 5-Data Sample Preview Section */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sample Data Preview (First 5 records)
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Reflects current filters & sort order. Export will contain all{" "}
                <span className="font-semibold text-foreground">{filteredData.length}</span>{" "}
                matching records across {columns.length} columns.
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              Showing {previewRows.length} of {filteredData.length} records
            </span>
          </div>

          {previewRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center bg-muted/20">
              <svg
                className="size-8 text-muted-foreground/60 mb-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-xs font-semibold text-foreground">No matching records</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                No records match the active filter criteria. Adjust or reset your filters to preview and export data.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/80 bg-background shadow-2xs">
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs text-muted-foreground font-semibold border-b border-border/80 z-10">
                    <tr>
                      <th className="px-3 py-2 text-center w-10 font-mono text-[11px]">#</th>
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className="px-3 py-2 whitespace-nowrap font-semibold text-foreground text-[11px]"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {previewRows.map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-muted/30 transition-colors odd:bg-background even:bg-muted/10"
                      >
                        <td className="px-3 py-2 text-center text-muted-foreground font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        {columns.map((col) => {
                          const val = col.getValue(item);
                          return (
                            <td
                              key={col.key}
                              className="px-3 py-2 whitespace-nowrap text-foreground text-[11px] max-w-[200px] truncate"
                              title={val !== null && val !== undefined ? String(val) : ""}
                            >
                              {val !== null && val !== undefined && val !== "" ? (
                                String(val)
                              ) : (
                                <span className="text-muted-foreground/50 italic">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Feedback alert */}
        {exportedSuccess && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 animate-in fade-in duration-200">
            <svg
              className="size-4 shrink-0 text-emerald-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>
              CSV file <strong>{filename}</strong> generated and downloaded successfully!
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-border/70">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={filteredData.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export {filteredData.length} Records to CSV
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

