export function Newsletter() {
  return (
    <section className="mt-14 border-y border-rule bg-secondary px-6 py-10">
      <div className="mx-auto max-w-xl text-center">
        <p className="kicker">La lettre de ReelActu</p>
        <h2 className="mt-2 text-2xl">L'essentiel de la RDC, chaque matin</h2>
        <p className="mt-2 font-sans text-sm text-muted-foreground">
          Une sélection sobre : ce qu'il faut savoir, vérifié par notre rédaction.
        </p>
        <form
          className="mt-5 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => e.preventDefault()}
          aria-label="Inscription à la newsletter"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Adresse e-mail
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            placeholder="votre@email.com"
            className="flex-1 border border-input bg-background px-3 py-2.5 font-sans text-sm outline-none focus:border-signal"
          />
          <button
            type="submit"
            className="bg-signal px-5 py-2.5 font-sans text-sm font-semibold text-signal-foreground transition-opacity hover:opacity-90"
          >
            S'inscrire
          </button>
        </form>
      </div>
    </section>
  );
}
