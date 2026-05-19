# Ordre de passage live (GitHub Pages + Supabase)

Site web full stack avec:
- frontend statique pour GitHub Pages
- backend Supabase (Postgres + Realtime)
- mise a jour des statuts en direct (sans recharger)
- acces admin via boite de dialogue native du navigateur

## 1) Creer le backend Supabase (gratuit)

1. Cree un projet sur Supabase (plan Free).
2. Va dans SQL Editor.
3. Copie-colle le contenu de `supabase.sql` puis execute.
4. Recupere:
   - Project URL
   - anon public key

## 2) Configurer le frontend

1. Ouvre `config.js`.
2. Remplace:
   - `supabaseUrl`
   - `supabaseAnonKey`

## 3) Tester en local

Tu peux ouvrir directement `index.html` dans ton navigateur.
Si ton navigateur bloque certaines requetes en `file://`, lance un serveur local simple:

```powershell
cd "Ordre de passage/ordre-passage-live"
python -m http.server 8080
```

Puis ouvre `http://localhost:8080`.

## 4) Deployer sur GitHub Pages

1. Cree un repo GitHub avec ce dossier.
2. Push les fichiers.
3. Dans GitHub: Settings > Pages.
4. Source: Deploy from a branch.
5. Branche: `main` et dossier racine (`/`) ou `/docs` selon ton repo.
6. Le site sera accessible publiquement.

## Fonctionnement admin

- Bouton **Acces admin**.
- Le navigateur ouvre une boite de dialogue (`prompt`).
- Mot de passe: `ensi`.
- En mode admin, des boutons apparaissent pour changer les statuts.
- Les changements sont pousses en direct a tous les utilisateurs connectes.

## Charge attendue

Pour ~50 personnes qui consultent plusieurs fois, Supabase Free est en general suffisant pour ce cas (lectures legeres + petites updates). Si le trafic augmente fort, il faudra surveiller les quotas du plan free.
