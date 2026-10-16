# Operations manual

How the founding team (and, after incorporation, the foundation's staff and board) should run the
platform day to day. Roles referenced here are proposals to be formalised in the statute and
internal regulations with Italian advisers.

> Until the foundation is incorporated, **no money is accepted**, no beneficiary is engaged and no
> project is approved. The workflows below describe how things should work from the start, so that
> good habits exist before funds do.

## Roles and responsibilities (proposed)

| Role | Responsibilities | Platform role |
|---|---|---|
| Board (Consiglio di amministrazione) | Approves strategy, annual budget, every funding decision above the delegated limit, policies | VIEWER (board observers), ADMIN for the Chair if needed |
| Executive / programme lead | Prepares proposals, runs due diligence, manages partners and projects | EDITOR |
| Treasurer / finance lead | Payments, reconciliation, accounts, donor-records retention | ADMIN |
| Safeguarding lead | Child-safeguarding policy, consent records, incident handling, media approval involving minors | EDITOR |
| Data-protection contact | Privacy requests, exports, retention, breach handling | ADMIN |

Principles: least privilege, at least two people for anything involving money, no one approves
their own expense or a project in which they have an interest. The windsurf partnership with
YoungGuns, owned by a founder, is a related-party arrangement: written terms, board approval
without that founder's vote, and disclosure on the Transparency page.

## Weekly operating workflow

**Monday — inbox and enquiries (programme lead, ~30 min)**
1. Open **Admin → Dashboard**. Check "Notification failures" — if non-zero, email is not reaching
   staff; enquiries are still in the database.
2. **Admin → Enquiries**, filter `NEW`. For each: reply from the shared mailbox, set status to
   `IN_PROGRESS` or `RESOLVED`, and record a short internal note (no unnecessary personal data).
3. Mark obvious spam as `SPAM`. Target: every enquiry acknowledged within 10 working days.
4. Partnership enquiries: log next steps; never promise recognition or use a logo before a signed
   agreement.

**Wednesday — projects and content (programme lead + safeguarding lead)**
1. Review each active project's milestones; tick completed ones; add a project update if anything
   material happened (delays included).
2. Check new media: credit and licence filled in; images of minors only public with documented
   guardian consent (the platform blocks it otherwise); no information that could locate a child.
3. Verify every public figure is either real (ledger) or labelled illustrative.

**Friday — finance and controls (treasurer; only once donations are enabled)**
1. **Admin → Donations**: reconcile each `SUCCEEDED` donation (see *Event financial reconciliation*
   and *Donation reconciliation* below). Investigate any `DISCREPANCY`.
2. Check the latest webhook events for `unmatched` entries.
3. Review **Admin → Audit log** for unexpected sign-ins, exports or role changes.
4. Update `pledgedCents` / `spentCents` on projects only from signed pledges and paid invoices.

**Monthly**
- Board/finance review: budget vs actual per project, reserve level, pipeline of pledges.
- Users review: deactivate people who no longer need access; confirm roles are least-privilege.
- Data retention: delete enquiries older than 24 months that have no ongoing relationship
  (Admin → Enquiries → record → *Erase permanently*), and old exports from local machines.
- Back-up check: confirm the database provider's point-in-time recovery is active; test a restore
  quarterly.

## Funding approval responsibilities

Project status in the platform mirrors the governance process. Changes of status are audit-logged.

| Status | Who may set it | Required before moving on |
|---|---|---|
| `IDEA` | Programme lead | Concept note, rough budget labelled illustrative |
| `UNDER_REVIEW` | Programme lead | Needs assessment started; beneficiary due-diligence file opened |
| `APPROVED` | Board resolution (minuted) | Due diligence complete; budget with quotes; safeguarding plan; conflicts declared; written agreement drafted |
| `FUNDRAISING` | Treasurer, after approval | Bank account and payment provider verified; donation wording approved |
| `IN_PROGRESS` | Programme lead | Signed agreement with beneficiary/partner; authorisations obtained; funds available |
| `COMPLETED` | Board noting | Completion report, technical sign-off (works), final accounts, evidence published |

Rules:
- Two signatories for every payment; segregation between who approves, who pays and who reconciles.
- Members with a conflict of interest leave the discussion and do not vote; record it in minutes.
- Sponsors and donors never influence the selection of individual beneficiaries.
- Budgets are marked *illustrative* until backed by quotes; *pledged* only with a signed pledge.

## Beneficiary due diligence

Record each organisation in **Admin → Beneficiaries** (internal only; publish a name only with
written consent — tick "Written consent to be named publicly").

Checklist (keep evidence in the document archive, not in free-text notes):
1. **Identity and legal status** — official name, registration in its own country, legal form,
   statute; for schools, the public body that owns or runs the school and the school leadership.
   Local partner organisations in Morocco, Kenya or elsewhere are checked against their country's
   registers, with references from other funders.
2. **Authority** — who can sign agreements; board/council resolution where required.
3. **Need and fit** — baseline assessment, alignment with the mission, absence of duplicate funding.
4. **Authorisations (school works)** — building ownership, permits (e.g. CILA/SCIA as applicable),
   safety and accessibility requirements, procurement rules applicable to public bodies.
5. **Safeguarding** — the partner's own child-protection policy; vetting of adults (e.g. certificato
   del casellario giudiziario where required); supervision ratios; incident procedures.
