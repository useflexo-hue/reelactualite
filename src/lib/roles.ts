/**
 * Vérifications de rôles côté serveur, effectuées directement sur la table
 * `user_roles` (RLS : chacun ne lit que ses propres rôles). On n'appelle plus
 * les fonctions SECURITY DEFINER, dont l'exécution est révoquée pour les rôles
 * `anon` et `authenticated` : elles restent réservées aux politiques RLS.
 */
export const PUBLISHER_ROLES = ["admin", "directeur_publication", "redacteur_chef"] as const;

type RoleQueryClient = {
  from: (table: "user_roles") => {
    select: (columns: string) => {
      eq: (column: string, value: string) => Promise<{ data: { role: string }[] | null }>;
    };
  };
};

async function rolesOf(supabase: unknown, userId: string): Promise<string[]> {
  const client = supabase as RoleQueryClient;
  const { data } = await client.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role);
}

/** Direction éditoriale : peut publier et diffuser. */
export async function canPublish(supabase: unknown, userId: string): Promise<boolean> {
  const roles = await rolesOf(supabase, userId);
  return roles.some((r) => (PUBLISHER_ROLES as readonly string[]).includes(r));
}

/** Membre de la rédaction : possède au moins un rôle. */
export async function isNewsroom(supabase: unknown, userId: string): Promise<boolean> {
  const roles = await rolesOf(supabase, userId);
  return roles.length > 0;
}
