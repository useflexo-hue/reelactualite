import { createFileRoute } from "@tanstack/react-router";
import { absUrl } from "@/lib/site";

export const Route = createFileRoute("/a-propos")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "À propos de ReelActu — L'information réelle en RDC" },
      {
        name: "description",
        content:
          "ReelActu est un média numérique indépendant basé en RDC : mission, vision, ligne éditoriale, domaines de couverture, équipe, valeurs et contact.",
      },
      { property: "og:title", content: "À propos de ReelActu — L'information réelle" },
      {
        property: "og:description",
        content:
          "Média numérique indépendant en République démocratique du Congo : journalisme vérifié, indépendant et accessible.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: absUrl("/a-propos") },
    ],
    links: [{ rel: "canonical", href: absUrl("/a-propos") }],
  }),
});

const COVERAGE = [
  "Politique",
  "Sécurité et justice",
  "Diplomatie",
  "Économie et finances",
  "Santé publique",
  "Société",
  "Environnement",
  "Infrastructures",
  "Culture",
  "Sport",
  "Technologies",
  "Afrique et monde",
];

const FORMATS = [
  "Des dépêches en temps réel",
  "Des reportages de terrain",
  "Des interviews exclusives",
  "Des analyses et décryptages",
  "Des vidéos et contenus multimédias",
  "Des émissions en direct et podcasts",
];

const VALUES = [
  "Indépendance éditoriale",
  "Intégrité",
  "Exactitude",
  "Transparence",
  "Responsabilité",
  "Respect des droits humains",
  "Service de l'intérêt public",
];

const MISSION = [
  "Informer avec exactitude, impartialité et rapidité",
  "Vérifier les faits avant publication",
  "Lutter contre la désinformation et les manipulations de l'information",
  "Donner la parole aux citoyens, aux institutions et aux acteurs du développement",
  "Favoriser un débat public fondé sur les faits",
];

const EDITORIAL = [
  "Indépendante de toute influence politique, économique ou idéologique",
  "Fondée sur des sources crédibles et recoupées",
  "Équilibrée et respectueuse des principes déontologiques du journalisme",
  "Accessible au plus grand nombre grâce à un langage clair et pédagogique",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rule-top pt-8">
      <h2 className="font-serif text-2xl font-bold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 font-sans text-[15px] leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function AboutPage() {
  return (
    <div className="mx-auto max-w-[820px] px-4 py-10">
      <header className="mb-8">
        <p className="kicker-muted">À propos</p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          À propos de ReelActu
        </h1>
        <p className="mt-4 font-sans text-lg leading-relaxed text-muted-foreground">
          ReelActu est un média numérique indépendant basé en République démocratique du Congo,
          spécialisé dans la couverture de l'actualité nationale, régionale et internationale.
        </p>
      </header>

      <div className="space-y-8">
        <Section title="Qui sommes-nous ?">
          <p>
            Notre rédaction s'engage à fournir une information fiable, rapide et vérifiée, avec une
            attention particulière portée aux enjeux politiques, sécuritaires, économiques,
            diplomatiques, judiciaires, humanitaires, sanitaires et environnementaux.
          </p>
          <p>
            Grâce à un réseau de journalistes, correspondants et partenaires présents sur le
            terrain, ReelActu met en lumière les réalités vécues par les populations, notamment dans
            les provinces de l'Est de la RDC, tout en offrant une lecture équilibrée des grands
            événements qui façonnent le pays et le monde.
          </p>
        </Section>

        <Section title="Notre mission">
          <p>
            Notre mission est de produire un journalisme indépendant, responsable et accessible à
            tous. Nous nous engageons à :
          </p>
          <Bullets items={MISSION} />
        </Section>

        <Section title="Notre vision">
          <p>
            Nous aspirons à faire de ReelActu l'une des principales références de l'information
            numérique en Afrique centrale, reconnue pour son professionnalisme, son indépendance
            éditoriale et sa proximité avec les réalités du terrain.
          </p>
          <p>
            Notre ambition est de bâtir un média capable de rivaliser avec les standards
            internationaux tout en restant profondément ancré dans les réalités congolaises.
          </p>
        </Section>

        <Section title="Notre ligne éditoriale">
          <p>ReelActu privilégie une information :</p>
          <Bullets items={EDITORIAL} />
          <p>
            Lorsque certaines informations ne peuvent être confirmées de manière indépendante, elles
            sont présentées avec les réserves nécessaires.
          </p>
        </Section>

        <Section title="Nos domaines de couverture">
          <p>Notre rédaction couvre notamment :</p>
          <ul className="flex flex-wrap gap-2 pt-1">
            {COVERAGE.map((c) => (
              <li
                key={c}
                className="rounded-full border border-rule px-3 py-1 font-sans text-sm font-semibold"
              >
                {c}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Nos formats">
          <Bullets items={FORMATS} />
        </Section>

        <Section title="Notre équipe">
          <p>
            ReelActu rassemble des journalistes, rédacteurs, vidéastes, photographes, développeurs
            et spécialistes du numérique qui travaillent chaque jour pour offrir une information de
            qualité.
          </p>
          <p className="font-semibold">
            La rédaction est dirigée par Daniel Michombero, Directeur général.
          </p>
        </Section>

        <Section title="Nos valeurs">
          <Bullets items={VALUES} />
        </Section>

        <Section title="Contact">
          <p>
            Vous souhaitez nous transmettre une information, proposer un partenariat, exercer un
            droit de réponse ou contacter notre rédaction ?
          </p>
          <div className="rounded-lg border border-rule bg-secondary p-4">
            <p>
              <span className="kicker-muted">Email</span>
              <br />
              <a href="mailto:info@reelactu.com" className="font-semibold hover:text-signal">
                info@reelactu.com
              </a>
            </p>
            <p className="mt-3">
              <span className="kicker-muted">Téléphone</span>
              <br />
              <a href="tel:+243994380568" className="font-semibold hover:text-signal">
                +243 994 380 568
              </a>
            </p>
          </div>
          <p>Notre équipe s'engage à répondre dans les meilleurs délais.</p>
        </Section>
      </div>

      <p className="mt-10 border-t border-rule pt-6 text-center font-serif text-xl font-bold">
        ReelActu — L'information réelle.
      </p>
    </div>
  );
}
