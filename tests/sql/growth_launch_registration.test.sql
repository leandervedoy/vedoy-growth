-- Run against a disposable local database after the launch migration.
-- Synthetic fixtures only. All fixture changes roll back; never use production.
begin;
set local plpgsql.check_asserts = on;

do $$
begin
  assert (select relrowsecurity from pg_class where oid = 'public.growth_launch_profiles'::regclass);
  assert (select relrowsecurity from pg_class where oid = 'public.growth_launch_consent_events'::regclass);
  assert not has_table_privilege('anon', 'public.growth_launch_profiles', 'SELECT');
  assert not has_table_privilege('anon', 'public.growth_launch_profiles', 'INSERT');
  assert not has_table_privilege('anon', 'public.growth_launch_consent_events', 'SELECT');
  assert not has_table_privilege('authenticated', 'public.growth_launch_consent_events', 'INSERT');
  assert not has_table_privilege('authenticated', 'public.growth_launch_consent_events', 'UPDATE');
  assert not has_table_privilege('authenticated', 'public.growth_launch_consent_events', 'DELETE');
  assert not has_schema_privilege('authenticated', 'growth_launch_private', 'USAGE');
  assert not has_function_privilege('authenticated', 'growth_launch_private.initialize_registration()', 'EXECUTE');
  assert not has_function_privilege('anon', 'growth_launch_private.record_consent()', 'EXECUTE');
end;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
('10000000-0000-4000-8000-000000000001', 'launch-one@example.invalid',
 '{"growth_launch_registration":true,"display_name":" Person One ","organization_name":" Example Association ","organization_kind":"association","phone_e164":"+4799999999","consent_version":"forged"}'::jsonb),
('10000000-0000-4000-8000-000000000002', 'launch-two@example.invalid',
 '{"growth_launch_registration":true,"display_name":"Person Two","organization_name":"Example Business","organization_kind":"business","email_updates":false,"sms_updates":true,"phone_e164":"+4788888888"}'::jsonb),
('10000000-0000-4000-8000-000000000003', 'unrelated@example.invalid', '{}'::jsonb),
('10000000-0000-4000-8000-000000000004', 'string-flag@example.invalid', '{"growth_launch_registration":"true"}'::jsonb);

