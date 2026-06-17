-- Local development seed data.
-- 1 org · 2 branches · 5 users (one per role) · 5 profiles · 5 memberships
-- Password for all users: Password123!

DO $$
DECLARE
  v_org_id       uuid := 'a0000000-0000-0000-0000-000000000001';
  v_branch1_id   uuid := 'b0000000-0000-0000-0000-000000000001';
  v_branch2_id   uuid := 'b0000000-0000-0000-0000-000000000002';
  v_user_owner   uuid := 'c0000000-0000-0000-0000-000000000001';
  v_user_admin   uuid := 'c0000000-0000-0000-0000-000000000002';
  v_user_chef    uuid := 'c0000000-0000-0000-0000-000000000003';
  v_user_waiter  uuid := 'c0000000-0000-0000-0000-000000000004';
  v_user_cashier uuid := 'c0000000-0000-0000-0000-000000000005';
BEGIN
  -- Organization
  INSERT INTO public.organizations (id, tax_id, name, slug)
  VALUES (v_org_id, '0501649552001', 'Demo Restaurant Group', 'demo-restaurant-group');

  -- Branches
  INSERT INTO public.branches (id, org_id, code, name, address)
  VALUES
    (v_branch1_id, v_org_id, 1, 'Downtown',           '123 Main St'),
    (v_branch2_id, v_org_id, 2, 'Airport Terminal 2', 'Terminal 2, Gate B');

  -- Auth users
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  )
  VALUES
    (v_user_owner,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'owner@chefmate.dev',   crypt('Password123!', gen_salt('bf')), now(), now(), now(), '{}', '{}', false),
    (v_user_admin,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'admin@chefmate.dev',   crypt('Password123!', gen_salt('bf')), now(), now(), now(), '{}', '{}', false),
    (v_user_chef,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'chef@chefmate.dev',    crypt('Password123!', gen_salt('bf')), now(), now(), now(), '{}', '{}', false),
    (v_user_waiter,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'waiter@chefmate.dev',  crypt('Password123!', gen_salt('bf')), now(), now(), now(), '{}', '{}', false),
    (v_user_cashier, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'cashier@chefmate.dev', crypt('Password123!', gen_salt('bf')), now(), now(), now(), '{}', '{}', false);

  -- Profiles
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES
    (v_user_owner,   'Alice',  'Owner'),
    (v_user_admin,   'Bob',    'Admin'),
    (v_user_chef,    'Carlos', 'Chef'),
    (v_user_waiter,  'Diana',  'Waiter'),
    (v_user_cashier, 'Edgar',  'Cashier');

  -- Memberships: owner/admin are org-level (branch_id = NULL);
  -- chef/waiter/cashier are scoped to branch 1.
  INSERT INTO public.memberships (user_id, org_id, branch_id, role)
  VALUES
    (v_user_owner,   v_org_id, NULL,         'owner'),
    (v_user_admin,   v_org_id, NULL,         'admin'),
    (v_user_chef,    v_org_id, v_branch1_id, 'chef'),
    (v_user_waiter,  v_org_id, v_branch1_id, 'waiter'),
    (v_user_cashier, v_org_id, v_branch1_id, 'cashier');
END $$;
