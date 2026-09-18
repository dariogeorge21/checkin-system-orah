import type { VolunteerRegistration } from "@/components/volunteers/volunteers-table";
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

export const VOLUNTEER_CSV_COLUMNS: CsvColumn<VolunteerRegistration>[] = [
  {
    key: "id",
    label: "Volunteer ID",
    getValue: (v) => v.id,
  },
  {
    key: "name",
    label: "Full Name",
    getValue: (v) => v.name,
  },
  {
    key: "phone",
    label: "Phone Number",
    getValue: (v) => v.phone,
  },
  {
    key: "ministry",
    label: "Ministry",
    getValue: (v) => v.ministry || "",
  },
  {
    key: "role",
    label: "Role",
    getValue: (v) => v.role || "",
  },
  {
    key: "registration_type",
    label: "Registration Type",
    getValue: (v) => v.registration_type || "ONLINE",
  },
  {
    key: "checkin_status",
    label: "Check-in Status",
    getValue: (v) => (v.is_verified ? "Checked In" : "Pending"),
  },
  {
    key: "payment_status",
    label: "Payment Status",
    getValue: (v) => {
      if (v.checkin?.payment_status) {
        return formatPaymentStatus(v.checkin.payment_status);
      }
      return v.is_verified ? "Paid" : "Pending";
    },
  },
  {
    key: "payment_method",
    label: "Payment Method",
    getValue: (v) => v.checkin?.payment_method || (v.is_verified ? "UPI" : ""),
  },
  {
    key: "amount_paid",
    label: "Amount Paid (₹)",
    getValue: (v) => {
      if (v.checkin?.amount_paid != null) return v.checkin.amount_paid;
      return v.is_verified ? 400 : 0;
    },
  },
  {
    key: "amount_due",
    label: "Amount Due (₹)",
    getValue: (v) => {
      if (v.checkin?.amount_due != null) return v.checkin.amount_due;
      return 0;
    },
  },
  {
    key: "payment_note",
    label: "Payment Note",
    getValue: (v) => v.checkin?.payment_note || "",
  },
  {
    key: "checked_in_at",
    label: "Checked In At",
    getValue: (v) => formatDateTime(v.checkin?.checked_in_at),
  },
  {
    key: "checked_in_by",
    label: "Checked In By",
    getValue: (v) => v.checkin?.checked_in_by || "",
  },
  {
    key: "created_at",
    label: "Registered At",
    getValue: (v) => formatDateTime(v.created_at),
  },
];

export const VOLUNTEER_SORT_OPTIONS: CsvSortOption<VolunteerRegistration>[] = [
  {
    label: "Full Name",
    key: "name",
    getValue: (v) => v.name,
  },
  {
    label: "Registration Date",
    key: "created_at",
    getValue: (v) => v.created_at,
  },
  {
    label: "Ministry",
    key: "ministry",
    getValue: (v) => v.ministry || "",
  },
  {
    label: "Role",
    key: "role",
    getValue: (v) => v.role || "",
  },
  {
    label: "Amount Paid",
    key: "amount_paid",
    getValue: (v) => v.checkin?.amount_paid ?? (v.is_verified ? 400 : 0),
  },
  {
    label: "Check-in Status",
    key: "is_verified",
    getValue: (v) => (v.is_verified ? 1 : 0),
  },
];

export function getVolunteerFilterOptions(
  volunteers: VolunteerRegistration[]
): CsvFilterOption<VolunteerRegistration>[] {
  // Extract distinct ministries from current volunteers
  const ministries = Array.from(
    new Set(volunteers.map((v) => v.ministry?.trim()).filter(Boolean))
  ).sort() as string[];

  return [
    {
      id: "checkin_status",
      label: "Check-in Status",
      options: [
        { label: "All Records", value: "ALL" },
        { label: "Checked In (Verified)", value: "CHECKED_IN" },
        { label: "Pending Check-in", value: "PENDING" },
      ],
      filterFn: (v, val) => {
        if (val === "CHECKED_IN") return v.is_verified;
        if (val === "PENDING") return !v.is_verified;
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
      filterFn: (v, val) => {
        if (val === "ONLINE") return v.registration_type === "ONLINE";
        if (val === "OFFLINE") return v.registration_type === "OFFLINE" || v.registration_type === "SPOT";
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
      filterFn: (v, val) => {
        const status = v.checkin?.payment_status || (v.is_verified ? "paid" : "not_paid");
        return status === val;
      },
    },
    ...(ministries.length > 0
      ? [
          {
            id: "ministry_filter",
            label: "Ministry",
            options: [
              { label: "All Ministries", value: "ALL" },
              ...ministries.map((m) => ({ label: m, value: m })),
            ],
            filterFn: (v: VolunteerRegistration, val: string) => {
              return v.ministry?.trim().toLowerCase() === val.toLowerCase();
            },
          },
        ]
      : []),
  ];
}

