# Orah – Campus Meet 2026 Check-in System

## Overview

A secure web portal for front-desk volunteers to manage **participant and volunteer registration, payment, and event check-in**.

All portal access requires authentication.

---

## User Types

- Participant
- Volunteer

At the desk, first identify whether the person is a **participant or volunteer**.

---

## Check-in Flow

1. Ask if the person has already registered.

### Already Registered

Find the registration using either:

- Ticket QR code
- Mobile number

Then:

1. Display registration details.
2. Verify the person.
3. Collect the ₹600 fee.
4. Record payment status.
5. Approve/check in the person.

### Not Registered

1. Open New Registration.
2. Select Participant or Volunteer.
3. Collect required details.
4. Create the registration.
5. Collect ₹600.
6. Record payment.
7. Approve/check in the person.

---

## Payment

Standard fee: **₹600**

Payment statuses:

- `not_paid`
- `partially_paid`
- `paid`
- `later_pay`

For partial payment, store the amount paid.

Support:

- Show payment QR code.
- Mark payment as paid.
- Record partial payment.
- Mark as pay later.
- Add payment failure/other notes.

Example:

```ts
type Payment = {
  status: "not_paid" | "partially_paid" | "paid" | "later_pay";
  amountPaid: number;
  amountDue: number;
  note?: string;
};