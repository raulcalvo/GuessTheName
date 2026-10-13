// Guarda jugadores e intentos en Firestore (o solo en este navegador si no hay Firebase).
// Nunca se guarda el texto del intento ganador, para que el nombre no se filtre por la base de datos.
import { FIREBASE_CONFIG } from "./firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const TIEMPO_MAXIMO = 15000;

let fb = null; // { db, uid, f } cuando Firebase está disponible
const yaAcertado = new Set(); // para no cambiar el resultado del ranking si vuelve a acertar

const conLimite = (promesa) => Promise.race([
  promesa,
  new Promise((_, rechazar) => setTimeout(() => rechazar(new Error("timeout")), TIEMPO_MAXIMO))
]);

// "José Pérez" -> "jose-perez"
export const idJugador = (nombre) => {
  const id = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  // Nombres sin letras latinas (otros alfabetos, emojis): usamos sus códigos.
  return id || ("u-" + Array.from(nombre.trim(), (c) => c.codePointAt(0).toString(36)).join("-")).slice(0, 60);
};

const iniciar = (async () => {
  if (!FIREBASE_CONFIG) return false;
  try {
    const [app, auth, f] = await conLimite(Promise.all([
      import(SDK + "firebase-app.js"),
      import(SDK + "firebase-auth.js"),
      import(SDK + "firebase-firestore.js")
    ]));
    const appFb = app.initializeApp(FIREBASE_CONFIG);
    const autenticacion = auth.getAuth(appFb);
    // Long polling en vez de WebChannel: funciona también dentro de los navegadores
    // de WhatsApp/Instagram y detrás de redes o bloqueadores que cortan el streaming.
    const db = f.initializeFirestore(appFb, { experimentalForceLongPolling: true });
    // Solo para pruebas en local: http://localhost:xxxx/?emulador
    if (location.hostname === "localhost" && new URLSearchParams(location.search).has("emulador")) {
      auth.connectAuthEmulator(autenticacion, "http://localhost:9099", { disableWarnings: true });
      f.connectFirestoreEmulator(db, "localhost", 8080);
    }
    const credencial = await conLimite(auth.signInAnonymously(autenticacion));
    fb = { db, uid: credencial.user.uid, f };
    return true;
  } catch (e) {
    console.warn("Firebase no disponible, se juega sin guardar en la nube.", e);
    return false;
  }
})();

export const enLaNube = () => iniciar;

// Devuelve { estado: "nuevo" | "mio" | "ocupado", intentos, acertado }
export async function reclamarJugador(nombre, idioma) {
  try {
    return await reclamarJugadorUnaVez(nombre, idioma);
  } catch (e) {
    console.warn("Reintentando el registro del jugador", e);
    return reclamarJugadorUnaVez(nombre, idioma);
  }
}

async function reclamarJugadorUnaVez(nombre, idioma) {
  const id = idJugador(nombre);
  if (!(await iniciar)) return { estado: "mio", intentos: intentosLocales(id), acertado: false, pistasAbiertas: 0 };

  const { db, uid, f } = fb;
  const ref = f.doc(db, "jugadores", id);
  const r = await conLimite(f.runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      tx.set(ref, {
        nombre: nombre.trim().replace(/\s+/g, " ").slice(0, 60),
        uid,
        idioma,
        intentos: 0,
        acertado: false,
        creado: f.serverTimestamp(),
        actualizado: f.serverTimestamp()
      });
      return { estado: "nuevo", intentos: 0, acertado: false, pistasAbiertas: 0 };
    }
    const datos = snap.data();
    if (datos.uid !== uid) return { estado: "ocupado" };
    if (datos.acertado) yaAcertado.add(id);
    return { estado: "mio", intentos: datos.intentos || 0, acertado: !!datos.acertado, acertadoEn: datos.acertadoEn || null, pistasAbiertas: datos.pistasAbiertas || 0, pistaFinal: !!datos.pistaFinal };
  }));
  // Las reglas solo dejan leer las pistas si saben con qué ficha juega este dispositivo.
  if (r.estado !== "ocupado") {
    await conLimite(f.setDoc(f.doc(db, "uids", uid), { jugador: id }))
      .catch((e) => console.warn("No se pudo vincular el dispositivo", e));
  }
  return r;
}

export function registrarIntento(nombreJugador, { texto, numero, acierto, idioma }) {
  const id = idJugador(nombreJugador);
  try { localStorage.setItem("intentos:" + id, String(numero)); } catch (e) {}
  if (!fb) return;

  const { db, f } = fb;
  const ref = f.doc(db, "jugadores", id);
  const lote = f.writeBatch(db);
  lote.set(f.doc(f.collection(ref, "intentos")), {
    numero,
    texto: acierto ? "✓" : texto.slice(0, 60),
    acierto,
    idioma,
    fecha: f.serverTimestamp()
  });
  const cambios = { intentos: f.increment(1), actualizado: f.serverTimestamp() };
  if (acierto && !yaAcertado.has(id)) {
    yaAcertado.add(id);
    Object.assign(cambios, { acertado: true, acertadoEn: numero, acertadoFecha: f.serverTimestamp() });
  }
  lote.update(ref, cambios);
  // Firestore reintenta solo si no hay conexión; no hace falta esperar.
  lote.commit().catch((e) => console.warn("No se pudo guardar el intento", e));
}

function intentosLocales(id) {
  try { return parseInt(localStorage.getItem("intentos:" + id) || "0", 10) || 0; } catch (e) { return 0; }
}

