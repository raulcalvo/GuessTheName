// Guarda jugadores e intentos en Firestore (o solo en este navegador si no hay Firebase).
// Nunca se guarda el texto del intento ganador, para que el nombre no se filtre por la base de datos.
import { FIREBASE_CONFIG } from "./firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const TIEMPO_MAXIMO = 8000;

let fb = null; // { db, uid, f } cuando Firebase está disponible
const yaAcertado = new Set(); // para no cambiar el resultado del ranking si vuelve a acertar

const conLimite = (promesa) => Promise.race([
  promesa,
  new Promise((_, rechazar) => setTimeout(() => rechazar(new Error("timeout")), TIEMPO_MAXIMO))
]);

// "José Pérez" -> "jose-perez"
export const idJugador = (nombre) =>
  nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

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
    const db = f.getFirestore(appFb);
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
  const id = idJugador(nombre);
  if (!(await iniciar)) return { estado: "mio", intentos: intentosLocales(id), acertado: false };

  const { db, uid, f } = fb;
  const ref = f.doc(db, "jugadores", id);
  return conLimite(f.runTransaction(db, async (tx) => {
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
      return { estado: "nuevo", intentos: 0, acertado: false };
    }
    const datos = snap.data();
    if (datos.uid !== uid) return { estado: "ocupado" };
    if (datos.acertado) yaAcertado.add(id);
    return { estado: "mio", intentos: datos.intentos || 0, acertado: !!datos.acertado };
  }));
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
// (menos intentos primero; a igualdad, quien acertó antes) y luego los que siguen probando.
export async function obtenerRanking() {
  if (!(await iniciar)) return null;
  const { db, f } = fb;
  const snap = await conLimite(f.getDocs(f.collection(db, "jugadores")));
  const ms = (t) => (t && t.toMillis ? t.toMillis() : Infinity);
  const jugadores = snap.docs.map((d) => d.data()).filter((j) => (j.intentos || 0) > 0);
  const ganadores = jugadores.filter((j) => j.acertado)
    .sort((a, b) => (a.acertadoEn || a.intentos) - (b.acertadoEn || b.intentos) || ms(a.acertadoFecha) - ms(b.acertadoFecha));
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
