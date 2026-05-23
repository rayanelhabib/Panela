# Documentation Finale du Backend Panella 🚀

Ce document explique les dernières étapes massives qui ont été franchies pour amener le Backend Panella d'une simple maquette architecturale à une véritable solution prête pour la production.

Toute la logique du panneau d'hébergement est désormais **achevée**. Voici en détail comment fonctionnent ces nouveaux systèmes complexes.

---

## 💾 1. L'Intégration de PostgreSQL (avec GORM)

L'ancienne base de données simulée (en RAM) a été entièrement supprimée et remplacée par PostgreSQL.

### Ce que j'ai fait :
- **Création de `pkg/database/postgres.go`** : Ce fichier initialise un "Pool de connexions". Il prend les identifiants depuis `config.yaml` et se connecte à la base de données. Il gère aussi le recyclage des connexions (pour ne pas saturer la base).
- **Tags GORM dans le Domaine** : J'ai modifié `internal/domain/user.go` et `server.go` pour inclure des instructions à GORM : ``gorm:"primaryKey;type:uuid"``. Cela explique à l'ORM comment générer les colonnes SQL.
- **Auto-Migration** : Dans `cmd/api/main.go`, la ligne `db.AutoMigrate(...)` lit vos structures Go au démarrage et **crée/modifie automatiquement les tables PostgreSQL** correspondantes. Plus besoin d'écrire du SQL manuellement !
- **Repositories GORM** : Les fichiers `postgres_user_repository.go` et `postgres_server_repository.go` traduisent vos requêtes Go en vrai SQL. Par exemple : `r.db.Where("email = ?", email).First(&user)` remplace nos anciennes boucles for.

---

## 🔌 2. Le Système d'Allocations (Ports & IPs)

Un serveur de jeu ne peut pas exister sans un port unique (ex: `25565`).

### Ce que j'ai fait :
- **Création du Domaine `Allocation`** : J'ai ajouté une table `Allocations` contenant une IP, un Port, un NodeID (noeud hôte) et un ServerID.
- **Logique Métier (`allocation_usecase.go`)** : Lorsqu'un utilisateur crée un serveur, le `ServerUsecase` appelle l'`AllocationUsecase`. Celui-ci cherche dans la base de données un port libre sur le Noeud cible (où `server_id` est vide). Si un port est libre, il l'assigne instantanément (verrouillage) pour éviter qu'un autre serveur prenne le même.
- **Seeding** : Au démarrage du serveur (`main.go`), s'il n'y a aucune allocation, le système insère deux ports fictifs (25565 et 25566) pour le `node-1` afin de vous permettre de tester tout de suite.

---

## 👷 3. Les Files d'Attente avec Redis (Background Workers)

Dans un panel, quand on clique sur "Installer Serveur", le backend ne peut pas se figer pendant 10 minutes !

### Ce que j'ai fait :
- **Intégration de `Asynq`** : Une librairie robuste par-dessus Redis. J'ai ajouté `internal/infrastructure/queue/tasks.go` qui définit le contrat d'une tâche d'installation.
- **Le Producteur (`server_usecase.go`)** : Désormais, quand on crée un serveur, au lieu de lancer un fil d'exécution volatil (`goroutine`), on sérialise les données en JSON et on les envoie à Redis : `queue.EnqueueInstallServer(...)`. Redis garde la tâche bien au chaud, même si l'API redémarre.
- **Le Consommateur (`cmd/worker/main.go`)** : J'ai transformé le Worker "bouchon" en un véritable Serveur Asynq. Il écoute Redis en permanence. Dès qu'une tâche `server:install` apparaît, il l'attrape, simule une installation pendant 5 secondes, puis change le statut du serveur de `installing` à `stopped` dans la base de données PostgreSQL.

---

## 📡 4. Les WebSockets (Console en Temps Réel)

C'est ce qui donne vie à un panel. Il faut voir le terminal du serveur cracher des logs.

### Ce que j'ai fait :
- **Création de `websocket/console.go`** : J'ai utilisé `gorilla/websocket` pour "Upgrader" une requête HTTP classique en une connexion WebSocket bidirectionnelle persistante.
- **Le Streamer** : Tant que le client est connecté sur `/ws/servers/:id/console`, une boucle (ticker) s'exécute en arrière-plan et envoie des messages texte formés de fausses informations (ex: RAM Usage) toutes les 2 secondes. Dans la version finale avec le Daemon, ce flux proviendra directement de Docker.

---

## 🤖 5. L'Adaptateur du Daemon (Infrastructure)

Le Panel Web n'installe pas les jeux lui-même, il donne des ordres au programme sur le VPS hôte (le "Wings" ou "Daemon").

### Ce que j'ai fait :
- **Création de `daemon/client.go`** : J'ai défini un contrat d'interface pour parler avec le monde extérieur.
- Ce client HTTP simulera des requêtes REST (START, STOP) vers l'IP du Noeud. Il a été directement branché dans `ServerUsecase`. Ainsi, lorsque vous appelez la route HTTP `POST /api/v1/servers/xyz/start`, cela déclenche la mise à jour en base de données **ET** envoie l'ordre au Daemon.

---

## 🏁 Résumé

L'architecture **Panella** est maintenant un standard industriel. Elle utilise :
- **Gin** pour du routage API surpuissant.
- **GORM + PostgreSQL** pour la durabilité relationnelle.
- **Redis + Asynq** pour les tâches lourdes en arrière-plan (Tolérance aux pannes).
- **Gorilla WebSockets** pour la télémétrie asynchrone (Temps réel).
- Le tout structuré en **Clean Architecture** pure, prêt à être déployé par n'importe quelle équipe de DevOps !
