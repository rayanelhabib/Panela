# Guide Complet de Développement : Backend Panella 🚀

Ce document explique en détail, depuis l'étape 0, comment le projet a été structuré, la logique derrière chaque choix architectural, et la syntaxe des fichiers générés.

---

## 🏗️ 1. L'Approche Architecturale : La "Clean Architecture"

Avant d'écrire la moindre ligne de code, nous avons défini l'architecture. Pour un panneau d'hébergement complexe (qui gérera des serveurs, des utilisateurs, des noeuds Docker/Proxmox, la facturation, etc.), l'architecture MVC classique devient vite un enfer à maintenir. Nous avons donc choisi la **Clean Architecture** (ou architecture Hexagonale).

**La règle d'or :** Les dépendances pointent toujours vers l'intérieur.
1. **Domain (Coeur) :** Ne connaît rien du reste. Contient les modèles (`User`, `Server`) et les contrats (Interfaces).
2. **Usecase (Logique métier) :** Ne connaît que le Domain. C'est ici que se trouvent les règles ("Créer un serveur", "Vérifier le mot de passe").
3. **Repository (Base de données) & Delivery (API HTTP) :** Ce sont les couches externes. Elles implémentent les interfaces définies dans le Domain.

---

## 🛠️ Étape 1 : Le Socle du Projet

### `go.mod`
C'est le fichier qui gère les dépendances du projet (équivalent du `package.json` en Node.js).
```go
module github.com/panella/backend
go 1.21
require (...)
```
Nous avons inclus des librairies robustes : **Gin** (pour les routes HTTP ultra-rapides), **Zap** (pour les logs professionnels), **Viper** (pour lire les configurations) et **Golang-JWT** (pour l'authentification).

### `configs/config.yaml` et `internal/config/config.go`
Nous ne codons jamais les mots de passe ou les ports en dur (Hardcode). 
- `config.yaml` stocke les valeurs.
- `config.go` utilise **Viper** pour lire ce fichier YAML et le transformer en structures Go (Structs) utilisables partout dans l'application. La syntaxe `` `mapstructure:"app"` `` indique à Viper comment mapper la clé YAML vers la variable Go.

---

## 🧰 Étape 2 : Les Outils Transversaux (`pkg/`)

Le dossier `pkg/` contient du code qui pourrait être extrait et utilisé dans n'importe quel autre projet Go.

### `pkg/logger/logger.go`
Un serveur backend a besoin de logs clairs. Nous utilisons `go.uber.org/zap`.
**Logique :** Au lieu d'appeler `zap.Info` partout, nous créons un *Wrapper* (une enveloppe). Cela nous permet de changer la façon dont on logge (ex: envoyer les logs vers Datadog plus tard) sans modifier tout notre code.

### `pkg/response/response.go`
**Logique :** Toutes les API doivent répondre de la même manière pour faciliter le travail du Front-end.
**Syntaxe :** Nous avons créé une fonction `JSON` qui formate toutes les requêtes avec la structure `{ success: true, message: "...", data: {}, error: null }`. Les fonctions `OK`, `Created`, ou `BadRequest` ne font qu'appeler cette fonction principale avec le bon code HTTP (ex: 200, 201, 400).

---

## 🧠 Étape 3 : Le Cœur du Métier (`internal/domain/`)

Le domaine est la base absolue. Si vous comprenez le domaine, vous comprenez l'application.

### `internal/domain/user.go` et `internal/domain/server.go`
**Syntaxe :**
```go
type Server struct { ... }
type ServerRepository interface { ... }
type ServerUsecase interface { ... }
```
- **Les Structs (`Server`, `User`) :** Représentent les données. Les tags `` `json:"id"` `` indiquent comment formater la donnée si elle est transformée en JSON pour l'API. (Notez le `` `json:"-"` `` sur le mot de passe pour ne JAMAIS l'envoyer par erreur au frontend).
- **Les Interfaces (`Repository`, `Usecase`) :** Ce sont des *contrats*. Le `ServerRepository` dit "Quiconque veut être ma base de données doit posséder une fonction GetByID, une fonction Create, etc.". Cela permet de développer sans même avoir de vraie base de données.

---

## 💾 Étape 4 : L'Accès aux Données (`internal/repository/`)

C'est ici que nous implémentons l'interface `Repository` définie dans le Domain.

### `user_repository.go` et `server_repository.go`
Pour pouvoir tester et développer immédiatement, j'ai créé une base de données **En Mémoire** (In-Memory) en utilisant des Maps (Dictionnaires) Go : `map[string]*domain.Server`.

