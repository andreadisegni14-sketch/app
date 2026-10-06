-- Founders' queries for the pilot (Scope Sheet §1 "How we know it worked").
-- Run in the Supabase SQL editor. Users never see any of this.

-- PROOF SIGNAL: captures per user per week (commitments sent unprompted; every
-- capture is unprompted because the bot only ever speaks first for reminders).
-- Target in week 2: at least half of pilot users with >= 3.
select telegram_user_id,
       date_trunc('week', created_at at time zone 'Europe/Madrid') as week,
       count(*) as captures,
       count(*) filter (where status not in ('ignored', 'proposed')) as confirmed_captures
  from commitments
 where status <> 'not_commitment'
 group by 1, 2
 order by 2, 3 desc;

-- Share of pilot users hitting >= 3 captures in a given week.
with weekly as (
  select telegram_user_id, date_trunc('week', created_at at time zone 'Europe/Madrid') as week, count(*) as n
    from commitments where status <> 'not_commitment' group by 1, 2
)
select week,
       count(*) filter (where n >= 3) as users_with_3_plus,
       count(*) as active_users
  from weekly group by week order by week;

-- SECONDARY SIGNAL: share of reminders answered "Done".
select count(*) filter (where status = 'done')                    as done,
       count(*) filter (where status = 'dropped')                 as dropped,
       count(*) filter (where status = 'snoozed')                 as still_snoozed,
       count(*) filter (where reminded_at is not null)            as reminded,
       round(100.0 * count(*) filter (where status = 'done')
             / nullif(count(*) filter (where reminded_at is not null), 0), 1) as pct_done
  from commitments;

-- KILL SIGNAL: last capture per user. Many users silent after their first days = kill.
select telegram_user_id, min(created_at) as first_capture, max(created_at) as last_capture, count(*) as captures
  from commitments where status <> 'not_commitment'
 group by 1 order by last_capture;

-- RULE FOR ADDING LATER: how many different users showed each behaviour (build at >= 3).
select signal, count(distinct telegram_user_id) as users
  from commitments, unnest(signals) as signal
 group by 1 order by 2 desc;

-- Extraction quality (assumption A4): how often users had to edit or ignore.
select count(*) filter (where edit_count > 0) as edited,
       count(*) filter (where status = 'ignored') as ignored,
       count(*) filter (where status <> 'not_commitment') as captures
  from commitments;
