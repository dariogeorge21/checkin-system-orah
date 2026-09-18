import type { Participant } from "@/components/participants/participants-table";
import type { CsvColumn, CsvSortOption, CsvFilterOption } from "@/components/export/export-csv-modal";

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

function getPaymentStatusLabel(p: Participant): string {
  const isVerified = p.is_verified;
  const status = p.checkin?.payment_status;
  if (status) {
    switch (status.toLowerCase()) {
      case "paid":
        return "Full Paid";
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
  return isVerified ? "Full Paid" : "Not Paid";
}

export const FEES_CSV_COLUMNS: CsvColumn<Participant>[] = [
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
    key: "payment_status",
    label: "Payment Status",
    getValue: (p) => getPaymentStatusLabel(p),
  },
  {
    key: "payment_method",
    label: "Payment Method",
    getValue: (p) => p.checkin?.payment_method || (p.is_verified ? "UPI" : "None"),
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
    label: "Payment Notes",
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

export const FEES_SORT_OPTIONS: CsvSortOption<Participant>[] = [
  {
    label: "Amount Paid (High to Low)",
    key: "amount_paid",
    getValue: (p) => p.checkin?.amount_paid ?? (p.is_verified ? 600 : 0),
  },
  {
    label: "Amount Due (High to Low)",
    key: "amount_due",
    getValue: (p) => p.checkin?.amount_due ?? 0,
  },
  {
    label: "Full Name",
    key: "name",
    getValue: (p) => p.name,
  },
  {
    label: "Payment Method",
    key: "payment_method",
    getValue: (p) => p.checkin?.payment_method || (p.is_verified ? "UPI" : "ZZZ"),
  },
  {
    label: "Registration Date",
    key: "created_at",
    getValue: (p) => p.created_at,
  },
];

export const FEES_FILTER_OPTIONS: CsvFilterOption<Participant>[] = [
  {
    id: "payment_status",
    label: "Payment Status",
    options: [
      { label: "All Payment Statuses", value: "ALL" },
      { label: "Full Paid (₹600)", value: "paid" },
      { label: "Partially Paid", value: "partially_paid" },
      { label: "Pay Later", value: "later_pay" },
      { label: "Not Paid / Pending", value: "not_paid" },
    ],
    filterFn: (p, val) => {
      const isVerified = p.is_verified;
      const amountPaid = p.checkin?.amount_paid ?? (isVerified ? 600 : 0);
      const amountDue = p.checkin?.amount_due ?? 0;
      const status = p.checkin?.payment_status || (isVerified ? "paid" : "not_paid");

      if (val === "paid") {
        return status === "paid" || (amountPaid >= 600 && amountDue === 0);
      }
      if (val === "partially_paid") {
        return status === "partially_paid" || (amountPaid > 0 && amountDue > 0);
      }
      if (val === "later_pay") {
        return status === "later_pay";
      }
      if (val === "not_paid") {
        return status === "not_paid" || (!isVerified && !p.checkin);
      }
      return true;
    },
  },
  {
    id: "payment_method",
    label: "Payment Method",
    options: [
      { label: "All Payment Methods", value: "ALL" },
      { label: "Cash Paid", value: "CASH" },
      { label: "UPI Paid", value: "UPI" },
      { label: "Unpaid / None", value: "NONE" },
    ],
    filterFn: (p, val) => {
      const amountPaid = p.checkin?.amount_paid ?? (p.is_verified ? 600 : 0);
      const method = p.checkin?.payment_method || (p.is_verified ? "UPI" : null);

      if (val === "CASH") {
        return method === "CASH" && amountPaid > 0;
      }
      if (val === "UPI") {
        return method === "UPI" && amountPaid > 0;
      }
      if (val === "NONE") {
        return amountPaid === 0 || !p.is_verified;
      }
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
];

