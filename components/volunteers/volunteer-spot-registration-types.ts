import { PaymentMethod, PaymentStatus } from "@/components/participants/spot-registration-types";

export interface VolunteerSpotFormData {
  name: string;
  phone: string;
  ministry: string;
  ministryOther: string;
  role: "Member" | "Coordinator";
  confirmed: boolean;
}

export interface VolunteerSpotPaymentData {
  method: PaymentMethod;
  status: PaymentStatus;
  amountPaid: number;
  amountDue: number;
  note: string;
}

export const MINISTRY_OPTIONS = [
  "General",
  "Arts",
  "Music",
  "Finance",
  "AV",
  "Intercession",
  "Local",
  "Other",
] as const;

export type MinistryOption = (typeof MINISTRY_OPTIONS)[number];

export const ROLE_OPTIONS = ["Member", "Coordinator"] as const;

export type RoleOption = (typeof ROLE_OPTIONS)[number];

export const INITIAL_VOLUNTEER_FORM_DATA: VolunteerSpotFormData = {
  name: "",
  phone: "",
  ministry: "",
  ministryOther: "",
  role: "Member",
  confirmed: true,
};

export const INITIAL_VOLUNTEER_PAYMENT_DATA: VolunteerSpotPaymentData = {
  method: "UPI",
  status: "paid",
  amountPaid: 600,
  amountDue: 0,
  note: "",
};

/**
 * Strips HTML tags before storing in state or database
 */
export function sanitizeInput(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

/**
 * Handle conditional resets for volunteer form fields
 */
export function handleVolunteerConditionalResets(
  prev: VolunteerSpotFormData,
  field: keyof VolunteerSpotFormData,
  newValue: string
): VolunteerSpotFormData {
  const updated = { ...prev, [field]: newValue };

  if (field === "ministry" && newValue !== "Other") {
    updated.ministryOther = "";
  }

  return updated;
}

/**
 * Validates the volunteer spot registration form
 */
export function validateVolunteerSpotForm(data: VolunteerSpotFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  // 1. Full Name
  const trimmedName = data.name.trim();
  if (!trimmedName) {
    errors.name = "Full name is required.";
  } else if (trimmedName.length < 2) {
    errors.name = "Name must be at least 2 characters.";
  } else if (trimmedName.length > 120) {
    errors.name = "Name must not exceed 120 characters.";
  } else if (!/^[A-Za-z\s\-'.]+$/.test(trimmedName)) {
    errors.name = "Name must contain only letters, spaces, hyphens, or apostrophes.";
  }

  // 2. Phone Number
  const rawPhone = data.phone.trim();
  if (!rawPhone) {
    errors.phone = "Phone number is required.";
  } else if (!/^\+?[\d\s\-]+$/.test(rawPhone)) {
    errors.phone = "Enter a valid phone number.";
  } else {
    const digitsOnly = rawPhone.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
      errors.phone = "Phone number must have at least 10 digits.";
    } else if (digitsOnly.length > 15) {
      errors.phone = "Phone number must not exceed 15 digits.";
    }
  }

  // 3. Ministry
  if (!data.ministry) {
    errors.ministry = "Please select a ministry.";
  } else if (!MINISTRY_OPTIONS.includes(data.ministry as any)) {
    errors.ministry = "Please select a valid ministry.";
  }

  // Conditional: Other Ministry
  if (data.ministry === "Other") {
    const trimmedOther = data.ministryOther.trim();
    if (!trimmedOther) {
      errors.ministryOther = "Please specify the ministry.";
    } else if (trimmedOther.length < 2) {
      errors.ministryOther = "Ministry specification must be at least 2 characters.";
    } else if (trimmedOther.length > 100) {
      errors.ministryOther = "Ministry specification must not exceed 100 characters.";
    } else if (!/^[A-Za-z0-9\s\-'.,()]+$/.test(trimmedOther)) {
      errors.ministryOther = "Ministry specification contains invalid characters.";
    }
  }

  // 4. Role
  if (!data.role || !ROLE_OPTIONS.includes(data.role)) {
    errors.role = "Please select a valid role (Member or Coordinator).";
  }

  // 5. Desk Confirmation
  if (!data.confirmed) {
    errors.confirmed = "You must confirm the volunteer details.";
  }

  return errors;
}