**Logique & Syntaxe (Thread-Safety) :**
Un serveur web gère des centaines de requêtes en même temps (en parallèle). Si deux requêtes essaient d'écrire dans la même `map` Go en même temps, le programme crash (Fatal error: concurrent map writes).
Pour éviter ça, nous utilisons `sync.RWMutex` (Mutex).
```go
r.mu.Lock()       // Je bloque la carte, personne d'autre ne peut écrire ou lire.
defer r.mu.Unlock() // Dès que la fonction se termine, je débloque.
```

---

## ⚙️ Étape 5 : Les Cas d'Utilisation (`internal/usecase/`)

C'est le cerveau de l'application. Les Usecases orchestrent le tout.

### `user_usecase.go`
- **Login :** Il prend un email et un mot de passe. Il demande au `Repository` (qui cherche dans la map) si l'utilisateur existe. Si oui, il génère un **Token JWT** avec `jwt.NewWithClaims` et le retourne.

### `server_usecase.go`
C'est ici qu'on gère la logique complexe d'un panel d'hébergement.
**Logique d'installation (Goroutines) :**
Quand l'API demande de créer un serveur, nous ne voulons pas bloquer l'utilisateur pendant 5 minutes (le temps que Docker télécharge l'image du jeu).
**Syntaxe :**
```go
go func() { ... }()
```
Le mot-clé `go` crée une **Goroutine**. C'est un thread ultra-léger. La fonction `CreateServer` sauvegarde le serveur avec le statut "installing", lance la Goroutine en arrière-plan (qui fait un `time.Sleep` pour simuler l'installation), et répond instantanément au Front-end que le processus a commencé !

---

## 🌐 Étape 6 : L'API HTTP (`internal/delivery/http/`)

C'est la porte d'entrée de votre application pour le monde extérieur. Nous utilisons le framework **Gin**.

### `middleware.go`
**Logique :** Avant d'autoriser l'accès à `/api/v1/servers`, nous devons vérifier qui fait la requête.
Le middleware lit le header `Authorization: Bearer <token>`, décode le token JWT avec la clé secrète, et extrait l'`userID`. Il stocke ensuite cet ID dans le contexte (`c.Set("userID", userID)`) pour que les handlers suivants sachent qui est connecté.

### `server_handler.go` et `user_handler.go`
Ces fichiers font le pont entre le Web et le Usecase.
**Logique :**
1. Ils lisent le JSON envoyé par le client avec `c.ShouldBindJSON()`.
2. Ils appellent la logique métier : `h.serverUsecase.CreateServer(...)`.
3. Ils utilisent notre package `response` pour formater la réponse.

### `handler.go`
C'est le fichier qui câble toutes les routes URL aux fonctions. Il configure aussi le **CORS** (pour autoriser votre Front-end React/Vue à communiquer avec le backend) et regroupe les routes sous `/api/v1`.

---

## 🏁 Étape 7 : L'Orchestration Finale (`cmd/api/main.go`)

C'est le point d'entrée du programme. 
**Logique (L'Injection de Dépendances) :**
La Clean Architecture repose sur l'injection de dépendances. `main.go` est le seul fichier qui a le droit d'importer toutes les couches.
1. Il initialise la config (`cfg`).
2. Il initialise les Bases de données (`userRepo = repository.New...`).
3. Il **injecte** les bases de données dans la logique métier (`usecase.NewUserUsecase(userRepo, ...)`).
4. Il **injecte** la logique métier dans les API (`delivery.NewUserHandler(userUsecase)`).

### Le Graceful Shutdown (Arrêt Propre)
Si vous mettez à jour votre serveur, vous ne voulez pas couper violemment la connexion d'un client en plein téléchargement.
**Syntaxe :**
Nous écoutons les signaux du système d'exploitation (`syscall.SIGINT`) via un *Channel* Go (`chan os.Signal`). Quand on fait CTRL+C, le serveur arrête d'accepter de nouvelles requêtes, finit de traiter celles en cours (pendant max 5 secondes), puis s'éteint proprement (`srv.Shutdown()`).

---

## 🎉 Conclusion

Nous avons construit une application d'entreprise "State of the Art" (À la pointe).
L'application est découpée en briques Lego. Demain, si vous voulez remplacer la base de données en mémoire par **PostgreSQL**, il vous suffit de créer un nouveau fichier `internal/repository/postgres_user_repository.go` qui respecte l'interface, et de changer **UNE SEULE LIGNE** dans `main.go` ! Aucune autre ligne de code dans toute l'application ne saura que la base de données a changé. C'est la magie de la Clean Architecture !
