-- Track job offer acceptance rates per driver.
-- offers_received: total offers shown (SHOW_JOB_OFFER fired)
-- offers_declined: offers declined OR timed out without acceptance
alter table drivers
  add column if not exists offers_received integer not null default 0,
  add column if not exists offers_declined integer not null default 0;
