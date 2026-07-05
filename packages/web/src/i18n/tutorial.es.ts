import type { TutorialChapter } from './tutorial';

/** Spanish (ES) tutorial — same structure as the Italian one, translated text. */
export const tutorialEs: TutorialChapter[] = [
  {
    chip: 'Objetivo',
    title: '¡Bienvenido a Viking-Island!',
    blocks: [
      {
        t: 'p',
        text:
          '¡Bienvenido a Viking-Island, la isla de los clanes del norte! Construye caminos, ' +
          'aldeas y fortalezas, comercia y defiéndete del Dragón: gana ' +
          'quien primero alcance 10 Puntos de Gloria (PG) en su propio turno.',
      },
      { t: 'h', text: 'Qué da Puntos de Gloria' },
      {
        t: 'list',
        items: [
          'Aldea = 1 PG (máximo 5 aldeas)',
          'Fortaleza = 2 PG (máximo 4, se construye encima de una de tus aldeas)',
          'El Gran Camino = 2 PG (la cadena de caminos más larga, al menos 5)',
          'Furia de los Berserkers = 2 PG (más Berserkers jugados que nadie, al menos 3)',
          'Saga de los Héroes = 1 PG secreto (carta oculta, cuenta de inmediato)',
        ],
      },
      {
        t: 'tip',
        text:
          'Los PG de los Héroes permanecen ocultos a los rivales: ¡la puntuación que ves ' +
          'de los demás podría no ser toda la verdad!',
      },
    ],
  },
  {
    chip: 'Isla',
    title: 'La isla y sus recursos',
    blocks: [
      {
        t: 'p',
        text:
          'La isla está formada por hexágonos, cada uno con un terreno que produce un recurso ' +
          'y una ficha numérica (2–12).',
      },
      { t: 'resRow' },
      {
        t: 'list',
        items: [
          'Bosque de pinos → Madera',
          'Cantera de piedra roja → Piedra',
          'Pasto → Lana',
          'Campos de cebada → Cebada',
          'Mina de hierro → Hierro',
          'Tundra helada → nada: es la guarida del Dragón',
        ],
      },
      { t: 'h', text: 'Las fichas numéricas' },
      {
        t: 'p',
        text:
          'Los puntos bajo el número indican lo probable que es que salga con dos ' +
          'dados: el 6 y el 8 (en rojo) salen muy a menudo, el 2 y el 12 casi nunca. Elegir ' +
          'bien los números vale más que elegir bien los terrenos.',
      },
      { t: 'h', text: 'Los puertos' },
      {
        t: 'p',
        text:
          'En la costa hay 9 puertos (los drakkar): 4 genéricos (intercambios 3:1) y 5 ' +
          'dedicados a un recurso (2:1). Para usarlos necesitas una aldea o una ' +
          'fortaleza en uno de los dos cruces del puerto — cuando colocas, esos ' +
          'cruces muestran un marcador MORADO en lugar de blanco.',
      },
    ],
  },
  {
    chip: 'Inicio',
    title: 'El inicio de la partida',
    blocks: [
      {
        t: 'p',
        text:
          'Se empieza «en serpentina»: por orden cada jugador coloca 1 aldea + 1 ' +
          'camino, luego se vuelve hacia atrás en orden inverso para la segunda vuelta. ' +
          'Quien coloca su primera aldea el último es el primero en colocar la segunda.',
      },
      {
        t: 'list',
        items: [
          'Toca un cruce resaltado para colocar la aldea',
          'Luego toca uno de los lados adyacentes para el camino',
          'La SEGUNDA aldea produce de inmediato los recursos de los hexágonos de alrededor',
        ],
      },
      { t: 'h', text: 'La regla de la distancia' },
      {
        t: 'p',
        text:
          'Dos edificios nunca pueden estar en cruces vecinos: entre tu ' +
          'aldea y cualquier otro edificio siempre debe haber al menos un ' +
          'cruce libre. Vale para toda la partida.',
      },
      {
        t: 'tip',
        text:
          'Para la primera aldea busca números fuertes (6, 8, 5, 9) y recursos ' +
          'variados; con la segunda completa lo que te falta o consigue un puerto.',
      },
    ],
  },
  {
    chip: 'Turno',
    title: 'Tu turno',
    blocks: [
      { t: 'h', text: '1. Tira los dados' },
      {
        t: 'p',
        text:
          'TODOS los hexágonos con el número que ha salido producen: 1 recurso por cada ' +
          'aldea adyacente, 2 por cada fortaleza. ¡También producen los ' +
          'rivales, no solo quien tira!',
      },
      { t: 'h', text: '2. Haz tus jugadas (en cualquier orden)' },
      {
        t: 'list',
        items: [
          'Construye caminos, aldeas, fortalezas',
          'Compra y juega Cartas de Saga (1 carta jugada por turno)',
          'Intercambia con la banca, con los puertos o con los demás jugadores',
        ],
      },
      { t: 'h', text: '3. Fin del turno' },
      {
        t: 'p',
        text:
          'Pulsa «Fin del turno» y los dados pasan al siguiente. Si tienes 10 PG la ' +
          'partida termina de inmediato con tu victoria.',
      },
      {
        t: 'tip',
        text:
          'Si la banca no tiene suficientes cartas de un recurso para satisfacer a VARIOS ' +
          'jugadores en la misma tirada, ese recurso no se reparte a nadie (escasez).',
      },
    ],
  },
  {
    chip: 'Dragón',
    title: 'El 7 y el Dragón',
    blocks: [
      {
        t: 'p',
        text: 'Cuando sale un 7 nadie produce y suceden tres cosas, por orden:',
      },
      {
        t: 'list',
        items: [
          '1. Quien tenga MÁS de 7 cartas de recurso descarta la mitad (redondeando hacia abajo)',
          '2. Quien ha tirado mueve el Dragón a otro hexágono a su elección',
          '3. Roba 1 carta al azar a un jugador con un edificio en ese hexágono',
        ],
      },
      {
        t: 'p',
        text:
          'El hexágono con el Dragón NO produce mientras el Dragón permanece ahí: ' +
          '¡ponlo en los mejores números de tus rivales!',
      },
      {
        t: 'tip',
        text:
          'La carta Berserker mueve el Dragón de la misma manera (y cuenta para la ' +
          'Furia de los Berserkers). Puedes jugarla incluso ANTES de tirar los dados.',
      },
    ],
  },
  {
    chip: 'Construir',
    title: 'Construcciones y costes',
    blocks: [
      { t: 'cost', kind: 'sentiero', note: 'conecta tus edificios · máx. 15' },
      { t: 'cost', kind: 'villaggio', note: '1 PG, produce 1 recurso · máx. 5' },
      { t: 'cost', kind: 'roccaforte', note: '2 PG, produce 2 recursos · máx. 4' },
      { t: 'cost', kind: 'cartaSaga', note: 'una carta sorpresa del mazo (25 cartas)' },
      { t: 'h', text: 'Las reglas de colocación' },
      {
        t: 'list',
        items: [
          'Los caminos deben tocar tu red (uno de tus caminos o edificios)',
          'Un cruce ocupado por un RIVAL interrumpe tu red',
          'Las aldeas van en un cruce conectado a tus caminos + la regla de la distancia',
          'La fortaleza reemplaza UNA de tus aldeas (la aldea vuelve a estar disponible)',
        ],
      },
      {
        t: 'p',
        text:
          'En partida: pulsa «Camino», «Aldea» o «Fortaleza» en la barra ' +
          'inferior y toca uno de los objetivos resaltados en el tablero. El botón «?» ' +
          'de arriba abre el resumen de reglas con este compendio.',
      },
    ],
  },
  {
    chip: 'Intercambios',
    title: 'Los intercambios',
    blocks: [
      { t: 'h', text: 'Con la banca y los puertos' },
      {
        t: 'list',
        items: [
          'Banca: 4 recursos iguales → 1 a tu elección (siempre disponible)',
          'Puerto genérico (3:1): 3 iguales → 1 a tu elección',
          'Puerto dedicado (2:1): 2 de ESE recurso → 1 a tu elección',
        ],
      },
      {
        t: 'p',
        text: 'La mejor proporción se aplica automáticamente en el diálogo «Banca / Puertos».',
      },
      { t: 'h', text: 'Con los demás jugadores (en tu turno)' },
      {
        t: 'list',
        items: [
          'Ofrece un intercambio a UN jugador: si acepta, se realiza al instante',
          'O ofrécelo A TODOS: cada uno responde, luego cierras con quien quieras',
          'Siempre puedes retirar la oferta; solo se puede intercambiar recurso por recurso',
        ],
      },
    ],
  },
  {
    chip: 'Cartas de Saga',
    title: 'Las Cartas de Saga',
    blocks: [
      {
        t: 'p',
        text:
          'El mazo tiene 25 cartas. Las cartas que compras se pueden jugar DESDE EL PRÓXIMO TURNO ' +
          '(los Héroes, en cambio, cuentan de inmediato, ocultos). Puedes jugar como mucho una ' +
          'carta por turno.',
      },
      { t: 'sagaList' },
      {
        t: 'tip',
        text:
          'El Tributo es devastador a media partida: elige el recurso que todos acaban ' +
          'de producir. El Banquete es perfecto para rematar una fortaleza en el acto.',
      },
    ],
  },
  {
    chip: 'Bonus',
    title: 'El Gran Camino y la Furia',
    blocks: [
      { t: 'h', text: 'El Gran Camino (2 PG)' },
      {
        t: 'p',
        text:
          'Va para quien tenga la cadena de caminos CONSECUTIVOS más larga, al menos 5. ' +
          '¡El edificio de un rival colocado en un cruce de la cadena la parte ' +
          'en dos! En caso de empate el bonus se queda con quien lo tenía.',
      },
      { t: 'h', text: 'La Furia de los Berserkers (2 PG)' },
      {
        t: 'p',
        text:
          'Va para quien haya JUGADO más cartas Berserker, al menos 3. Como con ' +
          'el Camino, debes superar estrictamente al poseedor para arrebatarle el bonus.',
      },
      {
        t: 'tip',
        text:
          'Estos 4 PG a menudo deciden la partida: cuenta los caminos y los Berserkers ' +
          'de los rivales en la franja superior (CAMINO y FURIA indican a los poseedores).',
      },
    ],
  },
  {
    chip: 'App',
    title: 'Usar la app',
    blocks: [
      { t: 'h', text: 'El tablero' },
      {
        t: 'list',
        items: [
          'Toca un objetivo resaltado para colocar (blanco = jugada, morado = cruce con puerto)',
          'Zoom: pellizca con dos dedos (móvil) o usa la rueda (PC), arrastra para desplazarte, «1×» para reiniciar',
          '🗺 abre el mapa a pantalla completa (se cierra con ✕ o ESC)',
          '«?» abre el resumen de reglas con costes, puntos y reglas rápidas',
        ],
      },
      { t: 'h', text: 'Los paneles' },
      {
        t: 'list',
        items: [
          'Arriba: dados, fase del turno y jugadores (PG ★, cartas de recurso, Cartas de Saga)',
          'Abajo: tu mano, el botón «Cartas» y el diario de a bordo con la crónica',
          'La barra de acciones solo muestra lo que puedes hacer en ese momento',
        ],
      },
      { t: 'h', text: 'Varios jugadores en el mismo dispositivo (por turnos)' },
      {
        t: 'p',
        text:
          'En «Nueva partida» pon varias filas en «Humano». Entre un turno humano y ' +
          'el siguiente aparece «Pasa el dispositivo»: la mano del siguiente se revela ' +
          'solo tras la confirmación, así nadie cotillea. Los descartes del 7 también ' +
          'se hacen de uno en uno.',
      },
      {
        t: 'tip',
        text:
          'En la configuración puedes fijar la «semilla del mapa»: la misma semilla genera siempre la ' +
          'misma isla (útil para repetir partidas o competir en igualdad de condiciones).',
      },
    ],
  },
  {
    chip: 'En línea',
    title: 'Jugar en línea',
    blocks: [
      { t: 'h', text: '1. Crea una cuenta' },
      {
        t: 'p',
        text:
          'Desde el menú pulsa «En línea» y regístrate: solo necesitas un nombre de usuario (será ' +
          'también tu nombre en el juego) y una contraseña de al menos 8 caracteres. ' +
          'Sin correo electrónico: no hace falta. Una marca verde te dice si el servidor está ' +
          'accesible.',
      },
      { t: 'h', text: '2. Crea la partida o únete' },
      {
        t: 'list',
        items: [
          'CREAR PARTIDA → obtienes un CÓDIGO de 6 letras/cifras: envíaselo a tus amigos',
          'UNIRSE → introduce el código que has recibido y estás en la sala',
          'El anfitrión puede añadir bots y luego pulsar «¡Zarpar!» (de 2 a 6 jugadores)',
        ],
      },
      { t: 'h', text: '3. ¡A jugar!' },
      {
        t: 'p',
        text:
          'Cada uno juega desde su propio dispositivo y ve SOLO su propia mano: ' +
          'el árbitro es el servidor, que valida cada jugada con las mismas reglas que ' +
          'el juego local (imposible hacer trampas). Las jugadas de los demás llegan en ' +
          'tiempo real al diario de a bordo.',
      },
      { t: 'h', text: 'Temporizador y desconexiones' },
      {
        t: 'list',
        items: [
          'Temporizador de turno (opcional, elegido al crear la partida): al agotarse el juego hace por sí solo la jugada más inofensiva, así nadie bloquea la partida',
          'Si te caes o cierras la página, vuelve: la sesión se reconecta sola, o vuelve a entrar con el código de la sala — tu sitio sigue siendo tuyo',
        ],
      },
      {
        t: 'tip',
        text:
          'Sin un servidor configurado, el juego en línea simplemente está desactivado: todo el ' +
          'resto del juego (bots y por turnos en el mismo dispositivo) funciona igualmente, incluso sin conexión.',
      },
    ],
  },
];
