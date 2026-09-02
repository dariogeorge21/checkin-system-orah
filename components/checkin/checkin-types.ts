export type PersonType = "participant" | "volunteer";
export type RegistrationType = "ONLINE" | "OFFLINE" | "SPOT";
export type PaymentMethod = "CASH" | "UPI";
export type PaymentStatus = "paid" | "partially_paid" | "later_pay" | "not_paid";

export interface CheckinPaymentData {
  method: PaymentMethod;
  status: PaymentStatus;
  amountPaid: number;
  amountDue: number;
  note?: string;
}

export interface CheckinRecord {
  id: string;
  event_id?: string;
  registration_id?: string | null;
  volunteer_registration_id?: string | null;
  registration_option?: string;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod | null;
  amount_paid: number;
  amount_due: number;
  payment_note?: string | null;
  checked_in_at?: string;
  checked_in_by?: string | null;
}

export interface UnifiedAttendee {
  id: string;
  personType: PersonType;
  name: string;
  phone: string;
  email?: string | null;
  parish?: string | null;
  diocese?: string | null;
  ministry?: string | null;
  role?: string | null;
  affiliation?: string | null;
  college?: string | null;
  institute?: string | null;
  year_of_study?: string | null;
  address?: string | null;
  registrationType: RegistrationType;
  createdAt: string;
  
  // Check-in status
  isCheckedIn: boolean;
  checkin?: CheckinRecord | null;
}

export interface RecentCheckinItem {
  id: string; // checkin id
  personType: PersonType;
  registrationId: string;
  name: string;
  phone: string;
  parishOrMinistry: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | null;
  amountPaid: number;
  amountDue: number;
  checkedInAt: string;
  registrationType: RegistrationType;
}
