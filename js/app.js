// Importación tolerante: si el navegador aún tiene en caché una versión vieja de
// almacen.js, lo que falte llega como undefined en vez de romper todo el juego.
import * as almacen from "./almacen.js";
const { reclamarJugador, registrarIntento, consultarNombre, UMBRALES_PISTAS, pistasDesbloqueadas, obtenerPista, abrirPista, obtenerRanking } = almacen;
const MAX_SOSPECHOSO = almacen.MAX_SOSPECHOSO || 3;
const UMBRAL_PISTA_FINAL = almacen.UMBRAL_PISTA_FINAL || 200;
const pistasUsadas = (j) => (j.pistasAbiertas || 0) + (j.pistaFinal ? 1 : 0);

(() => {
  "use strict";

  // El nombre bueno no está en el repositorio: se comprueba contra Firestore,
  // que solo devuelve la clave de la foto cifrada cuando se acierta.
  const IMAGEN = "assets/sorpresa.bin";

  const $ = (id) => document.getElementById(id);
  const pantallas = ["pantalla-jugador", "pantalla-juego", "pantalla-fallo", "pantalla-acierto", "pantalla-sorpresa", "pantalla-ya-acertado"];
  const input = $("nombre");
  const botonAdivinar = $("boton-adivinar");

  // Quita tildes, mayúsculas, espacios y todo lo que no sean letras.
  const normalizar = (s) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-zñ]/g, "");

  const capitalizar = (s) =>
    s.trim().replace(/\s+/g, " ").toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

  const hexABytes = (hex) => new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));

  // ---------- Idioma ----------
  let idioma = detectarIdioma();
  const T = (clave) => I18N_UI[idioma][clave];


  // ---------- Jugador e intentos ----------
  let jugador = null;
  try { jugador = localStorage.getItem("jugador"); } catch (e) {}
  let intentos = 0;
  let pistasAbiertas = 0;
  let pistaFinal = false;
  let acertado = false;
  let acertadoEn = null;
  const pintarContador = () => {
    $("contador").textContent = intentos === 0 ? ""
      : intentos === 1 ? T("contador1")
      : `${T("contadorN").replace("{n}", intentos)} ${intentos >= 10 ? T("perseverancia") : T("animo")}`;
  };

  // ---------- Posición provisional ----------
  // Dónde quedaría el jugador si acertara en el próximo intento. El ranking se
  // pide como mucho una vez por minuto.
  let ranking = null, rankingPedido = 0;
  async function pintarPosicion() {
    const el = $("posicion-provisional");
    if (!jugador || acertado) { el.hidden = true; return; }
    if (Date.now() - rankingPedido > 60000) {
      rankingPedido = Date.now();
      try { ranking = await obtenerRanking(); } catch (e) { console.warn(e); }
    }
    if (!ranking || !jugador || acertado) { el.hidden = true; return; }
    const n = intentos + 1;
    if (n <= MAX_SOSPECHOSO) {
      el.textContent = T("posicionSospechoso");
    } else {
      const rivales = ranking.ganadores.filter((j) => j.nombre !== jugador && (j.acertadoEn || j.intentos) > MAX_SOSPECHOSO);
      const mias = pistasAbiertas + (pistaFinal ? 1 : 0);
      const delante = rivales.filter((j) => pistasUsadas(j) < mias
        || (pistasUsadas(j) === mias && (j.acertadoEn || j.intentos) < n)).length;
      el.textContent = delante === 0 ? T("posicionPrimero")
        : T("posicion").replace("{pos}", delante + 1).replace("{total}", rivales.length + 1);
    }
    el.hidden = false;
  }

  // ---------- Pistas ----------
  const textoPista = (p) => p[idioma] || p.es;

  async function pintarPistas() {
    const n = pistasDesbloqueadas(intentos);
    const abiertas = Math.min(pistasAbiertas, n);
    const pistas = (await Promise.all(Array.from({ length: abiertas }, (_, i) => obtenerPista(i)))).filter(Boolean);
    const lista = $("lista-pistas");
    lista.replaceChildren(...pistas.map((p) => {
      const li = document.createElement("li");
      li.textContent = textoPista(p);
      return li;
    }));
    const letras = pistaFinal && !acertado && almacen.obtenerPistaFinal ? await almacen.obtenerPistaFinal() : null;
    if (letras) {
      const li = document.createElement("li");
      li.className = "pista-final-lista";
      li.textContent = T("pistaFinalLista").replace("{letras}", Array.from(letras).join(" "));
      lista.append(li);
    }
    // Pistas desbloqueadas pero sin abrir: el jugador decide.
    const disponibles = acertado ? 0 : n - abiertas;
    $("ofrecer-pista").hidden = disponibles === 0;
    if (disponibles) {
      $("pistas-disponibles").textContent = disponibles === 1 ? T("pistaDisponible1") : T("pistasDisponiblesN").replace("{n}", disponibles);
      $("boton-abrir-pista").textContent = T("abrirPista").replace("{n}", abiertas + 1);
    }
    $("pistas").hidden = pistas.length === 0 && disponibles === 0 && !letras;
    pintarPosicion();
    const faltan = n < UMBRALES_PISTAS.length ? UMBRALES_PISTAS[n] - intentos : 0;
    $("proxima-pista").textContent = !jugador || !faltan ? ""
      : faltan === 1 ? T("proximaPista1") : T("proximaPista").replace("{n}", faltan);
  }

  $("boton-abrir-pista").addEventListener("click", async () => {
    const boton = $("boton-abrir-pista");
    boton.disabled = true;
    try {
      await abrirPista(jugador, pistasAbiertas);
      pistasAbiertas++;
    } catch (e) {
      console.error(e);
    } finally {
      boton.disabled = false;
      pintarPistas();
    }
  });

  function aplicarIdioma(nuevo) {
    idioma = nuevo;
    document.documentElement.lang = idioma;
    document.title = T("tituloPagina");
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = T(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = T(el.dataset.i18nHtml); });
    input.placeholder = T("placeholder");
    $("jugador").placeholder = T("jugadorPlaceholder");
    if (jugador) $("jugando-como").textContent = T("jugandoComo").replace("{nombre}", jugador);
    pintarYaAcertado();
    $("aviso-jugador").textContent = "";
    $("imagen-sorpresa").alt = T("altImagen");
    document.querySelectorAll("[data-idioma]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.idioma === idioma)));
    pintarContador();
    pintarPistas();
  }

  document.querySelectorAll("[data-idioma]").forEach((b) => b.addEventListener("click", () => {
    try { localStorage.setItem("idioma", b.dataset.idioma); } catch (e) {}
    aplicarIdioma(b.dataset.idioma);
    // Si estamos viendo un fallo, la frase se queda en el idioma anterior; volvemos a jugar.
    if ($("pantalla-fallo").classList.contains("activa")) mostrar("pantalla-juego");
  }));

  // ---------- Navegación ----------
  function mostrar(id) {
    pantallas.forEach((p) => $(p).classList.toggle("activa", p === id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- Foto sorpresa ----------
  let secreto = null; // { clave, iv, tipo } que da Firestore al acertar

  async function descifrarImagen() {
    const clave = await crypto.subtle.importKey("raw", hexABytes(secreto.clave), "AES-GCM", false, ["decrypt"]);
    const datos = await (await fetch(IMAGEN)).arrayBuffer();
    const claro = await crypto.subtle.decrypt({ name: "AES-GCM", iv: hexABytes(secreto.iv) }, clave, datos);
    return URL.createObjectURL(new Blob([claro], { type: secreto.tipo || "image/jpeg" }));
  }

  // ---------- Respuestas graciosas ----------
  let ultimaGenerica = -1;
  function respuestaGenerica(nombreBonito) {
    const lista = I18N_GENERICAS[idioma] || I18N_GENERICAS.es;
    let i;
    do { i = Math.floor(Math.random() * lista.length); } while (i === ultimaGenerica);
    ultimaGenerica = i;
    return lista[i].replace(/\{nombre\}/g, nombreBonito);
  }

  const emojisFallo = ["🙈", "😅", "🤭", "🙃", "😬", "🤔", "🧐"];
  const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];

  // ---------- Quien vuelve después de acertar ----------
  // La clave de la foto solo la da Firestore al acertar; se guarda en este
  // dispositivo para poder volver a verla.
  const leerSecretoGuardado = () => {
    try { return JSON.parse(localStorage.getItem("secreto") || "null"); } catch (e) { return null; }
  };

  function pintarYaAcertado() {
    if (!jugador || !acertado) return;
    const n = acertadoEn || intentos;
    const veces = n === 1 ? T("vecesPrimera") : T("vecesN").replace("{n}", n);
    document.querySelector("#pantalla-ya-acertado .jugando-como-texto").textContent = T("jugandoComo").replace("{nombre}", jugador);
    $("texto-ya-acertado").textContent = T("yaAcertado").replace("{nombre}", jugador.split(" ")[0]).replace("{veces}", veces);
    $("boton-ver-foto").hidden = !(secreto || leerSecretoGuardado());
    pintarPosicionFinal();
  }

  // Puesto en el ranking, con el mismo criterio que la página del ranking.
  let posicionFinal = null;
  async function calcularPosicionFinal() {
    try {
      const r = await obtenerRanking();
      const yo = r && r.ganadores.find((j) => j.nombre === jugador);
      if (!yo) return null;
      const n = (j) => j.acertadoEn || j.intentos;
      if (n(yo) <= MAX_SOSPECHOSO) return { sospechoso: true };
      const tabla = r.ganadores.filter((j) => n(j) > MAX_SOSPECHOSO);
      const pistas = pistasUsadas;
      const pos = 1 + tabla.filter((j) => pistas(j) < pistas(yo) || (pistas(j) === pistas(yo) && n(j) < n(yo))).length;
      return { pos, total: tabla.length };
    } catch (e) {
      console.warn(e);
      return null;
    }
  }

  function pintarPosicionFinal() {
    const p = posicionFinal;
    $("posicion-final").hidden = !p;
    if (!p) return;
    if (p.sospechoso) {
      $("posicion-final-puesto").textContent = "";
      $("posicion-final-frase").textContent = T("fraseSospechoso");
      return;
    }
    const { pos, total } = p;
    $("posicion-final-puesto").textContent = T("posFinal").replace("{pos}", pos).replace("{total}", total);
    const frase = pos === 1 ? "fraseOro"
      : pos <= 3 ? "frasePodio"
      : pos <= Math.ceil(total / 2) ? "fraseBien"
      : pos === total ? "fraseUltimo"
      : "fraseRegular";
    $("posicion-final-frase").textContent = T(frase);
  }

  async function mostrarYaAcertado() {
    pintarYaAcertado();
    mostrar("pantalla-ya-acertado");
    posicionFinal = await calcularPosicionFinal();
    pintarYaAcertado();
  }

  $("boton-ver-foto").addEventListener("click", async () => {
    const boton = $("boton-ver-foto");
    boton.disabled = true;
    try {
      if (!secreto) secreto = leerSecretoGuardado();
      $("imagen-sorpresa").src = await descifrarImagen();
      mostrar("pantalla-sorpresa");
    } catch (e) {
      console.error(e);
    } finally {
      boton.disabled = false;
    }
  });

  // ---------- Quién juega ----------
  async function entrar(nombre, silencioso) {
    const boton = $("boton-jugador");
    boton.disabled = true;
    boton.textContent = T("jugadorComprobando");
    $("aviso-jugador").textContent = "";
    try {
      const r = await reclamarJugador(nombre, idioma);
      if (r.estado === "ocupado") {
        if (!silencioso) {
          $("aviso-jugador").textContent = T("jugadorOcupado").replace("{nombre}", nombre);
          $("jugador").focus();
        }
        return false;
      }
      jugador = nombre;
      try { localStorage.setItem("jugador", nombre); } catch (e) {}
      intentos = r.intentos || 0;
      pistasAbiertas = r.pistasAbiertas || 0;
      pistaFinal = !!r.pistaFinal;
      acertado = !!r.acertado;
      acertadoEn = r.acertadoEn || null;
      $("jugando-como").textContent = T("jugandoComo").replace("{nombre}", jugador);
      pintarContador();
      pintarPistas();
      if (acertado) mostrarYaAcertado();
      else {
        mostrar("pantalla-juego");
        comprobarPistaFinal();
      }
      return true;
    } catch (e) {
      console.error(e);
      if (!silencioso) $("aviso-jugador").textContent = `${T("jugadorError")} (${e.code || e.message || e})`;
      return false;
    } finally {
      boton.disabled = false;
      boton.textContent = T("jugadorEntrar");
    }
  }

  $("formulario-jugador").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const nombre = $("jugador").value.trim().replace(/\s+/g, " ");
    if (!/[\p{L}\p{N}]/u.test(nombre)) {
      $("aviso-jugador").textContent = T("jugadorVacio");
      return;
    }
    entrar(nombre, false);
  });

  const noSoyYo = () => {
    jugador = null;
    intentos = 0;
    pistasAbiertas = 0;
    pistaFinal = false;
    acertado = false;
    acertadoEn = null;
    secreto = null;
    posicionFinal = null;
    try { localStorage.removeItem("jugador"); localStorage.removeItem("secreto"); } catch (e) {}
    $("jugador").value = "";
    pintarContador();
    pintarPistas();
    mostrar("pantalla-jugador");
    $("jugador").focus();
  };
  $("boton-no-soy-yo").addEventListener("click", noSoyYo);
  $("boton-no-soy-yo-2").addEventListener("click", noSoyYo);

  // ---------- Juego ----------
  $("formulario").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const texto = input.value.trim();
    const clave = normalizar(texto);

    if (!clave) {
      input.value = "";
      input.placeholder = T("placeholderVacio");
      input.focus();
      return;
    }

    botonAdivinar.disabled = true;
    botonAdivinar.textContent = T("consultando");

    try {
      // También aceptamos el nombre si viene acompañado de apellidos.
      const primeraPalabra = texto.split(/\s+/)[0];
      const r = await consultarNombre(primeraPalabra !== texto ? [texto, primeraPalabra] : [texto]);
      const acierto = r.acierto;
      intentos++;
      if (acierto) {
        secreto = r.secreto;
        acertado = true;
        acertadoEn = intentos;
        try { localStorage.setItem("secreto", JSON.stringify(secreto)); } catch (e) {}
      }
      registrarIntento(jugador, { texto, numero: intentos, acierto, idioma });

      if (acierto) {
        $("intentos-acierto").textContent = intentos === 1
          ? T("aLaPrimera")
          : T("enNIntentos").replace("{n}", intentos);
        mostrar("pantalla-acierto");
        lanzarConfeti();
      } else {
        const bonito = capitalizar(texto);
        const frase = (r.frase && (r.frase[idioma] || r.frase.es)) || respuestaGenerica(bonito);
        $("titulo-fallo").textContent = azar(T("titulosFallo"));
        document.querySelector("#pantalla-fallo .emoji-grande").textContent = azar(emojisFallo);
        $("texto-fallo").textContent = frase;
        // ¿Este fallo desbloquea una pista? Se avisa, pero abrirla es decisión del jugador.
        $("nueva-pista").hidden = !UMBRALES_PISTAS.includes(intentos) || acertado;
        mostrar("pantalla-fallo");
      }
    } catch (e) {
      console.error(e);
      $("titulo-fallo").textContent = T("errorTitulo");
      $("texto-fallo").textContent = T("errorTexto");
      mostrar("pantalla-fallo");
    } finally {
      botonAdivinar.disabled = false;
      botonAdivinar.textContent = T("adivinar");
      pintarContador();
      pintarPistas();
    }
  });

  $("boton-reintentar").addEventListener("click", () => {
    input.value = "";
    mostrar("pantalla-juego");
    if (!comprobarPistaFinal()) input.focus();
  });

  // ---------- Última pista: a los 200 intentos ----------
  // Se enseña una sola vez a pantalla completa; luego queda en la lista de pistas.
  function comprobarPistaFinal() {
    if (!jugador || acertado || pistaFinal || intentos < UMBRAL_PISTA_FINAL || !almacen.obtenerPistaFinal) return false;
    mostrarPistaFinal();
    return true;
  }

  async function mostrarPistaFinal() {
    const letras = await almacen.obtenerPistaFinal();
    if (!letras) return;
    pistaFinal = true;
    almacen.marcarPistaFinal(jugador);
    $("pista-final-letras").replaceChildren(...Array.from(letras, (l) => {
      const span = document.createElement("span");
      span.textContent = l;
      return span;
    }));
    $("pista-final").hidden = false;
    lanzarConfeti();
    pintarPistas();
  }

  $("boton-pista-final").addEventListener("click", () => {
    $("pista-final").hidden = true;
    input.focus();
  });

  $("boton-continuar").addEventListener("click", async () => {
    const boton = $("boton-continuar");
    boton.disabled = true;
    boton.textContent = T("abriendo");
    let ok = false;
    try {
      $("imagen-sorpresa").src = await descifrarImagen();
      ok = true;
      mostrar("pantalla-sorpresa");
      lanzarConfeti();
    } catch (e) {
      console.error(e);
    } finally {
      boton.disabled = false;
      boton.textContent = ok ? T("continuar") : T("reintentarCorto");
    }
  });

  $("boton-otra-vez").addEventListener("click", () => {
    input.value = "";
    if (acertado) mostrarYaAcertado();
    else mostrar("pantalla-juego");
  });

  aplicarIdioma(idioma);
  if (jugador) {
    $("jugador").value = jugador;
    entrar(jugador, true);
  }

  // ---------- Confeti ----------
  const lienzo = $("confeti");
  const ctx = lienzo.getContext("2d");
  let piezas = [];
  let animando = false;

  function lanzarConfeti() {
    lienzo.width = innerWidth * devicePixelRatio;
    lienzo.height = innerHeight * devicePixelRatio;
    const colores = ["#f7a8c4", "#8ec5ff", "#ffd36e", "#a8e6cf", "#c3a6ff", "#ff8b94"];
    for (let i = 0; i < 180; i++) {
      piezas.push({
        x: Math.random() * lienzo.width,
        y: -Math.random() * lienzo.height * 0.5,
        vx: (Math.random() - 0.5) * 4 * devicePixelRatio,
        vy: (2 + Math.random() * 4) * devicePixelRatio,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        w: (6 + Math.random() * 8) * devicePixelRatio,
        h: (4 + Math.random() * 6) * devicePixelRatio,
        c: colores[Math.floor(Math.random() * colores.length)]
      });
    }
    if (!animando) { animando = true; requestAnimationFrame(paso); }
  }

  function paso() {
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    piezas = piezas.filter((p) => p.y < lienzo.height + 20);
    for (const p of piezas) {
      p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vy += 0.03 * devicePixelRatio;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (piezas.length) requestAnimationFrame(paso);
    else { animando = false; ctx.clearRect(0, 0, lienzo.width, lienzo.height); }
  }

  // ---------- PWA ----------
  if ("serviceWorker" in navigator) {
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
