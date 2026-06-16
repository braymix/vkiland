import type { TutorialChapter } from './tutorial';

/** French (FR) tutorial — same structure as the Italian one, translated text. */
export const tutorialFr: TutorialChapter[] = [
  {
    chip: 'But',
    title: 'Bienvenue à Viking-Island !',
    blocks: [
      {
        t: 'p',
        text:
          "Bienvenue à Viking-Island, l'île des clans du nord ! Construis des chemins, " +
          "des villages et des forteresses, commerce et défends-toi du Dragon : le " +
          "premier à atteindre 10 Points de Gloire (PG) pendant son tour gagne.",
      },
      { t: 'h', text: 'Ce qui rapporte des Points de Gloire' },
      {
        t: 'list',
        items: [
          'Village = 1 PG (max. 5 villages)',
          'Forteresse = 2 PG (max. 4, construite sur un de tes villages)',
          'La Grande Voie = 2 PG (la plus longue chaîne de chemins, au moins 5)',
          'Fureur des Berserkers = 2 PG (plus de Berserkers joués que quiconque, au moins 3)',
          'Saga des Héros = 1 PG secret (carte cachée, compte tout de suite)',
        ],
      },
      {
        t: 'tip',
        text:
          "Les PG des Héros restent cachés des adversaires : le score que tu vois pour " +
          "les autres n'est peut-être pas toute l'histoire !",
      },
    ],
  },
  {
    chip: 'Île',
    title: "L'île et ses ressources",
    blocks: [
      {
        t: 'p',
        text:
          "L'île est faite d'hexagones, chacun avec un terrain qui produit une ressource " +
          'et un jeton numérique (2–12).',
      },
      { t: 'resRow' },
      {
        t: 'list',
        items: [
          'Forêt de pins → Bois',
          'Carrière de pierre rouge → Pierre',
          'Pâturage → Laine',
          "Champs d'orge → Orge",
          'Mine de fer → Fer',
          'Toundra gelée → rien : c’est l’antre du Dragon',
        ],
      },
      { t: 'h', text: 'Les jetons numériques' },
      {
        t: 'p',
        text:
          'Les points sous le numéro montrent sa probabilité de sortir avec deux ' +
          'dés : 6 et 8 (en rouge) sortent très souvent, 2 et 12 presque jamais. Bien ' +
          'choisir les numéros compte plus que bien choisir les terrains.',
      },
      { t: 'h', text: 'Les ports' },
      {
        t: 'p',
        text:
          'Il y a 9 ports le long de la côte (les drakkars) : 4 génériques (échanges ' +
          '3:1) et 5 dédiés à une ressource (2:1). Pour les utiliser, il te faut un ' +
          'village ou une forteresse sur un des deux croisements du port — quand tu ' +
          'places, ces croisements affichent un marqueur VIOLET au lieu de blanc.',
      },
    ],
  },
  {
    chip: 'Début',
    title: 'Le début de la partie',
    blocks: [
      {
        t: 'p',
        text:
          'On commence « en serpentin » : chacun son tour, chaque joueur place 1 village + 1 chemin, ' +
          "puis on revient dans l'ordre inverse pour le second tour. Celui qui place " +
          'le premier village en dernier place le second en premier.',
      },
      {
        t: 'list',
        items: [
          'Touche un croisement en surbrillance pour placer le village',
          "Puis touche un des bords adjacents pour le chemin",
          'Le SECOND village produit aussitôt les ressources des hexagones autour',
        ],
      },
      { t: 'h', text: 'La règle de la distance' },
      {
        t: 'p',
        text:
          'Deux bâtiments ne peuvent jamais être sur des croisements voisins : entre ton ' +
          'village et tout autre bâtiment, il doit toujours y avoir au moins un ' +
          'croisement libre. Cela vaut pour toute la partie.',
      },
      {
        t: 'tip',
        text:
          'Pour le premier village, cherche des numéros forts (6, 8, 5, 9) et des ' +
          'ressources variées ; avec le second, complète ce qui te manque ou prends un port.',
      },
    ],
  },
  {
    chip: 'Tour',
    title: 'Ton tour',
    blocks: [
      { t: 'h', text: '1. Lance les dés' },
      {
        t: 'p',
        text:
          'TOUS les hexagones avec le numéro tiré produisent : 1 ressource par ' +
          'village adjacent, 2 par forteresse. Les adversaires produisent aussi, pas ' +
          'seulement celui qui lance !',
      },
      { t: 'h', text: '2. Fais tes coups (dans n’importe quel ordre)' },
      {
        t: 'list',
        items: [
          'Construis des chemins, des villages, des forteresses',
          'Achète et joue des Cartes Saga (1 carte jouée par tour)',
          'Échange avec la banque, les ports ou les autres joueurs',
        ],
      },
      { t: 'h', text: '3. Fin du tour' },
      {
        t: 'p',
        text:
          'Appuie sur « Fin du tour » et les dés passent au joueur suivant. Si tu as 10 PG, ' +
          'la partie se termine aussitôt par ta victoire.',
      },
      {
        t: 'tip',
        text:
          "Si la banque n'a pas assez de cartes d'une ressource pour satisfaire PLUSIEURS " +
          'joueurs sur le même lancer, cette ressource n’est donnée à personne (pénurie).',
      },
    ],
  },
  {
    chip: 'Dragon',
    title: 'Le 7 et le Dragon',
    blocks: [
      {
        t: 'p',
        text: 'Quand un 7 sort, personne ne produit et trois choses arrivent, dans l’ordre :',
      },
      {
        t: 'list',
        items: [
          '1. Quiconque a PLUS de 7 cartes ressource en défausse la moitié (arrondie à l’inférieur)',
          '2. Celui qui a lancé déplace le Dragon sur un autre hexagone de son choix',
          '3. Il vole 1 carte au hasard à un joueur ayant un bâtiment sur cet hexagone',
        ],
      },
      {
        t: 'p',
        text:
          "L'hexagone avec le Dragon NE produit PAS tant que le Dragon y reste : " +
          'place-le sur les meilleurs numéros de tes adversaires !',
      },
      {
        t: 'tip',
        text:
          'La carte Berserker déplace le Dragon de la même façon (et compte pour la ' +
          'Fureur des Berserkers). Tu peux même la jouer AVANT de lancer les dés.',
      },
    ],
  },
  {
    chip: 'Construire',
    title: 'Bâtiments et coûts',
    blocks: [
      { t: 'cost', kind: 'sentiero', note: 'relie tes bâtiments · max. 15' },
      { t: 'cost', kind: 'villaggio', note: '1 PG, produit 1 ressource · max. 5' },
      { t: 'cost', kind: 'roccaforte', note: '2 PG, produit 2 ressources · max. 4' },
      { t: 'cost', kind: 'cartaSaga', note: 'une carte surprise de la pioche (25 cartes)' },
      { t: 'h', text: 'Les règles de placement' },
      {
        t: 'list',
        items: [
          'Les chemins doivent toucher ton réseau (un de tes chemins ou bâtiments)',
          'Un croisement tenu par un ADVERSAIRE coupe ton réseau',
          'Les villages vont sur un croisement relié à tes chemins + la règle de la distance',
          'La forteresse remplace UN de tes villages (le village redevient disponible)',
        ],
      },
      {
        t: 'p',
        text:
          'En partie : appuie sur « Chemin », « Village » ou « Forteresse » dans la barre du ' +
          'bas et touche une des cibles en surbrillance sur le plateau. Le bouton « ? » en ' +
          'haut ouvre l’aide-mémoire avec ce récapitulatif.',
      },
    ],
  },
  {
    chip: 'Échanges',
    title: 'Les échanges',
    blocks: [
      { t: 'h', text: 'Avec la banque et les ports' },
      {
        t: 'list',
        items: [
          'Banque : 4 ressources identiques → 1 de ton choix (toujours disponible)',
          'Port générique (3:1) : 3 identiques → 1 de ton choix',
          'Port dédié (2:1) : 2 de CETTE ressource → 1 de ton choix',
        ],
      },
      {
        t: 'p',
        text: 'Le meilleur ratio s’applique automatiquement dans le dialogue « Banque / Ports ».',
      },
      { t: 'h', text: 'Avec les autres joueurs (pendant ton tour)' },
      {
        t: 'list',
        items: [
          'Propose un échange à UN joueur : s’il accepte, il se fait aussitôt',
          'Ou propose-le À TOUT LE MONDE : chacun répond, puis tu conclus avec qui tu veux',
          'Tu peux toujours retirer l’offre ; tu ne peux échanger que ressource contre ressource',
        ],
      },
    ],
  },
  {
    chip: 'Cartes Saga',
    title: 'Les Cartes Saga',
    blocks: [
      {
        t: 'p',
        text:
          'La pioche a 25 cartes. Les cartes achetées se jouent À PARTIR DU PROCHAIN TOUR ' +
          '(les Héros, eux, comptent tout de suite, en restant cachés). Tu peux jouer au plus une ' +
          'carte par tour.',
      },
      { t: 'sagaList' },
      {
        t: 'tip',
        text:
          'Le Tribut est dévastateur en milieu de partie : choisis la ressource que tout le monde vient ' +
          'de produire. Le Banquet est parfait pour achever une forteresse sur-le-champ.',
      },
    ],
  },
  {
    chip: 'Bonus',
    title: 'La Grande Voie et la Fureur',
    blocks: [
      { t: 'h', text: 'La Grande Voie (2 PG)' },
      {
        t: 'p',
        text:
          'Va à celui qui a la plus longue chaîne de chemins CONSÉCUTIFS, au moins 5. ' +
          'Un bâtiment adverse placé sur un croisement de la chaîne la coupe ' +
          'en deux ! En cas d’égalité, le bonus reste à celui qui le détenait.',
      },
      { t: 'h', text: 'La Fureur des Berserkers (2 PG)' },
      {
        t: 'p',
        text:
          'Va à celui qui a JOUÉ le plus de cartes Berserker, au moins 3. Comme pour la ' +
          'Voie, tu dois strictement battre le détenteur pour lui prendre le bonus.',
      },
      {
        t: 'tip',
        text:
          'Ces 4 PG décident souvent la partie : compte les chemins et les Berserkers ' +
          'des adversaires dans le bandeau du haut (VOIE et FUREUR indiquent les détenteurs).',
      },
    ],
  },
  {
    chip: 'Appli',
    title: "Utiliser l'appli",
    blocks: [
      { t: 'h', text: 'Le plateau' },
      {
        t: 'list',
        items: [
          'Touche une cible en surbrillance pour placer (blanc = coup, violet = croisement avec port)',
          'Zoom : pince à deux doigts (téléphone) ou utilise la molette (PC), fais glisser pour te déplacer, « 1× » pour réinitialiser',
          '🗺 ouvre la carte en plein écran (se ferme avec ✕ ou ÉCHAP)',
          '« ? » ouvre l’aide-mémoire avec coûts, points et règles rapides',
        ],
      },
      { t: 'h', text: 'Les panneaux' },
      {
        t: 'list',
        items: [
          'En haut : dés, phase du tour et joueurs (PG ★, cartes ressource, Cartes Saga)',
          'En bas : ta main, le bouton « Cartes » et le journal de bord avec la chronique',
          'La barre d’actions ne montre que ce que tu peux faire à ce moment-là',
        ],
      },
      { t: 'h', text: 'Plusieurs joueurs sur le même appareil (hot-seat)' },
      {
        t: 'p',
        text:
          'Dans « Nouvelle partie », mets plusieurs lignes sur « Humain ». Entre un tour humain et ' +
          'le suivant, « Passe l’appareil » apparaît : la main du joueur suivant n’est révélée qu’' +
          'après confirmation, pour que personne ne triche. Les défausses du 7 se font aussi une à ' +
          'la fois.',
      },
      {
        t: 'tip',
        text:
          'Au setup, tu peux fixer la « graine de carte » : la même graine génère toujours la ' +
          'même île (pratique pour rejouer ou se défier à armes égales).',
      },
    ],
  },
  {
    chip: 'En ligne',
    title: 'Jouer en ligne',
    blocks: [
      { t: 'h', text: '1. Crée un compte' },
      {
        t: 'p',
        text:
          'Depuis le menu, appuie sur « En ligne » et inscris-toi : il te suffit d’un nom d’utilisateur (ce ' +
          'sera aussi ton nom en jeu) et d’un mot de passe d’au moins 8 caractères. ' +
          'Pas d’e-mail : inutile. Une coche verte te dit si le serveur est ' +
          'accessible.',
      },
      { t: 'h', text: '2. Crée la partie ou rejoins-en une' },
      {
        t: 'list',
        items: [
          'CRÉER UNE PARTIE → tu obtiens un CODE de 6 lettres/chiffres : envoie-le à tes amis',
          'REJOINDRE → saisis le code reçu et te voilà dans le salon',
          'L’hôte peut ajouter des bots puis appuyer sur « Larguez les amarres ! » (de 2 à 4 joueurs)',
        ],
      },
      { t: 'h', text: '3. On joue !' },
      {
        t: 'p',
        text:
          'Chacun joue depuis son propre appareil et ne voit QUE sa main : ' +
          'l’arbitre, c’est le serveur, qui valide chaque coup avec les mêmes règles que ' +
          'le jeu local (impossible de tricher). Les coups des autres arrivent en ' +
          'temps réel dans le journal de bord.',
      },
      { t: 'h', text: 'Minuteur et déconnexions' },
      {
        t: 'list',
        items: [
          'Minuteur de tour (optionnel, choisi à la création) : une fois écoulé, le jeu joue lui-même le coup le plus inoffensif, pour que personne ne bloque la partie',
          'Si tu décroches ou fermes la page, reviens : la session se reconnecte toute seule, ou rentre de nouveau avec le code du salon — ta place reste la tienne',
        ],
      },
      {
        t: 'tip',
        text:
          'Sans serveur configuré, le jeu en ligne est simplement désactivé : le reste du jeu ' +
          '(bots et hot-seat) fonctionne quand même, même hors ligne.',
      },
    ],
  },
];
