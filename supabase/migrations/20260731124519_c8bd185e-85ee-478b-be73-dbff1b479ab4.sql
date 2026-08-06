-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','directeur_publication','redacteur_chef','editeur','journaliste','correcteur','photographe','videaste','community_manager');
CREATE TYPE public.article_status AS ENUM ('brouillon','relecture','valide','publie');

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'theme',
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  position int NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- AUTHORS
CREATE TABLE public.authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  role_label text,
  bio text,
  avatar_url text,
  city text,
  twitter text,
  linkedin text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.authors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.authors TO authenticated;
GRANT ALL ON public.authors TO service_role;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;

-- USER ROLES (separate table, never on profile)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_newsroom(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.can_publish(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','directeur_publication','redacteur_chef')
  );
$$;

CREATE POLICY "Chacun lit ses propres roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Seul un admin gere les roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ARTICLES
CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  dek text,
  body text NOT NULL DEFAULT '',
  cover_url text,
  cover_credit text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  author_id uuid REFERENCES public.authors(id) ON DELETE SET NULL,
  created_by uuid,
  status public.article_status NOT NULL DEFAULT 'brouillon',
  published_at timestamptz,
  location text,
  reading_minutes int NOT NULL DEFAULT 3,
  is_featured boolean NOT NULL DEFAULT false,
  is_breaking boolean NOT NULL DEFAULT false,
  seo_title text,
  seo_description text,
  view_count int NOT NULL DEFAULT 0,
  share_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX articles_published_idx ON public.articles (status, published_at DESC);
CREATE INDEX articles_category_idx ON public.articles (category_id);
CREATE INDEX articles_search_idx ON public.articles USING gin (to_tsvector('french', coalesce(title,'') || ' ' || coalesce(dek,'') || ' ' || coalesce(body,'')));
GRANT SELECT ON public.articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique des articles publies" ON public.articles
  FOR SELECT TO anon USING (status = 'publie' AND published_at IS NOT NULL AND published_at <= now());
CREATE POLICY "La redaction lit tous les articles" ON public.articles
  FOR SELECT TO authenticated USING (
    (status = 'publie' AND published_at IS NOT NULL AND published_at <= now())
    OR public.is_newsroom(auth.uid())
    OR created_by = auth.uid()
  );
CREATE POLICY "La redaction cree des articles" ON public.articles
  FOR INSERT TO authenticated WITH CHECK (public.is_newsroom(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Auteur ou editeur modifie" ON public.articles
  FOR UPDATE TO authenticated USING (
    public.can_publish(auth.uid())
    OR public.has_role(auth.uid(),'editeur')
    OR (created_by = auth.uid() AND status <> 'publie')
  ) WITH CHECK (
    public.can_publish(auth.uid())
    OR public.has_role(auth.uid(),'editeur')
    OR (created_by = auth.uid() AND status <> 'publie')
  );
CREATE POLICY "Seule la direction supprime" ON public.articles
  FOR DELETE TO authenticated USING (public.can_publish(auth.uid()));

CREATE POLICY "Rubriques publiques" ON public.categories FOR SELECT TO anon USING (true);
CREATE POLICY "Rubriques lisibles connecte" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Direction gere les rubriques" ON public.categories
  FOR ALL TO authenticated USING (public.can_publish(auth.uid())) WITH CHECK (public.can_publish(auth.uid()));

CREATE POLICY "Journalistes publics" ON public.authors FOR SELECT TO anon USING (true);
CREATE POLICY "Journalistes lisibles connecte" ON public.authors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Chacun modifie sa fiche" ON public.authors
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.can_publish(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.can_publish(auth.uid()));
CREATE POLICY "Direction cree des fiches" ON public.authors
  FOR INSERT TO authenticated WITH CHECK (public.can_publish(auth.uid()));
CREATE POLICY "Direction supprime des fiches" ON public.authors
  FOR DELETE TO authenticated USING (public.can_publish(auth.uid()));

-- TAGS
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tags publics" ON public.tags FOR SELECT TO anon USING (true);
CREATE POLICY "Tags lisibles connecte" ON public.tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Redaction gere les tags" ON public.tags
  FOR ALL TO authenticated USING (public.is_newsroom(auth.uid())) WITH CHECK (public.is_newsroom(auth.uid()));

CREATE TABLE public.article_tags (
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);
GRANT SELECT ON public.article_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_tags TO authenticated;
GRANT ALL ON public.article_tags TO service_role;
ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Liens tags publics" ON public.article_tags FOR SELECT TO anon USING (true);
CREATE POLICY "Liens tags lisibles connecte" ON public.article_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Redaction gere les liens tags" ON public.article_tags
  FOR ALL TO authenticated USING (public.is_newsroom(auth.uid())) WITH CHECK (public.is_newsroom(auth.uid()));

-- updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER articles_touch BEFORE UPDATE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ SEED : 24 RUBRIQUES ============
INSERT INTO public.categories (slug, name, kind, position) VALUES
('rdc','Actualités RDC','region',1),
('nord-kivu','Nord-Kivu','region',2),
('sud-kivu','Sud-Kivu','region',3),
('ituri','Ituri','region',4),
('afrique','Afrique','region',5),
('monde','Monde','region',6),
('politique','Politique','theme',7),
('guerre-securite','Guerre et Sécurité','theme',8),
('economie','Économie','theme',9),
('sante','Santé','theme',10),
('justice','Justice','theme',11),
('environnement','Environnement','theme',12),
('culture','Culture','theme',13),
('sport','Sport','theme',14),
('investigations','Investigations','format',15),
('reportages','Reportages','format',16),
('analyses','Analyses','format',17),
('opinions','Opinions','format',18),
('editoriaux','Éditoriaux','format',19),
('interviews','Interviews','format',20),
('videos','Vidéos','media',21),
('podcasts','Podcasts','media',22),
('photos','Photos','media',23),
('direct','Directs','media',24);

UPDATE public.categories c SET parent_id = (SELECT id FROM public.categories WHERE slug='rdc')
WHERE c.slug IN ('nord-kivu','sud-kivu','ituri');

-- ============ SEED : JOURNALISTES ============
INSERT INTO public.authors (slug, display_name, role_label, bio, city) VALUES
('jean-paul-mumbere','Jean-Paul Mumbere','Grand reporter — Nord-Kivu','Reporter de terrain basé à Goma, il couvre depuis dix ans les conflits armés et les déplacements de population dans l''Est de la RDC.','Goma'),
('esther-kavira','Esther Kavira','Cheffe de rubrique Santé','Journaliste spécialisée en santé publique, elle a documenté les épidémies d''Ebola en Ituri et au Nord-Kivu.','Bunia'),
('patrick-lwamba','Patrick Lwamba','Journaliste Justice et Gouvernance','Il suit les procès de la Haute Cour militaire et les dossiers de gouvernance à Kinshasa.','Kinshasa'),
('sandrine-bahati','Sandrine Bahati','Reporter Économie — Sud-Kivu','Elle enquête sur les chaînes d''approvisionnement minières et l''économie informelle à Bukavu.','Bukavu');

-- ============ SEED : ARTICLES ============
INSERT INTO public.articles (slug,title,dek,body,cover_url,cover_credit,category_id,author_id,status,published_at,location,reading_minutes,is_featured,is_breaking,seo_title,seo_description,view_count,share_count) VALUES
('exclusif-nous-avons-fui-les-balles-a-mashango',
 'Exclusif : « Nous avons fui les balles, les flammes et la mort à Mashango »',
 'Des centaines de familles ont quitté Mashango en une nuit. Récit de terrain, à la lisière du territoire de Rutshuru, où les habitants réclament paix et secours.',
 E'La route qui mène à Mashango est devenue un couloir de fuite. Depuis l''aube, des familles entières marchent vers le sud, sacs de riz sur la tête, enfants accrochés aux pagnes.\n\n« Nous avons fui les balles, les flammes et la mort », résume Kambale, cultivateur de 42 ans, rencontré à la sortie du village. Comme lui, plus de six cents personnes ont quitté la localité en une seule nuit.\n\nLes autorités locales confirment des affrontements entre groupes armés dans les collines environnantes. Aucun bilan officiel n''a été communiqué à ce stade.\n\nSur place, les organisations humanitaires évoquent une situation « préoccupante » : les points d''eau sont saturés et les abris manquent. Les déplacés réclament avant tout un retour de la sécurité.',
 '/images/une-deplaces.jpg','ReelActu',
 (SELECT id FROM public.categories WHERE slug='nord-kivu'),(SELECT id FROM public.authors WHERE slug='jean-paul-mumbere'),
 'publie', now() - interval '2 hours','Rutshuru, Nord-Kivu',6,true,true,
 'Exclusif : la fuite des habitants de Mashango — ReelActu',
 'Récit de terrain à Rutshuru : plus de six cents personnes ont fui Mashango en une nuit et réclament paix et secours.',4820,312),

('ebola-en-ituri-l-epicentre-depasse-320-cas-confirmes',
 'Ebola en RDC : l''Ituri demeure l''épicentre avec plus de 320 cas confirmés',
 'Le dernier rapport de situation place la province en tête des zones touchées. Les équipes de riposte alertent sur les résistances communautaires.',
 E'Plus de trois cent vingt cas confirmés : l''Ituri reste, selon le dernier rapport de situation, la province la plus touchée par l''épidémie.\n\nLes équipes de riposte pointent deux difficultés majeures : la dispersion des foyers et la méfiance persistante d''une partie de la population envers les protocoles funéraires sécurisés.\n\n« Tant que les familles ne participent pas à la décision, la riposte reste fragile », explique un épidémiologiste déployé à Bunia.\n\nDes équipes de sensibilisation communautaire ont été renforcées dans quatre zones de santé.',
 '/images/sante-clinique.jpg','ReelActu',
 (SELECT id FROM public.categories WHERE slug='sante'),(SELECT id FROM public.authors WHERE slug='esther-kavira'),
 'publie', now() - interval '6 hours','Bunia, Ituri',5,true,false,
 'Ebola en Ituri : plus de 320 cas confirmés — ReelActu',
 'L''Ituri demeure l''épicentre de l''épidémie d''Ebola en RDC avec plus de 320 cas confirmés selon le dernier rapport de situation.',3110,188),

('haute-cour-militaire-proces-officiers-superieurs-fardc',
 'RDC : la Haute Cour militaire ouvre un procès visant plusieurs officiers supérieurs des FARDC',
 'L''audience inaugurale s''est tenue à Kinshasa. Plusieurs chefs d''accusation sont retenus, dont la dissipation de munitions de guerre.',
 E'La Haute Cour militaire a ouvert, ce mercredi à Kinshasa, un procès visant plusieurs officiers supérieurs des forces armées.\n\nLes prévenus comparaissent notamment pour dissipation de munitions de guerre et manquements graves au devoir militaire.\n\nLa défense a demandé un renvoi pour disposer du dossier complet. La cour a fixé la prochaine audience à quinze jours.\n\nLe procès est suivi de près par les organisations de défense des droits humains, qui y voient un test de la lutte contre l''impunité au sein de l''armée.',
 '/images/justice-tribunal.jpg','ReelActu',
 (SELECT id FROM public.categories WHERE slug='justice'),(SELECT id FROM public.authors WHERE slug='patrick-lwamba'),
 'publie', now() - interval '10 hours','Kinshasa',4,true,false,
 'Procès d''officiers supérieurs des FARDC devant la Haute Cour militaire',
 'La Haute Cour militaire a ouvert à Kinshasa un procès visant plusieurs officiers supérieurs des FARDC.',2740,143),

('bukavu-le-marche-de-kadutu-sous-pression-des-prix',
 'Bukavu : le marché de Kadutu sous la pression des prix',
 'Hausse du carburant, routes coupées, monnaie instable : les commerçantes du plus grand marché du Sud-Kivu décrivent une érosion quotidienne du pouvoir d''achat.',
 E'À Kadutu, le prix du sac de farine a augmenté de près d''un tiers en trois mois.\n\nLes commerçantes citent trois causes : le renchérissement du carburant, l''état des routes de desserte agricole et l''instabilité du taux de change.\n\n« On vend autant, mais on gagne moins », résume Nsimire, revendeuse depuis quinze ans.\n\nLes autorités provinciales annoncent un plan de réhabilitation de deux axes routiers d''ici la fin de l''année.',
 '/images/economie-marche.jpg','ReelActu',
 (SELECT id FROM public.categories WHERE slug='economie'),(SELECT id FROM public.authors WHERE slug='sandrine-bahati'),
 'publie', now() - interval '1 day','Bukavu, Sud-Kivu',5,true,false,
 'Bukavu : la flambée des prix au marché de Kadutu — ReelActu',
 'Carburant, routes coupées et monnaie instable : enquête sur l''érosion du pouvoir d''achat au marché de Kadutu à Bukavu.',1980,97),

('journee-mondiale-liberte-presse-une-voix-de-bukavu',
 'Journée mondiale de la liberté de la presse : d''une voix de Bukavu à la communication humanitaire',
 'Portrait d''un journaliste devenu chargé de communication humanitaire, entre exigence d''information et contraintes du terrain.',
 E'Il a commencé à la radio communautaire, micro à la main, dans les quartiers hauts de Bukavu.\n\nAujourd''hui chargé de communication pour une organisation humanitaire, il raconte le passage d''un métier à l''autre — et ce qu''il en a gardé : la vérification, l''écoute, le refus du raccourci.\n\n« Informer et communiquer ne sont pas la même chose. Mais les deux exigent de ne pas mentir », dit-il.',
 null,null,
 (SELECT id FROM public.categories WHERE slug='reportages'),(SELECT id FROM public.authors WHERE slug='sandrine-bahati'),
 'publie', now() - interval '2 days','Bukavu, Sud-Kivu',7,false,false,
 'Liberté de la presse : d''une voix de Bukavu à l''humanitaire',
 'Portrait d''un journaliste de Bukavu devenu chargé de communication humanitaire, à l''occasion de la Journée mondiale de la liberté de la presse.',1420,64),

('rdc-burundi-notre-sourire-est-un-appel-au-monde',
 '#RDC-#Burundi : « Notre sourire est un appel au monde, rendez-nous la paix »',
 'Dans un camp de réfugiés congolais au Burundi, les habitants racontent l''attente, l''exil et l''espoir d''un retour.',
 E'Ils sourient sur les photographies. Ce sourire, disent-ils, est un message.\n\n« Notre sourire est un appel au monde, rendez-nous la paix » : la phrase revient d''une tente à l''autre dans ce camp accueillant des réfugiés congolais au Burundi.\n\nLa plupart sont arrivés il y a plusieurs mois. Les rations ont été réduites deux fois depuis. Les enfants scolarisés le sont dans des abris de fortune.',
 null,null,
 (SELECT id FROM public.categories WHERE slug='afrique'),(SELECT id FROM public.authors WHERE slug='jean-paul-mumbere'),
 'publie', now() - interval '3 days','Burundi',6,false,false,
 'RDC-Burundi : la parole des réfugiés congolais — ReelActu',
 'Reportage dans un camp de réfugiés congolais au Burundi : l''attente, l''exil et l''espoir d''un retour.',2310,205),

('pratiques-funeraires-ituri-comprendre-les-resistances',
 'Ebola en Ituri : comprendre les pratiques funéraires pour éviter les résistances communautaires',
 'Anthropologues et équipes médicales plaident pour des enterrements dignes et sécurisés, négociés avec les familles.',
 E'Le corps d''un défunt n''est pas seulement un risque sanitaire : il est un lien social.\n\nC''est le point de départ du travail mené par des anthropologues auprès des équipes de riposte en Ituri, où les enterrements sécurisés ont longtemps été perçus comme une confiscation du deuil.\n\nLe protocole révisé prévoit désormais la présence de deux membres de la famille et un temps de prière.',
 null,null,
 (SELECT id FROM public.categories WHERE slug='analyses'),(SELECT id FROM public.authors WHERE slug='esther-kavira'),
 'publie', now() - interval '4 days','Ituri',8,false,false,
 'Ebola : comprendre les pratiques funéraires en Ituri — ReelActu',
 'Pourquoi les enterrements sécurisés suscitent des résistances en Ituri, et comment les équipes de riposte adaptent leurs protocoles.',1650,88),

('gouverneurs-sommes-d-agir-couverture-sante-universelle',
 'Santé en RDC : les gouverneurs sommés d''agir pour la couverture santé universelle',
 'Réunis en conférence, les gouverneurs de province se sont engagés à inscrire la santé maternelle dans leurs budgets.',
 E'La couverture santé universelle ne se décrète pas depuis Kinshasa : elle se finance dans les provinces.\n\nRéunis en conférence, les gouverneurs se sont engagés à inscrire des lignes dédiées à la santé maternelle et néonatale dans leurs budgets provinciaux.\n\nReste la question du décaissement effectif, principal point de blocage des exercices précédents.',
 null,null,
 (SELECT id FROM public.categories WHERE slug='politique'),(SELECT id FROM public.authors WHERE slug='patrick-lwamba'),
 'publie', now() - interval '5 days','Kinshasa',4,false,false,
 'Couverture santé universelle : les gouverneurs s''engagent — ReelActu',
 'Les gouverneurs de province s''engagent à financer la santé maternelle dans leurs budgets pour la couverture santé universelle.',1290,51),

('goma-les-taxis-motos-face-a-la-hausse-du-carburant',
 'Goma : les taxis-motos face à la hausse du carburant',
 'Le litre a franchi un nouveau seuil. Les conducteurs répercutent, les clients marchent.',
 E'À Goma, la course de base a augmenté de moitié en six semaines.\n\nLes conducteurs de taxis-motos disent ne pas avoir le choix : le litre de carburant a franchi un nouveau seuil sur le marché parallèle.\n\nDu côté des clients, l''ajustement est immédiat : on marche davantage, on regroupe les trajets.',
 null,null,
 (SELECT id FROM public.categories WHERE slug='economie'),(SELECT id FROM public.authors WHERE slug='jean-paul-mumbere'),
 'publie', now() - interval '6 days','Goma, Nord-Kivu',3,false,false,
 'Goma : les taxis-motos face à la hausse du carburant — ReelActu',
 'La hausse du prix du carburant à Goma bouleverse le quotidien des conducteurs de taxis-motos et de leurs clients.',980,33),

('editorial-informer-quand-tout-presse',
 'Éditorial : informer quand tout presse',
 'À l''heure des rumeurs instantanées, la lenteur de la vérification est devenue un acte de service public.',
 E'Une information fausse voyage plus vite qu''un démenti. Ce n''est pas une nouveauté ; c''est désormais une industrie.\n\nDans l''Est de la RDC, la rumeur tue : elle déplace des familles, désigne des coupables, alimente des représailles.\n\nNotre règle reste la même : deux sources, un nom, un lieu, une heure. Publier plus tard, mais publier juste.',
 null,null,
 (SELECT id FROM public.categories WHERE slug='editoriaux'),(SELECT id FROM public.authors WHERE slug='patrick-lwamba'),
 'publie', now() - interval '7 days','Kinshasa',3,false,false,
 'Éditorial : informer quand tout presse — ReelActu',
 'À l''heure des rumeurs instantanées, la vérification est devenue un acte de service public.',870,120),

('environnement-le-parc-des-virunga-sous-pression',
 'Le parc des Virunga sous pression : charbon de bois et insécurité',
 'Entre besoins énergétiques des ménages et présence de groupes armés, la pression sur le couvert forestier s''accentue.',
 E'Le charbon de bois reste la première source d''énergie domestique autour de Goma.\n\nCette dépendance, combinée à la présence de groupes armés dans certaines zones, accentue la pression sur le couvert forestier du parc.\n\nDes coopératives expérimentent des foyers améliorés, avec des résultats encore limités faute de financement.',
 null,null,
 (SELECT id FROM public.categories WHERE slug='environnement'),(SELECT id FROM public.authors WHERE slug='jean-paul-mumbere'),
 'publie', now() - interval '8 days','Virunga, Nord-Kivu',6,false,false,
 'Le parc des Virunga sous pression — ReelActu',
 'Charbon de bois et insécurité : enquête sur la pression croissante exercée sur le couvert forestier du parc des Virunga.',1120,72),

('interview-la-securite-ne-se-decrete-pas',
 'Interview : « La sécurité ne se décrète pas, elle se construit avec les communautés »',
 'Entretien avec une responsable de la société civile du Sud-Kivu sur les comités locaux de protection.',
 E'« La sécurité ne se décrète pas, elle se construit avec les communautés. »\n\nDans cet entretien, une responsable de la société civile du Sud-Kivu détaille le fonctionnement des comités locaux de protection, leurs résultats et leurs limites.\n\nElle plaide pour une reconnaissance officielle de ces structures et un appui logistique minimal.',
 null,null,
 (SELECT id FROM public.categories WHERE slug='interviews'),(SELECT id FROM public.authors WHERE slug='sandrine-bahati'),
 'publie', now() - interval '9 days','Bukavu, Sud-Kivu',7,false,false,
 'Interview : construire la sécurité avec les communautés — ReelActu',
 'Entretien sur les comités locaux de protection au Sud-Kivu et la construction de la sécurité avec les communautés.',760,41);

INSERT INTO public.tags (slug,name) VALUES
('rdc','RDC'),('nord-kivu','Nord-Kivu'),('sud-kivu','Sud-Kivu'),('ituri','Ituri'),
('ebola','Ebola'),('fardc','FARDC'),('deplaces','Déplacés'),('economie','Économie'),
('justice','Justice'),('virunga','Virunga'),('sante-publique','Santé publique'),('paix','Paix');

INSERT INTO public.article_tags (article_id, tag_id)
SELECT a.id, t.id FROM public.articles a, public.tags t
WHERE (a.slug='exclusif-nous-avons-fui-les-balles-a-mashango' AND t.slug IN ('rdc','nord-kivu','deplaces','paix'))
   OR (a.slug='ebola-en-ituri-l-epicentre-depasse-320-cas-confirmes' AND t.slug IN ('ebola','ituri','sante-publique'))
   OR (a.slug='haute-cour-militaire-proces-officiers-superieurs-fardc' AND t.slug IN ('justice','fardc','rdc'))
   OR (a.slug='bukavu-le-marche-de-kadutu-sous-pression-des-prix' AND t.slug IN ('economie','sud-kivu'))
   OR (a.slug='environnement-le-parc-des-virunga-sous-pression' AND t.slug IN ('virunga','nord-kivu'));