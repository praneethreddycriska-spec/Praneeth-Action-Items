-- Extends submit_public_request with urgency/timeline/dependencies fields
-- needed to create a complete action item on auto-approval, and normalizes
-- p_urgency to a safe enum value instead of trusting arbitrary input.
create function public.submit_public_request(
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
  p_additional_details text default null,
  p_urgency text default null,
  p_dependencies text default null,
  p_important_instructions text default null,
  p_reference_links text default null
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
  v_urgency text;
begin
  if coalesce(trim(p_name), '') = '' then
    raise exception 'name is required';
  end if;
  if coalesce(trim(p_requirement), '') = '' then
    raise exception 'requirement is required';
  end if;

  v_urgency := case lower(coalesce(p_urgency, ''))
    when 'low' then 'low' when 'medium' then 'medium' when 'high' then 'high' when 'critical' then 'critical'
    else null
  end;

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
    requirement, target, expected_output, deadline, start_date, additional_details,
    urgency, dependencies, important_instructions, reference_links
  ) values (
    v_requester_id, trim(p_name), nullif(trim(p_email), ''), nullif(trim(p_phone), ''),
    nullif(trim(p_organization), ''), nullif(trim(p_location), ''),
    trim(p_requirement), nullif(trim(p_target), ''), nullif(trim(p_expected_output), ''),
    p_deadline, p_start_date, nullif(trim(p_additional_details), ''),
    v_urgency, nullif(trim(p_dependencies), ''), nullif(trim(p_important_instructions), ''), nullif(trim(p_reference_links), '')
  )
  returning requests.id, requests.request_code into v_request_id, v_request_code;

  return query select v_request_id, v_request_code;
end;
$$;

grant execute on function public.submit_public_request(
  text, text, text, text, text, text, text, text, timestamptz, timestamptz, text, text, text, text, text
) to anon, authenticated;
