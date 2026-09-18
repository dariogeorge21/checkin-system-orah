import type { Participant } from "@/components/participants/participants-table";
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

function formatPaymentStatus(status?: string | null): string {
  if (!status) return "";
  switch (status.toLowerCase()) {
    case "paid":
      return "Paid";
    case "partially_paid":
      return "Partially Paid";
    case "later_pay":
      return "Pay Later";
    case "not_paid":
      return "Not Paid";
    default:
      return status;
  }
}

export const PARTICIPANT_CSV_COLUMNS: CsvColumn<Participant>[] = [
  {
    key: "id",
    label: "Participant ID",
    getValue: (p) => p.id,
  },
  {
    key: "name",
    label: "Full Name",
    getValue: (p) => p.name,
  },
  {
    key: "phone",
    label: "Phone Number",
    getValue: (p) => p.phone,
  },
  {
    key: "email",
    label: "Email",
    getValue: (p) => p.email || "",
  },
  {
    key: "gender",
    label: "Gender",
    getValue: (p) => p.gender || "",
  },
  {
    key: "dob",
    label: "Date of Birth",
    getValue: (p) => p.dob || "",
  },
  {
    key: "parish",
    label: "Parish",
    getValue: (p) => p.parish || "",
  },
  {
    key: "diocese",
    label: "Diocese",
    getValue: (p) => p.diocese || "",
  },
  {
    key: "affiliation",
    label: "Affiliation",
    getValue: (p) => p.affiliation || "",
  },
  {
    key: "college",
    label: "College / School",
    getValue: (p) => p.college || "",
  },
  {
    key: "institute",
    label: "Institute / Office",
    getValue: (p) => p.institute || "",
  },
  {
    key: "year_of_study",
    label: "Year of Study",
    getValue: (p) => p.year_of_study || "",
  },
  {
    key: "address",
    label: "Address",
    getValue: (p) => p.address || "",
  },
  {
    key: "registration_type",
    label: "Registration Type",
    getValue: (p) => p.registration_type || "ONLINE",
  },
  {
    key: "checkin_status",
    label: "Check-in Status",
    getValue: (p) => (p.is_verified ? "Checked In" : "Pending"),
  },
  {
    key: "group_number",
    label: "Group Number",
    getValue: (p) => {
      const g = p.group_number ?? p.checkin?.group_number;
      return g ? `Group ${g}` : "";
    },
  },
  {
    key: "payment_status",
    label: "Payment Status",
    getValue: (p) => {
      if (p.checkin?.payment_status) {
        return formatPaymentStatus(p.checkin.payment_status);
      }
      return p.is_verified ? "Paid" : "Pending";
    },
  },
  {
    key: "payment_method",
    label: "Payment Method",
    getValue: (p) => p.checkin?.payment_method || (p.is_verified ? "UPI" : ""),
  },
  {
    key: "amount_paid",
    label: "Amount Paid (₹)",
    getValue: (p) => {
      if (p.checkin?.amount_paid != null) return p.checkin.amount_paid;
      return p.is_verified ? 600 : 0;
    },
  },
  {
    key: "amount_due",
    label: "Amount Due (₹)",
    getValue: (p) => {
      if (p.checkin?.amount_due != null) return p.checkin.amount_due;
      return 0;
    },
  },
  {
    key: "payment_note",
    label: "Payment Note",
    getValue: (p) => p.checkin?.payment_note || "",
  },
  {
    key: "checked_in_at",
    label: "Checked In At",
    getValue: (p) => formatDateTime(p.checkin?.checked_in_at),
  },
  {
    key: "checked_in_by",
    label: "Checked In By",
    getValue: (p) => p.checkin?.checked_in_by || "",
  },
  {
    key: "created_at",
    label: "Registered At",
    getValue: (p) => formatDateTime(p.created_at),
  },
];

export const PARTICIPANT_SORT_OPTIONS: CsvSortOption<Participant>[] = [
  {
    label: "Full Name",
    key: "name",
    getValue: (p) => p.name,
  },
  {
    label: "Registration Date",
    key: "created_at",
    getValue: (p) => p.created_at,
  },
  {
    label: "Group Number",
    key: "group_number",
    getValue: (p) => p.group_number ?? p.checkin?.group_number ?? 999,
  },
  {
    label: "Amount Paid",
    key: "amount_paid",
    getValue: (p) => p.checkin?.amount_paid ?? (p.is_verified ? 600 : 0),
  },
  {
    label: "Check-in Status",
    key: "is_verified",
    getValue: (p) => (p.is_verified ? 1 : 0),
  },
  {
    label: "Parish",
    key: "parish",
    getValue: (p) => p.parish || "",
  },
  {
    label: "Diocese",
    key: "diocese",
    getValue: (p) => p.diocese || "",
  },
];

export const PARTICIPANT_FILTER_OPTIONS: CsvFilterOption<Participant>[] = [
  {
    id: "checkin_status",
    label: "Check-in Status",
    options: [
      { label: "All Records", value: "ALL" },
      { label: "Checked In (Verified)", value: "CHECKED_IN" },
      { label: "Pending Check-in", value: "PENDING" },
    ],
    filterFn: (p, val) => {
      if (val === "CHECKED_IN") return p.is_verified;
      if (val === "PENDING") return !p.is_verified;
      return true;
    },
  },
  {
    id: "registration_type",
    label: "Registration Type",
    options: [
      { label: "All Registration Types", value: "ALL" },
      { label: "Online Registrations", value: "ONLINE" },
      { label: "Offline / Spot Registrations", value: "OFFLINE" },
    ],
    filterFn: (p, val) => {
      if (val === "ONLINE") return p.registration_type === "ONLINE";
      if (val === "OFFLINE") return p.registration_type === "OFFLINE" || (p.registration_type as any) === "SPOT";
      return true;
    },
  },
  {
    id: "payment_status",
    label: "Payment Status",
    options: [
      { label: "All Payment Statuses", value: "ALL" },
      { label: "Fully Paid", value: "paid" },
      { label: "Partially Paid", value: "partially_paid" },
      { label: "Pay Later", value: "later_pay" },
      { label: "Not Paid / Unverified", value: "not_paid" },
    ],
    filterFn: (p, val) => {
      const status = p.checkin?.payment_status || (p.is_verified ? "paid" : "not_paid");
      return status === val;
    },
  },
  {
    id: "group_filter",
    label: "Group Number",
    options: [
      { label: "All Groups", value: "ALL" },
      { label: "Assigned (Groups 1–15)", value: "ASSIGNED" },
      { label: "Unassigned", value: "UNASSIGNED" },
      ...Array.from({ length: 15 }, (_, i) => ({
        label: `Group ${i + 1}`,
        value: String(i + 1),
      })),
    ],
    filterFn: (p, val) => {
      const group = p.group_number ?? p.checkin?.group_number;
      if (val === "ASSIGNED") return group != null && group > 0;
      if (val === "UNASSIGNED") return group == null || group <= 0;
      return group === Number(val);
    },
  },
];

