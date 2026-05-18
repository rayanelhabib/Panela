## I. Backend - L'Architecture et les technologies



### 1- BUILD *PACKAGE* LI AYKON FEH dependencies DIALI :
- 1. create ```Package``` ext .mod li aykon fih dependencies dyal project  b7al package.json f node.js :
    - **module** : How Start Lwel Ddiyal file go.mode  kandir ofih ligne ou chment accees diyal module diyali , hda kndir bach noimporter package local diyal project : github.com/panella/backend
    - **go get** : Kandir diyalha bach ntysty l package 
    - ### MOHIM : Go utilise ce chemin pour savoir comment importer les fichiers internes de votre projet. Si vous créez un dossier controllers dans votre projet, vous l'importerez ailleurs en écrivant import "://github.com"
    - **go 1.21** : ersion minimale du langage Go requise pour exécuter ce code.
    - **github.com/gin-contrib/cors v1.5.0** : How extenstio(middleware) diyal gin bch kaydir CORS(Cross-Origin Resource Sharing)
    - **github.com/golang-jwt/jwt/v5 v5.2.0** : Hda Rah ma3rouf diyal sec auth ou dkchi bayn
    - **github.com/google/uuid v1.6.0** : bach ngenerere complexe id blaste ma dnir norla b7al 1 2 ... 
    - **github.com/spf13/viper v1.18.2** : Hda li kay Centraliser confi diyal app , kay9der totu sipl i9ra file config(config.yaml, config.json, config.toml, env...) oula yakhod data mn db
    - **go.uber.org/zap v1.26.0** : Bib logs khifa (aus Uber) aylogi kolchi err, cnn, req, res... 3la Chkel JSON

    
- 2. Create ```configs/config.yaml``` et ```internal/config/config.go```
        - **configs/config.yaml** : Hna kandir confi diyal app (Kaystoki valeurs dyal DB, API_KEY, JWT_SECRET...)
        - **internal/config/config.go** : kayusi VIper bacj i9ra YAML ou Y7awlo en GO(struct) bach use in all app , syntaxe ```mapstructure:"app"``` bach kathe3 l viper ygol kifam Imappi cle YAML l variable Go

---------------------------------------------------------------------------------------------------------------

### 2-  Les Outils Transversaux (pkg/) :
- 1. **pkg/logger/logger.go** : Hna kandir module diyal logs , kayusi ZAP bach aylogi kolchi err, cnn, req, res... 3la Chkel JSON
    - *Tipps li ghadir Dkiya* : F 3awed ma ndir n3ayet l ``zap.Info`` , ghadi Nsayb Wrapper(enveloppe ghadi tkon) , ghadi envoyer les logs vers Datadog blama nmodifie code 

- 2. **pkg/response/response.go** : Hna kandir Fonction JSON  li ghadi tfromati Ga3 les requetes bhed struct ``{ success: true, message: "...", data: {}, error: null }`` , Les fonctiosn b7al OK, Created, ou BadRequest y3awyte l fontion 2assasiya li 3nda code s7i7 http


----------------------------------------------------------------------------------------------------------------


### 3- Core Architecture (internal/) :
*Dossider ``internal``*: han kdnir logiqeu code ga3 li 3ndi f app bach secrutie et bzaaf AHEM 7ja (**garantir l'encapsulation du code**)
**7ja khra** : bach istoker code metier ou des ou les gestionnaires de requêtes (handlers)

- 1. **`internal/domain/`** : DDD(domain Driver design) how le coeur metier li how li kaygere eles struttures de donnes , 2ahem 7ja khas ykon indepede 3la db
- - **Les Structs (`Server`, `User`) :** Représentent les données. Les tags `` `json:"id"` `` indiquent comment formater la donnée si elle est transformée en JSON pour l'API. (Notez le `` `json:"-"` `` sur le mot de passe pour ne JAMAIS l'envoyer par erreur au frontend).
- **Les Interfaces (`Repository`, `Usecase`) :** Ce sont des *contrats*. Le `ServerRepository` dit "Quiconque veut être ma base de données doit posséder une fonction GetByID, une fonction Create, etc.". Cela permet de développer sans même avoir de vraie base de données.



