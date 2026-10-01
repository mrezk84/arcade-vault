-- Catálogo reducido: solo Asteroids. Los demás juegos se agregan cuando se implementen.
delete from public.games where id <> 'asteroids';
