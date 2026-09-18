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
3. Collect the registration fee (Participant: ₹600, Volunteer: ₹400).
4. Record payment status.
5. Approve/check in the person.

### Not Registered

1. Open New Registration.
2. Select Participant or Volunteer.
3. Collect required details.
4. Create the registration.
5. Collect the registration fee (Participant: ₹600, Volunteer: ₹400).
6. Record payment.
7. Approve/check in the person.

---

## Payment

Standard fee:
- **Participant:** ₹600
- **Volunteer:** ₹400

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
```

---

## Group Assignment (Participants Only)

- Group numbers 1 to 15 assigned in sequential round-robin order:
  - Check-in 1 &rarr; Group 1
  - Check-in 2 &rarr; Group 2
  - ...
  - Check-in 15 &rarr; Group 15
  - Check-in 16 &rarr; Group 1
- Strictly applicable only to participants (not volunteers or resource persons).
- Visible as a hanging badge on the check-in modal during payment and saved to `checkins.group_number`.