do $$
declare p public.growth_launch_profiles%rowtype;
begin
  select * into strict p from public.growth_launch_profiles where user_id = '10000000-0000-4000-8000-000000000001';
  assert p.display_name = 'Person One' and p.organization_name = 'Example Association', 'Signup names are trimmed';
  assert not p.email_updates and not p.sms_updates, 'Both channels default to false';
  assert p.phone_e164 is null, 'No phone retained without SMS';
  assert p.consent_version = '2026-10-29-v1', 'Signup cannot forge consent version';
  assert p.created_at is not null and p.consent_updated_at is not null;
  assert (select email_confirmed_at is null from auth.users where id = p.user_id), 'Unverified account fixture stays unverified';
  assert (select count(*) from public.growth_launch_consent_events where user_id = p.user_id) = 1;
  assert (select event_source = 'registration' from public.growth_launch_consent_events where user_id = p.user_id);
  assert (select sms_updates and not email_updates from public.growth_launch_profiles where user_id = '10000000-0000-4000-8000-000000000002'), 'SMS is independently optional';
  assert not exists (select 1 from public.growth_launch_profiles where user_id in ('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004')), 'Unrelated Auth registrations are untouched';

  begin
    insert into auth.users (id, email, raw_user_meta_data) values
      ('10000000-0000-4000-8000-000000000005', 'bad-boolean@example.invalid',
       '{"growth_launch_registration":true,"display_name":"Test","organization_name":"Test","organization_kind":"other","email_updates":"false"}'::jsonb);
    raise exception 'String consent must be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into auth.users (id, email, raw_user_meta_data) values
      ('10000000-0000-4000-8000-000000000005', 'bad-kind@example.invalid',
       '{"growth_launch_registration":true,"display_name":"Test","organization_name":"Test","organization_kind":"admin"}'::jsonb);
    raise exception 'Unknown organization kind must be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into auth.users (id, email, raw_user_meta_data) values
      ('10000000-0000-4000-8000-000000000005', 'bad-phone@example.invalid',
       '{"growth_launch_registration":true,"display_name":"Test","organization_name":"Test","organization_kind":"other","sms_updates":true,"phone_e164":"123"}'::jsonb);
    raise exception 'Malformed SMS phone must be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into auth.users (id, email, raw_user_meta_data) values
      ('10000000-0000-4000-8000-000000000005', 'missing-name@example.invalid', '{"growth_launch_registration":true}'::jsonb);
    raise exception 'Missing signup fields must be rejected';
  exception when check_violation then null;
  end;
  assert not exists (select 1 from auth.users where id = '10000000-0000-4000-8000-000000000005'), 'Malformed signup rolls back atomically';
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare touched integer; original_consent_time timestamptz;
begin
  assert (select count(*) from public.growth_launch_profiles) = 1, 'Owner sees only their profile';
  assert (select count(*) from public.growth_launch_consent_events) = 1, 'Owner sees only their audit';
  assert not exists (select 1 from public.growth_launch_profiles where user_id = '10000000-0000-4000-8000-000000000002');
  update public.growth_launch_profiles set organization_name = 'Cross-account edit'
    where user_id = '10000000-0000-4000-8000-000000000002';
  get diagnostics touched = row_count;
  assert touched = 0, 'Cross-account update must affect no rows';

  begin
    insert into public.growth_launch_profiles (user_id,display_name,organization_name,organization_kind)
    values ('10000000-0000-4000-8000-000000000003','Other','Other','other');
    raise exception 'Cross-account insert must fail';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.growth_launch_profiles set user_id = '10000000-0000-4000-8000-000000000003';
    raise exception 'Owner reassignment must fail';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.growth_launch_profiles set created_at = '2000-01-01';
    raise exception 'Timestamp spoofing must fail';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.growth_launch_profiles set consent_version = 'forged';
    raise exception 'Unknown consent version must fail';
  exception when check_violation then null;
  end;
  begin
    update public.growth_launch_profiles set sms_updates = true, phone_e164 = null;
    raise exception 'SMS requires a phone';
  exception when check_violation then null;
  end;
  begin
    update public.growth_launch_profiles set phone_e164 = '+4799999999';
    raise exception 'Phone without SMS must fail';
  exception when check_violation then null;
  end;
  begin
    update public.growth_launch_profiles set display_name = '   ';
    raise exception 'Blank display name must fail';
  exception when check_violation then null;
  end;
  begin
    update public.growth_launch_profiles set organization_name = repeat('x',161);
    raise exception 'Overlong organization name must fail';
  exception when check_violation then null;
  end;

  select consent_updated_at into strict original_consent_time from public.growth_launch_profiles;
  update public.growth_launch_profiles set display_name = 'Updated name';
  assert (select count(*) from public.growth_launch_consent_events) = 1, 'Ordinary edits create no false consent event';
  assert (select consent_updated_at = original_consent_time from public.growth_launch_profiles);

  update public.growth_launch_profiles set email_updates = true;
  assert (select email_updates and not sms_updates and phone_e164 is null from public.growth_launch_profiles), 'Email opt-in leaves SMS off';
  assert (select count(*) from public.growth_launch_consent_events) = 2, 'Consent change is audited';
  update public.growth_launch_profiles set sms_updates = true, phone_e164 = '+4799999999';
  update public.growth_launch_profiles set sms_updates = false, phone_e164 = null;
  update public.growth_launch_profiles set email_updates = false;
  assert (select count(*) from public.growth_launch_consent_events) = 5, 'Both opt-outs are audited';
  assert (select not email_updates and not sms_updates and phone_e164 is null from public.growth_launch_profiles);
  assert (select not email_updates and not sms_updates and phone_e164 is null
          from public.growth_launch_consent_events order by recorded_at desc limit 1), 'Latest consent snapshot reflects withdrawal';

  begin
    insert into public.growth_launch_consent_events (user_id,email_updates,sms_updates,consent_version,event_source)
    values ('10000000-0000-4000-8000-000000000001',true,false,'forged','registration');
    raise exception 'Audit insertion must be private';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.growth_launch_consent_events set email_updates = true;
    raise exception 'Audit update must fail';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.growth_launch_consent_events;
    raise exception 'Audit deletion must fail';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.growth_launch_profiles;
    raise exception 'Profile deletion is not a client permission';
  exception when insufficient_privilege then null;
  end;
  begin
    perform growth_launch_private.record_consent();
    raise exception 'Private audit function must be inaccessible';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Existing Auth accounts can initialize their own launch profile after login.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
insert into public.growth_launch_profiles (user_id,display_name,organization_name,organization_kind)
values ('10000000-0000-4000-8000-000000000003','Existing account','Example Nonprofit','nonprofit');
do $$ begin
  assert (select count(*) from public.growth_launch_profiles) = 1;
  assert (select not email_updates and not sms_updates and phone_e164 is null from public.growth_launch_profiles);
  assert (select count(*) from public.growth_launch_consent_events) = 1;
end; $$;

-- An authenticated role without a verified subject must not see or create rows.
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
do $$ begin
  assert (select count(*) from public.growth_launch_profiles) = 0;
  assert (select count(*) from public.growth_launch_consent_events) = 0;
  begin
    insert into public.growth_launch_profiles (user_id,display_name,organization_name,organization_kind)
    values ('10000000-0000-4000-8000-000000000004','Unknown','Unknown','other');
    raise exception 'Missing subject must not create a profile';
  exception when insufficient_privilege then null;
  end;
end; $$;

reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.growth_launch_profiles;
    raise exception 'Anon profile read must fail';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.growth_launch_consent_events;
    raise exception 'Anon audit read must fail';
  exception when insufficient_privilege then null;
  end;
end; $$;
reset role;

do $$ begin
  update auth.users set raw_user_meta_data = '{"email_updates":true,"sms_updates":true}'::jsonb
    where id = '10000000-0000-4000-8000-000000000001';
  assert (select not email_updates and not sms_updates from public.growth_launch_profiles where user_id = '10000000-0000-4000-8000-000000000001'), 'Later metadata edits cannot rewrite consent';
  delete from auth.users where id = '10000000-0000-4000-8000-000000000001';
  assert not exists (select 1 from public.growth_launch_profiles where user_id = '10000000-0000-4000-8000-000000000001');
  assert not exists (select 1 from public.growth_launch_consent_events where user_id = '10000000-0000-4000-8000-000000000001'), 'Account erasure cascades to its audit';
end; $$;

rollback;
