
create type public.app_role as enum ('participante','compras','admin');
create type public.request_status as enum ('pendente','em_analise','aprovada','em_compra','comprado','parcial','indisponivel','cancelado');
create type public.request_priority as enum ('baixa','normal','alta','urgente');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique(user_id, role)
);
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  item_name text not null check (char_length(item_name) between 1 and 150),
  category_id uuid references public.categories(id),
  quantity_requested numeric not null check (quantity_requested > 0),
  unit text not null default 'Unidade',
  priority public.request_priority not null default 'normal',
  observations text check (observations is null or char_length(observations) <= 1000),
  requester_id uuid not null default auth.uid() references public.profiles(id),
  status public.request_status not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.request_images (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  image_path text not null,
  created_at timestamptz not null default now()
);
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  quantity_purchased numeric not null default 0,
  unit_price numeric,
  total_price numeric,
  purchase_location text,
  observations text,
  purchased_by uuid not null default auth.uid() references public.profiles(id),
  purchased_at timestamptz not null default now()
);
create table public.request_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  user_id uuid references public.profiles(id),
  old_status public.request_status,
  new_status public.request_status not null,
  observation text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles, public.user_roles, public.categories, public.requests, public.request_images, public.purchases, public.request_history to authenticated;
grant all on public.profiles, public.user_roles, public.categories, public.requests, public.request_images, public.purchases, public.request_history to service_role;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.requests enable row level security;
alter table public.request_images enable row level security;
alter table public.purchases enable row level security;
alter table public.request_history enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('compras','admin'))
$$;
create or replace function public.can_see_request(_request_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff(auth.uid()) or exists (select 1 from public.requests where id = _request_id and requester_id = auth.uid())
$$;

create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles self update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "roles read own or admin" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "roles admin manage" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "categories read" on public.categories for select to authenticated using (true);
create policy "categories admin" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "requests read" on public.requests for select to authenticated using (requester_id = auth.uid() or public.is_staff(auth.uid()));
create policy "requests insert" on public.requests for insert to authenticated with check (requester_id = auth.uid() and status = 'pendente');
create policy "requests owner update pending" on public.requests for update to authenticated using (requester_id = auth.uid() and status = 'pendente') with check (requester_id = auth.uid() and status in ('pendente','cancelado'));
create policy "requests staff update" on public.requests for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "requests admin delete" on public.requests for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "images read" on public.request_images for select to authenticated using (public.can_see_request(request_id));
create policy "images insert" on public.request_images for insert to authenticated with check (exists (select 1 from public.requests r where r.id = request_id and (r.requester_id = auth.uid() or public.is_staff(auth.uid()))));
create policy "images delete" on public.request_images for delete to authenticated using (exists (select 1 from public.requests r where r.id = request_id and ((r.requester_id = auth.uid() and r.status='pendente') or public.is_staff(auth.uid()))));

create policy "purchases read" on public.purchases for select to authenticated using (public.can_see_request(request_id));
create policy "purchases staff" on public.purchases for insert to authenticated with check (public.is_staff(auth.uid()) and purchased_by = auth.uid());
create policy "purchases staff upd" on public.purchases for update to authenticated using (public.is_staff(auth.uid()));
create policy "purchases staff del" on public.purchases for delete to authenticated using (public.is_staff(auth.uid()));

create policy "history read" on public.request_history for select to authenticated using (public.can_see_request(request_id));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email);
  insert into public.user_roles (user_id, role) values (new.id, 'participante');
  if (select count(*) from public.user_roles where role = 'admin') = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.log_request_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.request_history (request_id, user_id, old_status, new_status, observation)
    values (new.id, auth.uid(), null, new.status, 'Solicitação criada');
  elsif new.status is distinct from old.status then
    insert into public.request_history (request_id, user_id, old_status, new_status, observation)
    values (new.id, auth.uid(), old.status, new.status, nullif(current_setting('lj.status_note', true), ''));
  end if;
  return null;
end $$;
create trigger request_status_ins after insert on public.requests for each row execute function public.log_request_status();
create trigger request_status_upd after update on public.requests for each row execute function public.log_request_status();

create or replace function public.touch_request()
returns trigger language plpgsql set search_path = public as $$ begin new.updated_at := now(); return new; end $$;
create trigger request_touch before update on public.requests for each row execute function public.touch_request();

create or replace function public.change_request_status(_request_id uuid, _status public.request_status, _note text default null)
returns void language plpgsql security invoker set search_path = public as $$
begin
  perform set_config('lj.status_note', coalesce(left(_note, 500), ''), true);
  update public.requests set status = _status where id = _request_id;
  if not found then raise exception 'Sem permissão ou requisição não encontrada'; end if;
end $$;
grant execute on function public.change_request_status(uuid, public.request_status, text) to authenticated;

insert into public.categories (name) values ('Alimentação'),('Higiene'),('Brinquedos'),('Roupas'),('Material recreativo'),('Material escolar'),('Kits'),('Outros');

create policy "req img upload" on storage.objects for insert to authenticated with check (bucket_id = 'request-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "req img read" on storage.objects for select to authenticated using (bucket_id = 'request-images');
create policy "req img delete own" on storage.objects for delete to authenticated using (bucket_id = 'request-images' and (storage.foldername(name))[1] = auth.uid()::text);
