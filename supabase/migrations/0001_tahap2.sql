-- Tahap 2: akun + sinkronisasi riwayat antar perangkat.
--
-- Papan pantau pengajar TIDAK termasuk, jadi tidak ada tabel kelas, tidak ada
-- kolom peran, dan tidak ada satu pun kebijakan yang mengizinkan seorang murid
-- membaca baris murid lain. Setiap baris hanya bisa dibaca dan ditulis oleh
-- pemiliknya sendiri.
--
-- `kanji_state.data` sengaja berbentuk jsonb, bukan kolom per bidang. Metode
-- belajar masih mungkin berubah setelah diuji ke murid; kalau bentuk KanjiState
-- berubah, bentuk tabel tidak perlu ikut bermigrasi.

-- ---------------------------------------------------------------- tabel

create table if not exists public.profil (
  id          uuid        primary key references auth.users on delete cascade,
  tg          text        not null default 'N5',
  ujian       date,
  offset_hari integer     not null default 0,
  last_acc    real,
  setuju_pada timestamptz,                      -- kapan murid menyetujui penyimpanan di server
  diubah      timestamptz not null default now(),
  constraint profil_tg_sah check (tg in ('N5', 'JFT', 'N3', 'N2', 'N1'))
);

comment on column public.profil.setuju_pada is
  'Diisi saat murid menyetujui datanya disimpan di server. Kosong = belum setuju.';

create table if not exists public.kanji_state (
  user_id uuid        not null references auth.users on delete cascade,
  kanji   text        not null,
  data    jsonb       not null,                 -- KanjiState apa adanya
  diubah  timestamptz not null,                 -- cap waktu perubahan di perangkat; dipakai saat bentrok
  primary key (user_id, kanji)
);

create table if not exists public.log_sesi (
  id      text    primary key,                  -- dibuat di perangkat, supaya sesi yang sama tidak dobel
  user_id uuid    not null references auth.users on delete cascade,
  d       date    not null,
  n       integer not null,
  acc     real    not null
);

create index if not exists log_sesi_user_d_idx on public.log_sesi (user_id, d);

-- ------------------------------------------------- keamanan baris (RLS)

alter table public.profil      enable row level security;
alter table public.kanji_state enable row level security;
alter table public.log_sesi    enable row level security;

drop policy if exists "profil: baca milik sendiri"  on public.profil;
drop policy if exists "profil: sisip milik sendiri" on public.profil;
drop policy if exists "profil: ubah milik sendiri"  on public.profil;
drop policy if exists "profil: hapus milik sendiri" on public.profil;

create policy "profil: baca milik sendiri"  on public.profil for select using (auth.uid() = id);
create policy "profil: sisip milik sendiri" on public.profil for insert with check (auth.uid() = id);
create policy "profil: ubah milik sendiri"  on public.profil for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profil: hapus milik sendiri" on public.profil for delete using (auth.uid() = id);

drop policy if exists "kanji: baca milik sendiri"  on public.kanji_state;
drop policy if exists "kanji: sisip milik sendiri" on public.kanji_state;
drop policy if exists "kanji: ubah milik sendiri"  on public.kanji_state;
drop policy if exists "kanji: hapus milik sendiri" on public.kanji_state;

create policy "kanji: baca milik sendiri"  on public.kanji_state for select using (auth.uid() = user_id);
create policy "kanji: sisip milik sendiri" on public.kanji_state for insert with check (auth.uid() = user_id);
create policy "kanji: ubah milik sendiri"  on public.kanji_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "kanji: hapus milik sendiri" on public.kanji_state for delete using (auth.uid() = user_id);

drop policy if exists "log: baca milik sendiri"  on public.log_sesi;
drop policy if exists "log: sisip milik sendiri" on public.log_sesi;
drop policy if exists "log: hapus milik sendiri" on public.log_sesi;

create policy "log: baca milik sendiri"  on public.log_sesi for select using (auth.uid() = user_id);
create policy "log: sisip milik sendiri" on public.log_sesi for insert with check (auth.uid() = user_id);
create policy "log: hapus milik sendiri" on public.log_sesi for delete using (auth.uid() = user_id);
-- Sengaja tanpa kebijakan UPDATE: entri log bersifat tambah-saja.

-- --------------------------------------------- profil otomatis saat daftar

create or replace function public.buat_profil_baru()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profil (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists buat_profil_saat_daftar on auth.users;
create trigger buat_profil_saat_daftar
  after insert on auth.users
  for each row execute function public.buat_profil_baru();

-- -------------------------------------------------- hapus akun sendiri

-- Kunci anon tidak boleh menghapus baris di auth.users, jadi murid butuh fungsi
-- ini untuk benar-benar bisa menghapus akunnya. Penghapusan auth.users membuat
-- profil, kanji_state, dan log_sesi ikut terhapus lewat on delete cascade.
create or replace function public.hapus_akun_saya()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  saya uuid := auth.uid();
begin
  if saya is null then
    raise exception 'Tidak ada akun yang sedang masuk';
  end if;
  delete from auth.users where id = saya;
end;
$$;

revoke all on function public.hapus_akun_saya() from public, anon;
grant execute on function public.hapus_akun_saya() to authenticated;
