import type { ResourceRegistration } from "@/components/resources/resource-registration-types";
import type { CsvColumn, CsvSortOption, CsvFilterOption } from "./export-csv-modal";

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return dateStr;
  }
}

export const RESOURCE_CSV_COLUMNS: CsvColumn<ResourceRegistration>[] = [
  {
    key: "id",
    label: "Resource ID",
    getValue: (r) => r.id,
  },
  {
    key: "name",
    label: "Full Name",
    getValue: (r) => r.name,
  },
  {
    key: "phone",
    label: "Phone Number",
    getValue: (r) => r.phone || "",
  },
  {
    key: "from_location",
    label: "Location / Institution",
    getValue: (r) => r.from_location || "",
  },
  {
    key: "session",
    label: "Session / Topic",
    getValue: (r) => r.session || "",
  },
  {
    key: "registration_type",
    label: "Registration Type",
    getValue: (r) => r.registration_type || "SPOT",
  },
  {
    key: "checkin_status",
    label: "Check-in Status",
    getValue: (r) => (r.is_checked_in ? "Checked In" : "Pending"),
  },
  {
    key: "checked_in_at",
    label: "Checked In At",
    getValue: (r) => formatDateTime(r.checked_in_at),
  },
  {
    key: "checked_in_by",
    label: "Checked In By",
    getValue: (r) => r.checked_in_by || "",
  },
  {
    key: "fee_status",
    label: "Fee Collection",
    getValue: () => "₹0 (Exempt)",
  },
  {
    key: "notes",
    label: "Notes",
    getValue: (r) => r.notes || "",
  },
  {
    key: "created_at",
    label: "Registered At",
    getValue: (r) => formatDateTime(r.created_at),
  },
  {
    key: "updated_at",
    label: "Last Updated At",
    getValue: (r) => formatDateTime(r.updated_at),
  },
];

export const RESOURCE_SORT_OPTIONS: CsvSortOption<ResourceRegistration>[] = [
  {
    label: "Full Name",
    key: "name",
    getValue: (r) => r.name,
  },
  {
    label: "Registration Date",
    key: "created_at",
    getValue: (r) => r.created_at,
  },
  {
    label: "Session / Topic",
    key: "session",
    getValue: (r) => r.session || "",
  },
  {
    label: "Location / Institution",
    key: "from_location",
    getValue: (r) => r.from_location || "",
  },
  {
    label: "Check-in Status",
    key: "is_checked_in",
    getValue: (r) => (r.is_checked_in ? 1 : 0),
  },
];

export const RESOURCE_FILTER_OPTIONS: CsvFilterOption<ResourceRegistration>[] = [
  {
    id: "checkin_status",
    label: "Check-in Status",
    options: [
      { label: "All Records", value: "ALL" },
      { label: "Checked In", value: "CHECKED_IN" },
      { label: "Pending Arrival", value: "PENDING" },
    ],
    filterFn: (r, val) => {
      if (val === "CHECKED_IN") return r.is_checked_in;
      if (val === "PENDING") return !r.is_checked_in;
      return true;
    },
  },
  {
    id: "registration_type",
    label: "Registration Type",
    options: [
      { label: "All Registration Types", value: "ALL" },
      { label: "Spot / Offline", value: "SPOT" },
      { label: "Online", value: "ONLINE" },
    ],
    filterFn: (r, val) => {
      if (val === "SPOT") return r.registration_type === "SPOT" || r.registration_type === "OFFLINE";
      if (val === "ONLINE") return r.registration_type === "ONLINE";
      return true;
    },
  },
];

