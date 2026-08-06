# Export ReelActu — 06/08/2026

## Contenu

- `reelactu-mysql.sql` — dump complet prêt pour MySQL (phpMyAdmin / cPanel)
- `csv/` — une table par fichier CSV (UTF-8, en-têtes inclus)
- `inventaire-medias.csv` — liste de toutes les images référencées (54 URL)

## Nombre d'enregistrements

- categories : 30
- authors : 9
- tags : 12
- articles : 54
- article_categories : 165
- article_tags : 9
- app_settings : 1
- social_publications : 9
- share_events : 1
- direct_events : 348
- user_roles : 1

## Import sur cPanel

1. cPanel → **Bases de données MySQL** → créer une base et un utilisateur, puis
   associer l'utilisateur à la base avec **TOUS LES PRIVILÈGES**.
2. cPanel → **phpMyAdmin** → sélectionner la base → onglet **Importer**.
3. Choisir `reelactu-mysql.sql`, jeu de caractères **utf8mb4**, puis **Exécuter**.
4. Si le fichier dépasse la limite d'upload, utiliser SSH :
   `mysql -u UTILISATEUR -p NOM_BASE < reelactu-mysql.sql`

## Remarques

- Les e-mails des journalistes ont été retirés (données personnelles).
- Les comptes de connexion et mots de passe ne sont pas exportables : ils devront
  être recréés sur le nouveau système.
- Les images ne sont pas dans le dump : télécharge-les depuis les URL de
  `inventaire-medias.csv` puis mets à jour la colonne `cover_url`.
- Les dates sont en UTC.
