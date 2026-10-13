import { reclamarJugador, registrarIntento, consultarNombre } from "./almacen.js";

(() => {
  "use strict";

  // El nombre bueno no está en el repositorio: se comprueba contra Firestore,
  // que solo devuelve la clave de la foto cifrada cuando se acierta.
  const IMAGEN = "assets/sorpresa.bin";

  const $ = (id) => document.getElementById(id);
  const pantallas = ["pantalla-jugador", "pantalla-juego", "pantalla-fallo", "pantalla-acierto", "pantalla-sorpresa"];
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
  const pintarContador = () => {
    $("contador").textContent = intentos === 0 ? ""
      : intentos === 1 ? T("contador1")
      : `${T("contadorN").replace("{n}", intentos)} ${intentos >= 10 ? T("perseverancia") : T("animo")}`;
  };

  function aplicarIdioma(nuevo) {
    idioma = nuevo;
    document.documentElement.lang = idioma;
    document.title = T("tituloPagina");
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = T(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = T(el.dataset.i18nHtml); });
    input.placeholder = T("placeholder");
    $("jugador").placeholder = T("jugadorPlaceholder");
    if (jugador) $("jugando-como").textContent = T("jugandoComo").replace("{nombre}", jugador);
    $("aviso-jugador").textContent = "";
    $("imagen-sorpresa").alt = T("altImagen");
    document.querySelectorAll("[data-idioma]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.idioma === idioma)));
    pintarContador();
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
      $("jugando-como").textContent = T("jugandoComo").replace("{nombre}", jugador);
      pintarContador();
      mostrar("pantalla-juego");
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

  $("boton-no-soy-yo").addEventListener("click", () => {
    jugador = null;
    intentos = 0;
    try { localStorage.removeItem("jugador"); } catch (e) {}
    $("jugador").value = "";
    pintarContador();
    mostrar("pantalla-jugador");
    $("jugador").focus();
  });

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
      if (acierto) secreto = r.secreto;
      intentos++;
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
    }
  });

  $("boton-reintentar").addEventListener("click", () => {
    input.value = "";
    mostrar("pantalla-juego");
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
    mostrar("pantalla-juego");
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