----------------------------------------------------------------------------------------------------------------


### 4- L'Accès aux Données (`internal/repository/`) :
    - implémentons l'interface `Repository` définie dans le Domain.

- -`user_repository.go` et `server_repository.go`
Pour pouvoir tester et développer immédiatement, j'ai créé une base de données **En Mémoire** (In-Memory) en utilisant des Maps (Dictionnaires) Go : `map[string]*domain.Server`.

- Server Web kaygeren bzaf diyal requetes f nafs lwa9te ila chi 2 re 7awlo  iktebo f nafs lmap ghadi ikrashhi web (Fatal error: concurrent map writes)
- bah nevitiw dhci kandiro  `sync.RWMutex` (Mutex)
 ```go
r.mu.Lock()       // Je bloque la carte, personne d'autre ne peut écrire ou lire.
defer r.mu.Unlock() // Dès que la fonction se termine, je débloque.
```


----------------------------------------------------------------------------------------------------------------


### 5- Les Cas d'Utilisation (`internal/usecase/`) :
- le39al dyal app , Les Usecases orchestrent diyal kolch
--- ### `user_usecase.go`
- **Login :** Il prend un email et un mot de passe. Il demande au `Repository` (qui cherche dans la map) si l'utilisateur existe. Si oui, il génère un **Token JWT** avec `jwt.NewWithClaims` et le retourne.


-- ### `server_usecase.go`
C'est ici qu'on gère la logique complexe d'un panel d'hébergement.
**Logique d'installation (Goroutines) :**
Quand l'API demande de créer un serveur, nous ne voulons pas bloquer l'utilisateur pendant 5 minutes (le temps que Docker télécharge l'image du jeu).
**Syntaxe :**
```go
go func() { ... }()
```
**Le mot-clé `go` crée une **Goroutine**. C'est un thread ultra-léger. La fonction `CreateServer` sauvegarde le serveur avec le statut "installing", lance la Goroutine en arrière-plan (qui fait un `time.Sleep` pour simuler l'installation), et répond instantanément au Front-end que le processus a commencé !**



----------------------------------------------------------------------------------------------------------------


### 6- L'API HTTP (`internal/delivery/http/`) :

hda banb li aydkhol no kolchi ya3ni frontend ghdi nusiw **Gin**

--- ### `middleware.go`
**Logique :** 9bel ma n3ti acces l `/api/v1/servers`, kahss nverifie chkon dar requete
middlware kay9ra header `Authorization: Bearer <token>` kaydecodi JWT b cle scr ou kaybde userID , morah kaystokih userId f Context (`c.Set("userID", userID)`) bach handler li orah y3ref bli mconnecter

--- ### `server_handler.go` et `user_handler.go`
Ces fichiers font le pont entre le Web et le Usecase.
**Logique :**
1. kay9ra JW li tseft men client avec `c.ShouldBindJSON()`.
2. kay3ayet logiquer metier avec : `h.serverUsecase.CreateServer(...)`.
3. kasysi package  `response` bach yformati response 

-- ### `handler.go`
Hed ficheir hwo li cabli ma bin url li fonction ou kayrefroupii route l3 chkel `/api/v1`

### 7. L'Orchestration Finale (`cmd/api/main.go`) :
hwoa main diyal prog 
- main how bo7doo li y9ad importe ga3 les couches 
  1. Il initialise la config (`cfg`).
1. kayinitialsier db (`userRepo = repository.New...`).
2. **injecte** dbs f logique métier (`usecase.NewUserUsecase(userRepo, ...)`).
3. **injecte**  logique métier dans les API (`delivery.NewUserHandler(userUsecase)`).



    



    

    


    


