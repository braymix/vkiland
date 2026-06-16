import type { TutorialChapter } from './tutorial';

/** English (EN) tutorial — same structure as the Italian one, translated text. */
export const tutorialEn: TutorialChapter[] = [
  {
    chip: 'Goal',
    title: 'Welcome to Viking-Island!',
    blocks: [
      {
        t: 'p',
        text:
          'Welcome to Viking-Island, the isle of the northern clans! Build paths, ' +
          'villages and strongholds, trade and defend yourself from the Dragon: the ' +
          'first to reach 10 Glory Points (GP) on their own turn wins.',
      },
      { t: 'h', text: 'What gives Glory Points' },
      {
        t: 'list',
        items: [
          'Village = 1 GP (max 5 villages)',
          'Stronghold = 2 GP (max 4, built on top of one of your villages)',
          'The Great Road = 2 GP (the longest chain of paths, at least 5)',
          'Berserker Fury = 2 GP (more Berserkers played than anyone, at least 3)',
          'Hero Saga = 1 secret GP (hidden card, counts right away)',
        ],
      },
      {
        t: 'tip',
        text:
          'Hero GP stay hidden from opponents: the score you see for others might ' +
          'not be the whole story!',
      },
    ],
  },
  {
    chip: 'Isle',
    title: 'The isle and its resources',
    blocks: [
      {
        t: 'p',
        text:
          'The isle is made of hexes, each with a terrain that produces a resource ' +
          'and a number token (2–12).',
      },
      { t: 'resRow' },
      {
        t: 'list',
        items: [
          'Pine forest → Wood',
          'Red-stone quarry → Stone',
          'Pasture → Wool',
          'Barley fields → Barley',
          'Iron mine → Iron',
          'Frozen tundra → nothing: it’s the Dragon’s lair',
        ],
      },
      { t: 'h', text: 'The number tokens' },
      {
        t: 'p',
        text:
          'The dots under the number show how likely it is to come up with two ' +
          'dice: 6 and 8 (in red) come up very often, 2 and 12 almost never. Picking ' +
          'good numbers matters more than picking good terrains.',
      },
      { t: 'h', text: 'The harbors' },
      {
        t: 'p',
        text:
          'There are 9 harbors along the coast (the drakkars): 4 generic (3:1 ' +
          'trades) and 5 dedicated to one resource (2:1). To use them you need a ' +
          'village or a stronghold on one of the harbor’s two intersections — when ' +
          'you place, those intersections show a PURPLE marker instead of white.',
      },
    ],
  },
  {
    chip: 'Start',
    title: 'The start of the game',
    blocks: [
      {
        t: 'p',
        text:
          'You start “snake-style”: in order each player places 1 village + 1 path, ' +
          'then it goes back in reverse order for the second round. Whoever places ' +
          'the first village last places the second one first.',
      },
      {
        t: 'list',
        items: [
          'Tap a highlighted intersection to place the village',
          'Then tap one of the adjacent edges for the path',
          'The SECOND village immediately produces the resources of the hexes around it',
        ],
      },
      { t: 'h', text: 'The distance rule' },
      {
        t: 'p',
        text:
          'Two buildings can never sit on neighboring intersections: between your ' +
          'village and any other building there must always be at least one free ' +
          'intersection. This holds for the whole game.',
      },
      {
        t: 'tip',
        text:
          'For the first village look for strong numbers (6, 8, 5, 9) and varied ' +
          'resources; with the second, complete what you’re missing or grab a harbor.',
      },
    ],
  },
  {
    chip: 'Turn',
    title: 'Your turn',
    blocks: [
      { t: 'h', text: '1. Roll the dice' },
      {
        t: 'p',
        text:
          'ALL hexes with the rolled number produce: 1 resource for each adjacent ' +
          'village, 2 for each stronghold. Opponents produce too, not just the ' +
          'roller!',
      },
      { t: 'h', text: '2. Make your moves (in any order)' },
      {
        t: 'list',
        items: [
          'Build paths, villages, strongholds',
          'Buy and play Saga Cards (1 card played per turn)',
          'Trade with the bank, the harbors or the other players',
        ],
      },
      { t: 'h', text: '3. End turn' },
      {
        t: 'p',
        text:
          'Press “End turn” and the dice pass to the next player. If you have 10 GP ' +
          'the game ends right away with your victory.',
      },
      {
        t: 'tip',
        text:
          'If the bank doesn’t have enough cards of a resource to satisfy SEVERAL ' +
          'players on the same roll, that resource is given to no one (shortage).',
      },
    ],
  },
  {
    chip: 'Dragon',
    title: 'The 7 and the Dragon',
    blocks: [
      {
        t: 'p',
        text: 'When a 7 comes up no one produces and three things happen, in order:',
      },
      {
        t: 'list',
        items: [
          '1. Anyone with MORE than 7 resource cards discards half (rounded down)',
          '2. Whoever rolled moves the Dragon to another hex of their choice',
          '3. They steal 1 random card from a player with a building on that hex',
        ],
      },
      {
        t: 'p',
        text:
          'The hex with the Dragon does NOT produce while the Dragon stays there: ' +
          'place it on your opponents’ best numbers!',
      },
      {
        t: 'tip',
        text:
          'The Berserker card moves the Dragon the same way (and counts toward ' +
          'Berserker Fury). You can even play it BEFORE rolling the dice.',
      },
    ],
  },
  {
    chip: 'Build',
    title: 'Buildings and costs',
    blocks: [
      { t: 'cost', kind: 'sentiero', note: 'connects your buildings · max 15' },
      { t: 'cost', kind: 'villaggio', note: '1 GP, produces 1 resource · max 5' },
      { t: 'cost', kind: 'roccaforte', note: '2 GP, produces 2 resources · max 4' },
      { t: 'cost', kind: 'cartaSaga', note: 'a surprise card from the deck (25 cards)' },
      { t: 'h', text: 'The placement rules' },
      {
        t: 'list',
        items: [
          'Paths must touch your network (one of your paths or buildings)',
          'An intersection held by an OPPONENT cuts off your network',
          'Villages go on an intersection connected to your paths + the distance rule',
          'The stronghold replaces ONE of your villages (the village becomes available again)',
        ],
      },
      {
        t: 'p',
        text:
          'In game: press “Path”, “Village” or “Stronghold” in the bottom bar and ' +
          'tap one of the highlighted targets on the board. The “?” button at the ' +
          'top opens the rules card with this summary.',
      },
    ],
  },
  {
    chip: 'Trades',
    title: 'Trading',
    blocks: [
      { t: 'h', text: 'With the bank and the harbors' },
      {
        t: 'list',
        items: [
          'Bank: 4 identical resources → 1 of your choice (always available)',
          'Generic harbor (3:1): 3 identical → 1 of your choice',
          'Dedicated harbor (2:1): 2 of THAT resource → 1 of your choice',
        ],
      },
      {
        t: 'p',
        text: 'The best ratio is applied automatically in the “Bank / Harbors” dialog.',
      },
      { t: 'h', text: 'With the other players (on your turn)' },
      {
        t: 'list',
        items: [
          'Offer a trade to ONE player: if they accept, it happens at once',
          'Or offer it TO EVERYONE: each one replies, then you close with whoever you want',
          'You can always withdraw the offer; you can only trade resource for resource',
        ],
      },
    ],
  },
  {
    chip: 'Saga Cards',
    title: 'The Saga Cards',
    blocks: [
      {
        t: 'p',
        text:
          'The deck has 25 cards. Cards you buy can be played FROM THE NEXT TURN ' +
          '(Heroes instead count right away, while hidden). You can play at most one ' +
          'card per turn.',
      },
      { t: 'sagaList' },
      {
        t: 'tip',
        text:
          'The Tribute is devastating mid-game: pick the resource everyone has just ' +
          'produced. The Feast is perfect to finish off a stronghold on the spot.',
      },
    ],
  },
  {
    chip: 'Bonus',
    title: 'The Great Road and the Fury',
    blocks: [
      { t: 'h', text: 'The Great Road (2 GP)' },
      {
        t: 'p',
        text:
          'Goes to whoever has the longest chain of CONSECUTIVE paths, at least 5. ' +
          'An opponent’s building placed on an intersection of the chain splits it ' +
          'in two! On a tie the bonus stays with whoever held it.',
      },
      { t: 'h', text: 'The Berserker Fury (2 GP)' },
      {
        t: 'p',
        text:
          'Goes to whoever has PLAYED the most Berserker cards, at least 3. As with ' +
          'the Road, you must strictly beat the holder to take the bonus.',
      },
      {
        t: 'tip',
        text:
          'These 4 GP often decide the game: count opponents’ paths and Berserkers ' +
          'in the top strip (ROAD and FURY show the holders).',
      },
    ],
  },
  {
    chip: 'App',
    title: 'Using the app',
    blocks: [
      { t: 'h', text: 'The board' },
      {
        t: 'list',
        items: [
          'Tap a highlighted target to place (white = move, purple = harbor intersection)',
          'Zoom: pinch with two fingers (phone) or use the wheel (PC), drag to pan, “1×” to reset',
          '🗺 opens the full-screen map (close with ✕ or ESC)',
          '“?” opens the rules card with costs, points and quick rules',
        ],
      },
      { t: 'h', text: 'The panels' },
      {
        t: 'list',
        items: [
          'Top: dice, turn phase and players (GP ★, resource cards, Saga Cards)',
          'Bottom: your hand, the “Cards” button and the captain’s log with the chronicle',
          'The action bar shows only what you can do at that moment',
        ],
      },
      { t: 'h', text: 'Several players on the same device (hot-seat)' },
      {
        t: 'p',
        text:
          'In “New game” set several rows to “Human”. Between one human turn and the ' +
          'next, “Pass the device” appears: the next player’s hand is revealed only ' +
          'after confirmation, so no one peeks. The 7 discards also happen one at a ' +
          'time.',
      },
      {
        t: 'tip',
        text:
          'In setup you can fix the “map seed”: the same seed always generates the ' +
          'same isle (handy for replays or fair challenges).',
      },
    ],
  },
  {
    chip: 'Online',
    title: 'Playing online',
    blocks: [
      { t: 'h', text: '1. Create an account' },
      {
        t: 'p',
        text:
          'From the menu press “Online” and sign up: all you need is a username (it ' +
          'will also be your in-game name) and a password of at least 8 characters. ' +
          'No email: it’s not needed. A green check tells you if the server is ' +
          'reachable.',
      },
      { t: 'h', text: '2. Create the game or join' },
      {
        t: 'list',
        items: [
          'CREATE GAME → you get a 6-letter/digit CODE: send it to your friends',
          'JOIN → enter the code you received and you’re in the lobby',
          'The host can add bots and then press “Set sail!” (2 to 4 players)',
        ],
      },
      { t: 'h', text: '3. Play!' },
      {
        t: 'p',
        text:
          'Everyone plays from their own device and sees ONLY their own hand: the ' +
          'referee is the server, which validates every move with the same rules as ' +
          'the local game (no cheating possible). Other players’ moves arrive in ' +
          'real time in the captain’s log.',
      },
      { t: 'h', text: 'Timer and disconnections' },
      {
        t: 'list',
        items: [
          'Turn timer (optional, chosen at creation): when it runs out the game makes the most harmless move itself, so no one stalls the game',
          'If you drop or close the page, come back: the session reconnects on its own, or re-enter with the lobby code — your seat stays yours',
        ],
      },
      {
        t: 'tip',
        text:
          'Without a configured server, online is simply off: the rest of the game ' +
          '(bots and hot-seat) still works, even offline.',
      },
    ],
  },
];
