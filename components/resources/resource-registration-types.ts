export interface ResourceRegistration {
  id: string;
  event_id?: string;
  name: string;
  phone: string | null;
  from_location: string | null;
  session: string | null;
  registration_type: string;
  is_checked_in: boolean;
  checked_in_at: string | null;
  checked_in_by?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ResourceFormData {
  name: string;
  phone: string;
  fromLocation: string;
  session: string;
  isCheckedIn: boolean;
  notes: string;
}

export const INITIAL_RESOURCE_FORM_DATA: ResourceFormData = {
  name: "",
  phone: "",
  fromLocation: "",
  session: "",
  isCheckedIn: true,
  notes: "",
};

/**
 * Strips HTML tags before saving or processing
 */
export function sanitizeInput(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

/**
 * Validates the Resource Registration form
 * - name: required (min 2 chars, max 120 chars)
 * - phone: optional (if provided, must have 10-15 digits)
 * - fromLocation: optional (max 150 chars)
 * - session: optional (max 150 chars)
 */
export function validateResourceForm(data: ResourceFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  // 1. Full Name (Required)
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

  // 2. Phone Number (Optional)
  const rawPhone = data.phone.trim();
  if (rawPhone) {
    if (!/^\+?[\d\s\-]+$/.test(rawPhone)) {
      errors.phone = "Enter a valid phone number.";
    } else {
      const digitsOnly = rawPhone.replace(/\D/g, "");
      if (digitsOnly.length < 10) {
        errors.phone = "Phone number must have at least 10 digits.";
      } else if (digitsOnly.length > 15) {
        errors.phone = "Phone number must not exceed 15 digits.";
      }
    }
  }

  // 3. From Location / Origin (Optional)
  const trimmedFrom = data.fromLocation.trim();
  if (trimmedFrom && trimmedFrom.length > 150) {
    errors.fromLocation = "Location / Institution must not exceed 150 characters.";
  }

  // 4. Session / Topic (Optional)
  const trimmedSession = data.session.trim();
  if (trimmedSession && trimmedSession.length > 150) {
    errors.session = "Session topic / title must not exceed 150 characters.";
  }

  // 5. Notes (Optional)
  const trimmedNotes = data.notes.trim();
  if (trimmedNotes && trimmedNotes.length > 500) {
    errors.notes = "Notes must not exceed 500 characters.";
  }

  return errors;
}

