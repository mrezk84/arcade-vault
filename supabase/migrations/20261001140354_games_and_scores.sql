-- SPEC 06: catálogo de juegos y ranking de puntajes.

create table public.games (
  id         text primary key,
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover      text not null,
  color      text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  sort_order int  not null
);

create table public.scores (
  id         uuid primary key default gen_random_uuid(),
  game_id    text not null references public.games (id),
  name       text not null check (char_length(name) between 1 and 10),
  score      int  not null check (score >= 0 and score <= 10000000),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at);

create view public.game_stats with (security_invoker = true) as
  select g.id as game_id,
         coalesce(max(s.score), 0) as best,
         count(s.id)::int as total
  from public.games g
  left join public.scores s on s.game_id = g.id
  group by g.id;

-- RLS: games solo lectura pública; scores lectura e inserción públicas.
alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "games_select_public" on public.games
  for select to anon, authenticated using (true);

create policy "scores_select_public" on public.scores
  for select to anon, authenticated using (true);

create policy "scores_insert_public" on public.scores
  for insert to anon, authenticated with check (true);

-- Privilegios mínimos (defensa adicional a RLS).
revoke all on public.games from anon, authenticated;
revoke all on public.scores from anon, authenticated;
revoke all on public.game_stats from anon, authenticated;
grant select on public.games to anon, authenticated;
grant select, insert on public.scores to anon, authenticated;
grant select on public.game_stats to anon, authenticated;

-- Seed: catálogo actual de app/data.ts.
insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  ('bloque-buster', 'BLOQUE BUSTER',
   'Rebota la pelota y destruye muros de neón.',
   'Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?',
   'ARCADE', 'cover-bricks', 'cyan', 1),
  ('caida', 'CAÍDA',
   'Encaja las piezas antes de que el techo te aplaste.',
   'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.',
   'PUZZLE', 'cover-tetro', 'magenta', 2),
  ('serpentina', 'SERPENTINA',
   'Crece sin morder tu propia cola.',
   'Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.',
   'ARCADE', 'cover-snake', 'green', 3),
  ('gloton', 'GLOTÓN',
   'Devora puntos y escapa de los fantasmas.',
   'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.',
   'ARCADE', 'cover-glot', 'yellow', 4),
  ('invasores', 'INVASORES',
   'Defiende el planeta de filas alienígenas.',
   'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.',
   'SHOOTER', 'cover-invaders', 'green', 5),
  ('rocas', 'ROCAS',
   'Pulveriza asteroides en gravedad cero.',
   'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.',
   'SHOOTER', 'cover-rocas', 'yellow', 6),
  ('asteroids', 'ASTEROIDS',
   'Rota, empuja y dispara entre rocas a la deriva.',
   'Pilota una nave vectorial con inercia real: gira, propulsa y dispara para partir cada roca en fragmentos más pequeños. Recoge el power-up 3x para abrir fuego triple. Tienes 3 vidas, y cada oleada trae más asteroides.',
   'SHOOTER', 'cover-asteroids', 'cyan', 7),
  ('ranaria', 'RANARIA',
   'Cruza la autopista de pixeles.',
   'Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.',
   'ARCADE', 'cover-rana', 'green', 8),
  ('duelo-pixel', 'DUELO PIXEL',
   'Dos paletas. Una pelota. Reflejos máximos.',
   'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.',
   'VERSUS', 'cover-duelo', 'cyan', 9);