6. **Regatta partners** — the organising club's permits and insurance, clear written terms on
   how proceeds are collected and reported, and no implied endorsements.
7. **Cross-border payments** — funds sent only to verified bank accounts in the partner's own
   name, in instalments against verified milestones, with sanctions screening.
8. **Integrity checks** — sanctions/adverse media screening; conflicts of interest with board
   members, donors or sponsors.
9. **Financial controls** — bank details verified by call-back; payments preferably direct to
   suppliers against invoices.
10. **Data protection** — data-sharing terms; aggregate reporting only for minors.

Set the due-diligence status to `APPROVED` only when every item is satisfied and documented.

## Project monitoring

- Each project defines 3–5 indicators and a baseline before work starts (published on the project
  page as goals). Examples: completion of works on budget; number of course places taken up
  (aggregate); attendance/completion rates (aggregate); satisfaction of the partner school.
- Milestones are updated weekly; slippage of more than one month triggers a project update
  explaining why.
- Site visits (works) or session observations (sailing) at least once per phase; record findings.
- Evidence to publish (Admin → Media, linked to the project, as PDF): authorisations (redacted),
  technical sign-off, summarised invoices, completion report. Redact personal data.
- Never publish identifying information about minors. Photos only with documented guardian consent,
  approved by the safeguarding lead.

## Donor reporting

- Thank-you within 2 working days of a confirmed donation (manual email until an automated,
  legally approved template exists). Confirmation emails are **not** tax receipts.
- Tax receipts: only after the legal form and registration allow it, and with wording approved by
  the tax adviser. Until then, do not issue anything that could be read as a deductible receipt.
- Restricted (designated) gifts are spent only on the designated project; if that becomes
  impossible, ask the donor before reallocating.
- Annual report: programmes, outputs, outcomes, financial statements, gross and net event results,
  administration share, reserve, and what did not go as planned.
- Partners: report on how their contribution was used, as agreed in writing.
- Donor data: used only for stewardship as described in the privacy notice; no list sharing.

## Donation reconciliation (once enabled)

For each succeeded donation in **Admin → Donations**:
1. Match the Stripe payment (checkout session / payment intent shown in the record) to a Stripe
   payout, and the payout to the bank statement.
2. Confirm amount and currency; note Stripe fees separately in the accounts (the ledger records the
   gross amount paid by the donor).
3. Set reconciliation to `RECONCILED` (records who and when) or `DISCREPANCY` with a note.
4. Refunds and disputes: the webhook marks `REFUNDED`; reconcile the reversal the same way.
5. Monthly: export the ledger (Admin → Exports → Donation ledger) for the accountant.

## Event financial reconciliation (gala and regatta)

Before the event:
1. Board-approved event budget with **gross target, direct costs and net target**; break-even
   analysis; contingency.
2. Contracts (venue, catering, production) in the foundation's name; insurance and permits
   (e.g. SIAE, public entertainment, food & beverage, maritime authority for regatta activities).
3. Auction lots only with written donor confirmation of ownership and description; no implied
   endorsements; valuation basis documented.

After the event (within 30 days):
1. **Income ledger** by stream: tickets, table sponsorship, auction, donations on the night,
   in-kind. Match every line to a bank/Stripe record or written in-kind acknowledgement.
2. **Cost ledger**: every invoice paid, accruals for invoices not yet received.
3. Compute and publish: gross raised, direct costs, **net contribution**, cost-to-income ratio.
4. Reconcile cash and card takings (two people count cash; sealed bags; deposit next working day).
5. Close event-interest records (Admin → Enquiries → Event interest) and erase those not needed.
6. Board review and lessons learnt; update the next year's budget.

## Incident handling

- **Data breach**: contain, assess, record; notify the Garante within 72 hours where required and
  affected people where the risk is high. Revoke sessions (deactivate users) and rotate secrets.
- **Safeguarding concern**: follow the safeguarding policy immediately; the safeguarding lead
  decides on referral to authorities; never investigate alone; keep records confidential.
- **Payment issue**: switch `FEATURE_DONATIONS_ENABLED=false` in Vercel and redeploy to stop new
  checkouts; webhooks continue to update existing records.
