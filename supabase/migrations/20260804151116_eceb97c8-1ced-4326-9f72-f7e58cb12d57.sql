insert into public.categories (slug,name,kind,position) values
 ('defense','Défense','theme',26),
 ('securite','Sécurité','theme',27),
 ('fact-check','Fact-check','format',28),
 ('decouverte','Découverte','theme',29),
 ('nation','Nation','region',30)
on conflict (slug) do nothing;