// Todos los jugadores con al menos un intento: primero los que han acertado
// (menos pistas abiertas primero, luego menos intentos y, a igualdad, quien acertó antes)
// y luego los que siguen probando.
// Pistas que cuentan en el ranking: las abiertas más la última, si la vio.
export const pistasUsadas = (j) => (j.pistasAbiertas || 0) + (j.pistaFinal ? 1 : 0);

// Quien acierta en tan pocos intentos, probablemente ya lo sabía.
export const MAX_SOSPECHOSO = 3;

export async function obtenerRanking() {
  if (!(await iniciar)) return null;
  const { db, f } = fb;
  const snap = await conLimite(f.getDocs(f.collection(db, "jugadores")));
  return ordenarRanking(snap);
}

// Igual que obtenerRanking, pero avisa cada vez que cambia algo. Firestore solo
// vuelve a leer los jugadores que cambian, así que gasta muy pocas lecturas.
export async function escucharRanking(alCambiar, alFallar) {
  if (!(await iniciar)) { alFallar(new Error("Sin conexión con Firebase")); return () => {}; }
  const { db, f } = fb;
  return f.onSnapshot(f.collection(db, "jugadores"), (snap) => alCambiar(ordenarRanking(snap)), alFallar);
}

function ordenarRanking(snap) {
  const ms = (t) => (t && t.toMillis ? t.toMillis() : Infinity);
  const jugadores = snap.docs.map((d) => d.data()).filter((j) => (j.intentos || 0) > 0);
  const ganadores = jugadores.filter((j) => j.acertado)
    .sort((a, b) => pistasUsadas(a) - pistasUsadas(b)
      || (a.acertadoEn || a.intentos) - (b.acertadoEn || b.intentos)
      || ms(a.acertadoFecha) - ms(b.acertadoFecha));
  const pendientes = jugadores.filter((j) => !j.acertado)
    .sort((a, b) => a.intentos - b.intentos || ms(a.creado) - ms(b.creado));
  return { ganadores, pendientes };
}

// Comprueba un nombre contra Firestore. Los documentos se buscan por una huella
// SHA-256 del nombre normalizado, así que ni el repositorio ni la base de datos
// contienen la lista de nombres. Devuelve { acierto, secreto?, frase? }.
const SAL = "guessthename:v2:";
const normalizarNombre = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-zñ]/g, "");

async function huella(texto) {
  const datos = new TextEncoder().encode(SAL + normalizarNombre(texto));
  const resumen = new Uint8Array(await crypto.subtle.digest("SHA-256", datos));
  return Array.from(resumen, (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function consultarNombre(candidatos) {
  if (!(await iniciar)) throw new Error("Sin conexión con Firebase");
  const { db, f } = fb;
  const huellas = await Promise.all(candidatos.map(huella));
  const leer = (coleccion, h) => f.getDoc(f.doc(db, coleccion, h)).then((d) => (d.exists() ? d.data() : null));
  const [secretos, frases] = await conLimite(Promise.all([
    Promise.all(huellas.map((h) => leer("secreto", h))),
    Promise.all(huellas.map((h) => leer("frases", h)))
  ]));
  const secreto = secretos.find(Boolean);
  if (secreto) return { acierto: true, secreto };
  return { acierto: false, frase: frases.find(Boolean) || null };
}

// Pistas: se desbloquean al llegar a estos fallos. El texto está en Firestore
// (pistas/p1…p7, {es, ca, en}) para que el repositorio no dé pistas a nadie.
export const UMBRALES_PISTAS = [25, 35, 45, 60, 75, 90, 110];
export const pistasDesbloqueadas = (fallos) => UMBRALES_PISTAS.filter((u) => fallos >= u).length;

// Abre la siguiente pista (siempre en orden) y la apunta en la ficha del jugador.
export async function abrirPista(nombreJugador, indice) {
  if (fb) {
    const { db, f } = fb;
    await conLimite(f.updateDoc(f.doc(db, "jugadores", idJugador(nombreJugador)), {
      pistasAbiertas: indice + 1,
      actualizado: f.serverTimestamp()
    }));
  }
  return obtenerPista(indice);
}

const pistasLeidas = new Map();
export async function obtenerPista(indice) {
  if (pistasLeidas.has(indice)) return pistasLeidas.get(indice);
  if (!(await iniciar)) return null;
  const { db, f } = fb;
  try {
    const d = await conLimite(f.getDoc(f.doc(db, "pistas", "p" + (indice + 1))));
    const pista = d.exists() ? d.data() : null;
    if (pista) pistasLeidas.set(indice, pista);
    return pista;
  } catch (e) {
    console.warn("No se pudo leer la pista", indice + 1, e);
    return null;
  }
}

// Última pista: a los 200 intentos se enseñan las letras del nombre desordenadas.
// Están en Firestore (pistas/final) y las reglas no las dejan leer antes.
export const UMBRAL_PISTA_FINAL = 200;
let letrasFinales = null;
export async function obtenerPistaFinal() {
  if (letrasFinales) return letrasFinales;
  if (!(await iniciar)) return null;
  const { db, f } = fb;
  try {
    const d = await conLimite(f.getDoc(f.doc(db, "pistas", "final")));
    letrasFinales = d.exists() ? d.data().letras || null : null;
    return letrasFinales;
  } catch (e) {
    console.warn("No se pudo leer la última pista", e);
    return null;
  }
}

export async function marcarPistaFinal(nombreJugador) {
  if (!fb) return;
  const { db, f } = fb;
  await conLimite(f.updateDoc(f.doc(db, "jugadores", idJugador(nombreJugador)), {
    pistaFinal: true,
    actualizado: f.serverTimestamp()
  })).catch((e) => console.warn("No se pudo apuntar la última pista", e));
}
