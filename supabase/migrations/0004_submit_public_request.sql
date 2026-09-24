-- Public request submission goes through this SECURITY DEFINER function instead
-- of direct table INSERTs, because:
--   1. INSERT ... RETURNING requires SELECT RLS on the row too, and requests/
--      requesters are admin-only to read.
--   2. Requester matching (by verified email/phone) requires reading
--      requesters, which anon cannot do directly under RLS.
create or replace function public.submit_public_request(
  p_name text,
  p_email text default null,
  p_phone text default null,
  p_organization text default null,
  p_location text default null,
  p_requirement text default null,
  p_target text default null,
  p_expected_output text default null,
  p_deadline timestamptz default null,
  p_start_date timestamptz default null,
  p_additional_details text default null
)
returns table (request_id uuid, request_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester_id uuid;
  v_request_id uuid;
  v_request_code text;
begin
  if coalesce(trim(p_name), '') = '' then
    raise exception 'name is required';
  end if;
  if coalesce(trim(p_requirement), '') = '' then
    raise exception 'requirement is required';
  end if;

  if p_email is not null and trim(p_email) <> '' then
    select r.id into v_requester_id from public.requesters r where lower(r.email) = lower(trim(p_email)) limit 1;
  end if;
  if v_requester_id is null and p_phone is not null and trim(p_phone) <> '' then
    select r.id into v_requester_id from public.requesters r where r.phone = trim(p_phone) limit 1;
  end if;

  if v_requester_id is null then
    insert into public.requesters (name, email, phone, organization, location)
    values (trim(p_name), nullif(trim(p_email), ''), nullif(trim(p_phone), ''), nullif(trim(p_organization), ''), nullif(trim(p_location), ''))
    returning requesters.id into v_requester_id;
  else
    update public.requesters
    set name = trim(p_name),
        organization = coalesce(nullif(trim(p_organization), ''), organization),
        location = coalesce(nullif(trim(p_location), ''), location)
    where requesters.id = v_requester_id;
  end if;

  insert into public.requests (
    requester_id, name_snapshot, email_snapshot, phone_snapshot, organization, location,
    requirement, target, expected_output, deadline, start_date, additional_details
  ) values (
    v_requester_id, trim(p_name), nullif(trim(p_email), ''), nullif(trim(p_phone), ''),
    nullif(trim(p_organization), ''), nullif(trim(p_location), ''),
    trim(p_requirement), nullif(trim(p_target), ''), nullif(trim(p_expected_output), ''),
    p_deadline, p_start_date, nullif(trim(p_additional_details), '')
  )
  returning public.requests.id, public.requests.request_code into v_request_id, v_request_code;

  return query select v_request_id, v_request_code;
end;
$$;

grant execute on function public.submit_public_request(
  text, text, text, text, text, text, text, text, timestamptz, timestamptz, text
) to anon, authenticated;

-- Direct table INSERT is no longer the intended public path; keep SELECT/UPDATE
-- admin-only and drop the broad anon INSERT policies now that the RPC exists.
drop policy if exists "requests_insert_public" on public.requests;
drop policy if exists "requesters_insert_public" on public.requesters;
