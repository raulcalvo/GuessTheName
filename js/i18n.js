// Textos de la interfaz en castellano, catalán e inglés.
// Las frases para cada nombre están en Firestore; las genéricas, en respuestas.*.js.
const I18N_GENERICAS = {};

const I18N_UI = {
  es: {
    tituloPagina: "¿Cómo se llamará?",
    jugadorTitulo: "¿Quién eres?",
    jugadorIntro: "Antes de nada, dinos tu nombre y apellido (el apellido es para que sepamos quién eres). Apuntaremos tus intentos en el marcador oficial, para la gloria o para la vergüenza. 😏",
    jugadorEtiqueta: "Tu nombre y apellido",
    jugadorPlaceholder: "Nombre y apellido...",
    jugadorEntrar: "¡A jugar!",
    jugadorComprobando: "Comprobando...",
    jugadorVacio: "Sin nombre no hay juego. ¿Cómo te llamas?",
    jugadorOcupado: "Ya hay alguien jugando como «{nombre}». Añade tu apellido, un mote o algo que te distinga.",
    jugadorError: "No hemos podido comprobar tu nombre. Revisa la conexión y vuelve a probar.",
    jugandoComo: "Juegas como {nombre}.",
    noSoyYo: "¿No eres tú?",
    avisoSecretoTitulo: "¡NI UNA PALABRA!",
    avisoSecreto: "Ahora que lo sabes, no se lo digas a nadie. Ni una pista, ni una inicial, ni una mirada cómplice: que los demás sigan intentándolo y puedan jugar también.",
    titulo1: "El Gran Misterio",
    titulo2: "de la Criatura",
    intro1: "Distinguidísimo adivino: tras meses de cábalas, apuestas clandestinas y teorías dignas de un documental de misterio, ha llegado tu momento de gloria.",
    intro2: "¿Niño? ¿Niña? Eso es secreto de Estado, así que vale cualquier nombre. <strong>Escribe el nombre que crees que llevará el bebé</strong> y descubre si eres un auténtico oráculo... o un humilde aficionado.",
    etiquetaNombre: "Nombre",
    placeholder: "Escribe un nombre...",
    placeholderVacio: "Hay que escribir algo, ¿eh? 😏",
    adivinar: "¡Adivinar!",
    consultando: "Consultando al oráculo...",
    contador1: "Llevas 1 intento. Esto acaba de empezar.",
    contadorN: "Llevas {n} intentos.",
    animo: "¡Ánimo!",
    perseverancia: "La perseverancia es una virtud. 💪",
    titulosFallo: ["¡Nooo!", "¡Casi! (mentira)", "¡Frío, frío!", "¡Uy, por poco!", "¡Error!", "¡Ni de lejos!", "¡Prueba otra vez!"],
    reintentar: "Volver a intentarlo",
    pistasTitulo: "🔎 Tus pistas",
    proximaPista: "Te faltan {n} intentos para la próxima pista. 🔎",
    proximaPista1: "¡Solo 1 intento más para la próxima pista! 🔎",
    nuevaPista: "🎁 ¡Nueva pista disponible!",
    nuevaPistaTexto: "Puedes abrirla en la pantalla de juego… o seguir a pelo y ganarte el respeto eterno.",
    pistaDisponible1: "Tienes 1 pista disponible.",
    pistasDisponiblesN: "Tienes {n} pistas disponibles.",
    avisoMerito: "Ojo: acertar sin abrir pistas vale más en el ranking. Los valientes no preguntan.",
    abrirPista: "Abrir la pista {n}",
    enhorabuena: "¡¡ENHORABUENA!!",
    acierto: "¡Lo has adivinado! Que redoblen los tambores, que repiquen las campanas y que alguien avise a la prensa: tenemos un oráculo entre nosotros.",
    aLaPrimera: "¡A la primera! ¿Seguro que nadie te ha chivado nada? 🕵️",
    enNIntentos: "Lo has conseguido en {n} intentos.",
    continuar: "Continuar",
    abriendo: "Abriendo el sobre...",
    reintentarCorto: "Reintentar",
    presentamos: "¡Os presentamos a...!",
    altImagen: "La sorpresa",
    secreto: "Ahora, por favor, guarda el secreto. 🤫",
    volverInicio: "Volver al inicio",
    errorTitulo: "¡Vaya!",
    errorTexto: "El oráculo no responde. Comprueba que tienes conexión a internet y vuelve a probar."
  },
  ca: {
    tituloPagina: "Com es dirà?",
    jugadorTitulo: "Qui ets?",
    jugadorIntro: "Abans de res, digues-nos el teu nom i cognom (el cognom és perquè sapiguem qui ets). Apuntarem els teus intents al marcador oficial, per a la glòria o per a la vergonya. 😏",
    jugadorEtiqueta: "El teu nom i cognom",
    jugadorPlaceholder: "Nom i cognom...",
    jugadorEntrar: "A jugar!",
    jugadorComprobando: "Comprovant...",
    jugadorVacio: "Sense nom no hi ha joc. Com et dius?",
    jugadorOcupado: "Ja hi ha algú jugant com a «{nombre}». Afegeix-hi el cognom, un sobrenom o alguna cosa que et distingeixi.",
    jugadorError: "No hem pogut comprovar el teu nom. Revisa la connexió i torna-ho a provar.",
    jugandoComo: "Jugues com a {nombre}.",
    noSoyYo: "No ets tu?",
    avisoSecretoTitulo: "NI UNA PARAULA!",
    avisoSecreto: "Ara que ho saps, no ho diguis a ningú. Ni una pista, ni una inicial, ni una mirada còmplice: que els altres continuïn intentant-ho i puguin jugar també.",
    titulo1: "El Gran Misteri",
    titulo2: "de la Criatura",
    intro1: "Distingidíssim endeví: després de mesos de càbales, apostes clandestines i teories dignes d'un documental de misteri, ha arribat el teu moment de glòria.",
    intro2: "Nen? Nena? Això és secret d'Estat, així que val qualsevol nom. <strong>Escriu el nom que creus que portarà el nadó</strong> i descobreix si ets un autèntic oracle... o un humil aficionat.",
    etiquetaNombre: "Nom",
    placeholder: "Escriu un nom...",
    placeholderVacio: "Cal escriure alguna cosa, eh? 😏",
    adivinar: "Endevina!",
    consultando: "Consultant l'oracle...",
    contador1: "Portes 1 intent. Això just comença.",
    contadorN: "Portes {n} intents.",
    animo: "Ànims!",
    perseverancia: "La perseverança és una virtut. 💪",
    titulosFallo: ["Nooo!", "Gairebé! (mentida)", "Fred, fred!", "Uf, per poc!", "Error!", "Ni de lluny!", "Torna-ho a provar!"],
    reintentar: "Torna-ho a provar",
    pistasTitulo: "🔎 Les teves pistes",
    proximaPista: "Et falten {n} intents per a la pròxima pista. 🔎",
    proximaPista1: "Només 1 intent més per a la pròxima pista! 🔎",
    nuevaPista: "🎁 Nova pista disponible!",
    nuevaPistaTexto: "La pots obrir a la pantalla de joc… o continuar a pèl i guanyar-te el respecte etern.",
    pistaDisponible1: "Tens 1 pista disponible.",
    pistasDisponiblesN: "Tens {n} pistes disponibles.",
    avisoMerito: "Compte: encertar sense obrir pistes val més al rànquing. Els valents no pregunten.",
    abrirPista: "Obre la pista {n}",
    enhorabuena: "ENHORABONA!!",
    acierto: "L'has endevinat! Que redoblin els tambors, que repiquin les campanes i que algú avisi la premsa: tenim un oracle entre nosaltres.",
    aLaPrimera: "A la primera! Segur que ningú t'ho ha xivat? 🕵️",
    enNIntentos: "Ho has aconseguit en {n} intents.",
    continuar: "Continua",
    abriendo: "Obrint el sobre...",
    reintentarCorto: "Torna-hi",
    presentamos: "Us presentem...!",
    altImagen: "La sorpresa",
    secreto: "Ara, si us plau, guarda el secret. 🤫",
    volverInicio: "Torna a l'inici",
    errorTitulo: "Vaja!",
    errorTexto: "L'oracle no respon. Comprova que tens connexió a internet i torna-ho a provar."
  },
  en: {
    tituloPagina: "What will the baby be called?",
    jugadorTitulo: "Who are you?",
    jugadorIntro: "First things first: tell us your first name and surname (the surname is so we know who you are). We'll record your attempts on the official scoreboard, for glory or for shame. 😏",
    jugadorEtiqueta: "Your first name and surname",
    jugadorPlaceholder: "First name and surname...",
    jugadorEntrar: "Let's play!",
    jugadorComprobando: "Checking...",
    jugadorVacio: "No name, no game. What's your name?",
    jugadorOcupado: "Someone is already playing as “{nombre}”. Add your surname, a nickname or something that sets you apart.",
    jugadorError: "We couldn't check your name. Check your connection and try again.",
    jugandoComo: "Playing as {nombre}.",
    noSoyYo: "Not you?",
    avisoSecretoTitulo: "NOT A WORD!",
    avisoSecreto: "Now that you know, don't tell anyone. Not a hint, not an initial, not a knowing look: let everyone else keep guessing so they can play too.",
    titulo1: "The Great Mystery",
    titulo2: "of the Little One",
    intro1: "Most distinguished guesser: after months of speculation, secret bets and theories worthy of a true-crime documentary, your moment of glory has arrived.",
    intro2: "Boy? Girl? That's a state secret, so any name goes. <strong>Type the name you think the baby will have</strong> and find out whether you're a true oracle... or a humble amateur.",
    etiquetaNombre: "Name",
    placeholder: "Type a name...",
    placeholderVacio: "You have to type something, you know? 😏",
    adivinar: "Guess!",
    consultando: "Consulting the oracle...",
    contador1: "1 attempt so far. We're just getting started.",
    contadorN: "{n} attempts so far.",
    animo: "Keep going!",
    perseverancia: "Perseverance is a virtue. 💪",
    titulosFallo: ["Nooo!", "Close! (not really)", "Cold, cold!", "Oops, so close!", "Wrong!", "Not even close!", "Try again!"],
    reintentar: "Try again",
    pistasTitulo: "🔎 Your clues",
    proximaPista: "{n} more attempts until the next clue. 🔎",
    proximaPista1: "Just 1 more attempt until the next clue! 🔎",
    nuevaPista: "🎁 New clue available!",
    nuevaPistaTexto: "You can open it on the game screen… or carry on without help and earn eternal respect.",
    pistaDisponible1: "You have 1 clue available.",
    pistasDisponiblesN: "You have {n} clues available.",
    avisoMerito: "Heads up: guessing without opening clues counts for more in the leaderboard. The brave don't ask.",
    abrirPista: "Open clue {n}",
    enhorabuena: "CONGRATULATIONS!!",
    acierto: "You guessed it! Let the drums roll, let the bells ring and somebody call the press: we have an oracle among us.",
    aLaPrimera: "First try! Are you sure nobody tipped you off? 🕵️",
    enNIntentos: "You got it in {n} attempts.",
    continuar: "Continue",
    abriendo: "Opening the envelope...",
    reintentarCorto: "Retry",
    presentamos: "Please welcome...!",
    altImagen: "The surprise",
    secreto: "Now, please, keep the secret. 🤫",
    volverInicio: "Back to the start",
    errorTitulo: "Oops!",
    errorTexto: "The oracle isn't answering. Check your internet connection and try again."
  }
};

const IDIOMAS = Object.keys(I18N_UI);

// Idioma del enlace, el elegido a mano, el del navegador/sistema, o castellano.
function detectarIdioma() {
  // Un enlace con ?lang=en (o ca, es) manda sobre todo lo demás y se recuerda.
  try {
    const delEnlace = new URLSearchParams(location.search).get("lang");
    if (delEnlace && IDIOMAS.includes(delEnlace.toLowerCase())) {
      try { localStorage.setItem("idioma", delEnlace.toLowerCase()); } catch (e) {}
      return delEnlace.toLowerCase();
    }
  } catch (e) {}
  try {
    const guardado = localStorage.getItem("idioma");
    if (IDIOMAS.includes(guardado)) return guardado;
  } catch (e) {}
  const preferidos = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
  for (const l of preferidos) {
    const base = String(l).toLowerCase().split(/[-_]/)[0];
    if (IDIOMAS.includes(base)) return base;
    if (base === "va") return "ca"; // valenciano
  }
  return "es";
}
