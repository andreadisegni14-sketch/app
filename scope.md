# Wazy — Scope Sheet (Document 2)

> The fence around the MVP. This sheet says what the first version does, what it deliberately does not do, and the rule for adding anything later. It follows the Architecture Doc (Document 1). If a feature is not on the "does" list, it is out.

Version: v0.1, 6 October 2026. Owners: Andrea and David García.

## 1. What the MVP does

**In one line:** a Telegram bot that turns a commitment you just made into a confirmed reminder, and checks whether you did it.

### The thinnest version that still gives real proof

- The user sends the bot a message the moment they make a commitment ("told Marta I'd send the deck Friday").
- The bot extracts what, for whom and by when, and replies with a summary and three buttons: Confirm, Edit, Ignore.
- On the due date the bot sends one reminder with three buttons: Done, Snooze one day, Drop.
- Every capture, confirmation and answer is written to one database table.

### One user, one job, one screen

- **One user:** a busy student with a society or job, or a young professional in finance or consulting.
- **One job:** "don't let me forget the small thing I just promised".
- **One screen:** the Telegram chat. No app, no website, no login.

### Tied to one assumption

Assumption A3 from Document 1: users will message a commitment the moment they make it.

This is the assumption the MVP tests because the interviews can test A1 and A2 (is the problem real), but only real use can show whether people actually capture in the moment. If they don't capture, nothing else in Wazy matters.

### How we know it worked

- **Pilot:** 10 to 15 users from the interview pool and ESADE classmates, for 2 weeks.
- **Proof signal:** at least half of pilot users capture 3 or more commitments per week without being prompted in week 2.
- **Secondary signal:** share of reminders answered "Done".
- **Kill signal:** most users stop capturing after the first few days.

## 2. What it deliberately does NOT do

### Features thrown away for now, by name

- **Email forwarding:** a second capture channel doubles the work before we know one channel works.
- **Web app / PWA:** the Telegram chat is the only screen.
- **Google Calendar and Outlook sync:** scheduling is not the assumption under test.
- **User accounts and login:** the Telegram user ID is the identity.
- **Payments and pricing:** no willingness-to-pay test in this MVP.
- **Dashboard and statistics for users:** the founders read the database; users see nothing but the chat.
- **Analytics tool (PostHog):** one events table is enough for 15 users.
- **Recurring commitments and custom snooze times:** one reminder, one day of snooze.
- **Voice notes, photos and screenshots:** text only.
- **Sharing or delegating commitments to other people:** single-player only.
- **WhatsApp:** Telegram only, for the reasons in Document 1.
- **Automatic reading of inbox, calendar or chats:** the user always sends the commitment themselves.

### No accounts, no payments, no dashboard

None of them is needed to prove A3. The proof lives in one database table that the founders query by hand.

## 3. Rule for adding later

We only add a feature if at least 3 different pilot users do it manually first.

Examples of what that looks like in practice:

- Email forwarding gets built only if 3 or more users paste email text into the bot.
- Calendar sync gets built only if 3 or more users ask the bot to "put it in my calendar" or add reminders to their calendar themselves.
- A dashboard gets built only if 3 or more users ask the bot "what do I still owe?".
- Recurring commitments get built only if 3 or more users capture the same commitment again week after week.

Every feature added under this rule is logged in the Decision Log of Document 1, with the users and behaviour that justified it.
