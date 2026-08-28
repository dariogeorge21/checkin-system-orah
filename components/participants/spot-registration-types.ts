export interface SpotRegistrationFormData {
  name: string;
  dob: string;
  phone: string;
  email: string;
  gender: string;
  affiliation: string;
  affiliationOther: string;
  college: string;
  collegeOther: string;
  institute: string;
  instituteOther: string;
  yearOfStudy: string;
  yearOfStudyOther: string;
  parish: string;
  diocese: string;
  address: string;
  confirmed: boolean;
}

export type PaymentMethod = "CASH" | "UPI";

export type PaymentStatus = "paid" | "partially_paid" | "later_pay" | "not_paid";

export interface SpotPaymentData {
  method: PaymentMethod;
  status: PaymentStatus;
  amountPaid: number;
  amountDue: number;
  note: string;
}

export const INITIAL_FORM_DATA: SpotRegistrationFormData = {
  name: "",
  dob: "",
  phone: "",
  email: "",
  gender: "",
  affiliation: "",
  affiliationOther: "",
  college: "",
  collegeOther: "",
  institute: "",
  instituteOther: "",
  yearOfStudy: "",
  yearOfStudyOther: "",
  parish: "",
  diocese: "",
  address: "",
  confirmed: true, // Initially confirmed per spot-registration at desk
};

export const INITIAL_PAYMENT_DATA: SpotPaymentData = {
  method: "UPI",
  status: "paid",
  amountPaid: 600,
  amountDue: 0,
  note: "",
};

export const AFFILIATION_OPTIONS = [
  "+2 Passout",
  "College",
  "Institutes",
  "Job Seeking",
  "Employed",
  "Other",
] as const;

export const COLLEGE_OPTIONS = [
  "St Joseph's College of Engineering and Technology, Choondacherry",
  "St Joseph's Institute of Hotel Management and Catering Technology, Choondacherry",
  "Alphonsa College, Pala",
  "Devamatha College, Kuravilangad",
  "St Thomas College, Pala",
  "St Joseph's College, Moolamattom",
  "St George's College, Aruvithura",
  "St Stephen's College, Uzhavoor",
  "Bishop Vayalil Memorial Holy Cross College, Cherpunkal",
  "Mar Augusthinose College, Ramapuram",
  "Other",
] as const;

export const YEAR_OF_STUDY_OPTIONS: { value: string; display: string }[] = [
  { value: "UG - 1st Year", display: "UG — 1st Year" },
  { value: "UG - 2nd Year", display: "UG — 2nd Year" },
  { value: "UG - 3rd Year", display: "UG — 3rd Year" },
  { value: "UG - 4th Year", display: "UG — 4th Year" },
  { value: "PG - 1st Year", display: "PG — 1st Year" },
  { value: "PG - 2nd Year", display: "PG — 2nd Year" },
  { value: "Other", display: "Other" },
];

export const INSTITUTE_OPTIONS = [
  "IELTS",
  "German",
  "SSC",
  "Other",
] as const;

/**
 * Sanitizer: strips HTML tags before storing in state or database
 */
