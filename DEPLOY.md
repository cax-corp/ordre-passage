# Guide de déploiement complet - Ordre de passage live

Ce projet n'a pas besoin d'un serveur applicatif classique. Le front est statique et le seul backend est Supabase, qui gère les données et le temps reel.

## Étape 1 : Créer le backend Supabase (5 min)

1. **Créer un compte gratuit** sur [supabase.com](https://supabase.com)
2. **Créer un projet** (région : Europe pour latence faible)
3. Attendre que le projet soit prêt (~2-3 min)
4. Dans le menu gauche, aller à **SQL Editor**
5. Créer une nouvelle requête, puis:
   - Ouvrir le fichier `supabase.sql` de ce dossier
   - Copier-coller **tout** le contenu dans l'éditeur SQL
   - Cliquer **Run** (Ctrl+Enter)
   - Vérifier qu'il n'y a pas d'erreur

### Récupérer tes identifiants Supabase

1. En haut à droite → **Project Settings** (engrenage)
2. Aller à l'onglet **API**
3. Copier:
   - `Project URL` (ressemble à `https://xxxxx.supabase.co`)
   - `anon public` key (sous "Project API keys")

---

## Étape 2 : Configurer l'appli locale

1. Ouvrir le fichier `config.js`
2. Remplacer les valeurs de `supabaseUrl` et `supabaseAnonKey`:

```javascript
window.APP_CONFIG = {
  supabaseUrl: "https://ton-projet.supabase.co",
  supabaseAnonKey: "ta-cle-anon-ici"
};
```

3. Sauvegarder

### Tester en local (optionnel)

Pour vérifier que ça marche avant de déployer, le plus simple est d'utiliser l'extension VS Code **Live Server**:

1. Installer l'extension Live Server si elle n'est pas deja presente.
2. Ouvrir le dossier du projet dans VS Code.
3. Clic droit sur `index.html` -> **Open with Live Server**.
4. Le site s'ouvre dans le navigateur avec une vraie URL locale.

Si tu veux juste un test rapide, tu peux aussi ouvrir `index.html` directement dans ton navigateur, mais selon le navigateur certaines fonctions peuvent etre plus limitees.

- Tu devrais voir le tableau avec les statuts
- Mode admin -> mot de passe: `ensi`
- Les changements de statut fonctionnent localement

---

## Étape 3 : Déployer en ligne

Tu as plusieurs options. Dans tous les cas, tu importes simplement les fichiers du site: `index.html`, `styles.css`, `app.js`, `config.js`.

### **Option A : GitHub Pages (recommandée, gratuit, simple)**

1. **Créer un repo GitHub** (si pas déjà fait)
   - Clic sur "Create repository"
   - Donner un nom (ex: `ordre-passage-live`)
   - Public
   - Créer

2. **Uploader les fichiers**
   - Clic sur "Add file" → "Upload files"
   - Sélectionner tous les fichiers du dossier `ordre-passage-live`:
     - `index.html`
     - `styles.css`
     - `app.js`
     - `config.js`
   - Commit

   Tu peux aussi faire un import manuel depuis l'explorateur de fichiers si tu preferes, mais GitHub Pages attend ensuite que ces fichiers soient dans le repo.

3. **Activer GitHub Pages**
   - Aller à **Settings** du repo
   - **Pages** (menu gauche)
   - Source: "Deploy from a branch"
   - Branch: `main` et dossier `/`
   - Sauvegarder

4. **Récupérer l'URL**
   - Attendre 1-2 min
   - L'URL s'affiche en haut: `https://ton-pseudo.github.io/ordre-passage-live`

---

### **Option B : Netlify (gratuit, très simple)**

1. Aller sur [netlify.com](https://netlify.com)
2. "Add new site" → "Deploy manually"
3. Drag & drop le dossier `ordre-passage-live`
4. C'est déployé en 30 sec

---

### **Option C : Vercel (gratuit)**

1. [vercel.com](https://vercel.com)
2. "New Project" → "Import"
3. Connecter ton repo GitHub
4. Déployé automatiquement à chaque push

---

## Étape 4 : Intégrer sur Google Sites

Tu dis avoir un domaine et vouloir intégrer sur Google Sites. Voici comment:

Important: Google Sites ne heberge pas directement ce type d'application JS avec backend temps reel. Il faut d'abord publier le site sur GitHub Pages, Netlify ou Vercel, puis l'intégrer dans Google Sites.

### **Méthode 1 : Intégration via iframe (recommandée)**

1. Ouvrir ton site Google Sites
2. Cliquer sur "Insérer" (ou "+") → **Intégrer du code**
3. Copier-coller ceci:
```html
<iframe 
  src="https://ton-url-deployee.com" 
  style="width:100%;height:800px;border:none;margin:0;padding:0;"
  allow="prompt"
  allowfullscreen>
</iframe>
```

Remplacer `https://ton-url-deployee.com` par l'URL réelle (GitHub Pages, Netlify, etc.)

Si tu veux l'afficher en pleine page, mets l'iframe dans une section qui prend toute la largeur du site Google Sites.

### **Méthode 2 : Page entière (full page)**

1. Créer une nouvelle **page vide** dans Google Sites
2. Cliquer sur les 3 points → **Code de page**
3. Ajouter le même iframe en pleine largeur

---

## **ASTUCE: Mettre à jour les statuts**

Les admins peuvent modifier le tableau:
1. Cliquer sur **"Acces admin"** en haut à droite
2. Entrer le mot de passe: `ensi`
3. Des boutons apparaissent pour changer les statuts
4. Les changements sont visibles **en temps réel** chez tous les autres

Pour changer le mot de passe admin:
- Aller dans **Supabase** → **SQL Editor**
- Exécuter:
```sql
update admin_settings set admin_password = 'ton-nouveau-mot-de-passe' where id = 1;
```

---

## **Quotas Supabase (gratuit)**

Pour ~50 personnes consultant plusieurs fois:
- ✅ **500 MB** de données (on n'en utilise ~100 KB)
- ✅ **2 millions** de requêtes/mois (on en fait ~quelques milliers)
- ✅ **Realtime illimité**

**→ Tu es largement en dessous des limites.**

Si tu dépasses: il suffit d'upgrader à $25/mois, ou créer un nouveau projet gratuit.

---

## **Questions fréquentes**

### Q: Je dois modifier la liste des groupes?
R: Modifie dans `supabase.sql`, réexécute. Ou directement dans Supabase → "schedule_entries".

### Q: Ça me dit "Non configuré" quand j'ouvre?
R: Tu as oublié de remplir `config.js`. Vérife que `supabaseUrl` ne contient pas "YOUR-PROJECT".

### Q: Les statuts changent pas?
R: Vérife que tu es en mode admin (mot de passe `ensi`). Vérife que Supabase répond (badge de connexion en haut).

### Q: Comment avancer auto le prochain groupe?
R: C'est possible avec du code backend personnalisé. Demande si tu veux cette feature!

---

**Besoin d'aide?** Fais un test et dis-moi où tu bloques!
