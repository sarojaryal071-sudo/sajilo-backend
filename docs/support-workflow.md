# Sajilo – Support Ticket Workflow

How to handle tickets submitted by workers and clients.

## 1. New Ticket Arrives

- [ ] Admins receive a ticket via the admin panel or API
- [ ] Tickets have categories: `payment`, `worker_behavior`, `client_behavior`, `booking_issue`, `technical_issue`
- [ ] Each ticket contains a description and the reporter's role

## 2. Triage

- [ ] Assign a status: `open` → `investigating`
- [ ] Optionally assign an admin (`PUT /api/admin/support/tickets/:id`)
- [ ] Read the description and any attached metadata

## 3. Investigate

- [ ] Check the **Activity Timeline** for related events
- [ ] Look up the booking/payment/user in the admin panel
- [ ] Contact the reporter through the chat system if needed

## 4. Resolve

- [ ] Change the status to `resolved` or `closed`
- [ ] Add a resolution note explaining the outcome
- [ ] The ticket remains in the system for future reference

## 5. Escalation

- [ ] If a ticket requires developer intervention, tag it as `technical_issue`
- [ ] Notify the engineering team via external channels