export function sanitizeInput(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

/**
 * Conditional state reset logic
 */
export function handleConditionalResets(
  prev: SpotRegistrationFormData,
  field: keyof SpotRegistrationFormData,
  newValue: string
): SpotRegistrationFormData {
  const updated = { ...prev, [field]: newValue };

  if (field === "affiliation") {
    if (newValue !== "Other") {
      updated.affiliationOther = "";
    }
    if (newValue !== "College") {
      updated.college = "";
      updated.collegeOther = "";
      updated.yearOfStudy = "";
      updated.yearOfStudyOther = "";
    }
    if (newValue !== "Institutes") {
      updated.institute = "";
      updated.instituteOther = "";
    }
  }

  if (field === "college") {
    if (newValue !== "Other") {
      updated.collegeOther = "";
    }
    if (!newValue) {
      updated.yearOfStudy = "";
      updated.yearOfStudyOther = "";
    }
  }

  if (field === "institute") {
    if (newValue !== "Other") {
      updated.instituteOther = "";
    }
  }

  if (field === "yearOfStudy") {
    if (newValue !== "Other") {
      updated.yearOfStudyOther = "";
    }
  }

  return updated;
}

/**
 * Comprehensive field validation matching prompt specifications
 */
export function validateSpotRegistrationForm(data: SpotRegistrationFormData): Record<string, string> {
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

  // 2. Email
  const trimmedEmail = data.email.trim();
  if (!trimmedEmail) {
    errors.email = "Email address is required.";
  } else if (trimmedEmail.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
    errors.email = "Enter a valid email address.";
  }

  // 3. Phone
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

  // 4. Date of Birth
  if (!data.dob) {
    errors.dob = "Date of birth is required.";
  } else {
    const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dobRegex.test(data.dob)) {
      errors.dob = "Enter a valid date of birth (YYYY-MM-DD).";
    } else {
      const [yStr, mStr, dStr] = data.dob.split("-");
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);
      const day = parseInt(dStr, 10);
      const testDate = new Date(year, month - 1, day);

      const isValidCalendarDate =
        testDate.getFullYear() === year &&
        testDate.getMonth() === month - 1 &&
        testDate.getDate() === day;

      if (!isValidCalendarDate) {
        errors.dob = "Enter a valid calendar date.";
      } else if (!(year > 1999 && year < 2009)) {
        errors.dob = "Date of birth must be between 1999 and 2009.";
      }
    }
  }

  // 5. Gender
  if (!data.gender || !["male", "female"].includes(data.gender)) {
    errors.gender = "Please select a gender.";
  }

  // 6. Affiliation
  if (!data.affiliation || !(AFFILIATION_OPTIONS as readonly string[]).includes(data.affiliation)) {
    errors.affiliation = "Please select a valid affiliation.";
  }

  // Conditional: Affiliation Other
  if (data.affiliation === "Other") {
    const trimmedAffOther = data.affiliationOther.trim();
    if (!trimmedAffOther || trimmedAffOther.length < 2) {
      errors.affiliationOther = "Affiliation specification must be at least 2 characters.";
    } else if (trimmedAffOther.length > 100) {
      errors.affiliationOther = "Affiliation specification must not exceed 100 characters.";
    } else if (!/^[A-Za-z0-9\s\-'.,()]+$/.test(trimmedAffOther)) {
      errors.affiliationOther = "Affiliation specification contains invalid characters.";
    }
  }

  // Conditional: College
  if (data.affiliation === "College") {
    if (!data.college || !(COLLEGE_OPTIONS as readonly string[]).includes(data.college)) {
      errors.college = "Please select a valid college.";
    }

    if (data.college === "Other") {
      const trimmedColOther = data.collegeOther.trim();
      if (!trimmedColOther || trimmedColOther.length < 2) {
        errors.collegeOther = "College name must be at least 2 characters.";
      } else if (trimmedColOther.length > 100) {
        errors.collegeOther = "College name must not exceed 100 characters.";
      } else if (!/^[A-Za-z0-9\s\-'.,()]+$/.test(trimmedColOther)) {
        errors.collegeOther = "College name contains invalid characters.";
      }
    }

    // Year of study (required if college selected)
    if (!data.yearOfStudy) {
      errors.yearOfStudy = "Please select a year of study.";
    } else if (!YEAR_OF_STUDY_OPTIONS.some((opt) => opt.value === data.yearOfStudy)) {
      errors.yearOfStudy = "Please select a valid year of study.";
    }

    if (data.yearOfStudy === "Other") {
      const trimmedYearOther = data.yearOfStudyOther.trim();
      if (!trimmedYearOther || trimmedYearOther.length < 2) {
        errors.yearOfStudyOther = "Year of study must be at least 2 characters.";
      } else if (trimmedYearOther.length > 100) {
        errors.yearOfStudyOther = "Year of study must not exceed 100 characters.";
      } else if (!/^[A-Za-z0-9\s\-.()/]+$/.test(trimmedYearOther)) {
        errors.yearOfStudyOther = "Year of study contains invalid characters.";
      }
    }
  }

  // Conditional: Institutes
  if (data.affiliation === "Institutes") {
    if (!data.institute || !(INSTITUTE_OPTIONS as readonly string[]).includes(data.institute)) {
      errors.institute = "Please select a valid institute.";
    }

    if (data.institute === "Other") {
      const trimmedInstOther = data.instituteOther.trim();
      if (!trimmedInstOther || trimmedInstOther.length < 2) {
        errors.instituteOther = "Institute name must be at least 2 characters.";
      } else if (trimmedInstOther.length > 100) {
        errors.instituteOther = "Institute name must not exceed 100 characters.";
      } else if (!/^[A-Za-z0-9\s\-'.,()]+$/.test(trimmedInstOther)) {
        errors.instituteOther = "Institute name contains invalid characters.";
      }
    }
  }

  // 7. Parish
  const trimmedParish = data.parish.trim();
  if (!trimmedParish || trimmedParish.length < 2) {
    errors.parish = "Parish name must be at least 2 characters.";
  } else if (trimmedParish.length > 200) {
    errors.parish = "Parish name must not exceed 200 characters.";
  } else if (!/^[A-Za-z0-9\s\-'.,()]+$/.test(trimmedParish)) {
    errors.parish = "Parish name contains invalid characters.";
  }

  // 8. Diocese
  const trimmedDiocese = data.diocese.trim();
  if (!trimmedDiocese || trimmedDiocese.length < 2) {
    errors.diocese = "Diocese name must be at least 2 characters.";
  } else if (trimmedDiocese.length > 200) {
    errors.diocese = "Diocese name must not exceed 200 characters.";
  } else if (!/^[A-Za-z0-9\s\-'.,()]+$/.test(trimmedDiocese)) {
    errors.diocese = "Diocese name contains invalid characters.";
  }

  // 9. Address
  const trimmedAddress = data.address.trim();
  if (!trimmedAddress || trimmedAddress.length < 10) {
    errors.address = "Address must be at least 10 characters.";
  } else if (trimmedAddress.length > 200) {
    errors.address = "Address must not exceed 200 characters.";
  }

  // 10. Confirmed
  if (!data.confirmed) {
    errors.confirmed = "You must confirm the registration details.";
  }

  return errors;
}
