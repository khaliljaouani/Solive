# Solive

Application locale de gestion de chantier : devis, situations, planning et suivi de marge.

Le dépôt GitHub ne contient pas les dépendances ni la base de données. Les deux se créent sur ton ordinateur après le téléchargement.

## À installer

Un seul logiciel : **Node.js 24** ou plus récent. npm est inclus avec Node.js.

Vérifie l'installation dans un terminal :

```powershell
node -v
npm -v
```

`node -v` doit afficher `v24` ou une version plus récente. Sinon, installe Node.js 24 LTS depuis [https://nodejs.org](https://nodejs.org).

Rien d'autre à installer. SQLite est déjà fourni par Node.js.

## Lancer le projet

1. Télécharge le projet depuis GitHub (bouton **Code**, puis **Download ZIP**) et décompresse le fichier. Tu peux aussi cloner le dépôt :

```powershell
git clone https://github.com/khaliljaouani/Solive.git
cd Solive
```

2. Installe les dépendances. Cette commande crée le dossier `node_modules` :

```powershell
npm install
```

3. Démarre l'application :

```powershell
npm run dev
```

4. Ouvre [http://localhost:5173](http://localhost:5173).

Au premier lancement, crée ton entreprise. Les chantiers, devis, situations et plannings sont enregistrés ensuite dans `data/solive.sqlite`, sur cet ordinateur uniquement.

## Arrêter

Dans le terminal où `npm run dev` tourne, appuie sur `Ctrl+C`.
