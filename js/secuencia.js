/* Los pasos de cada pieza de "cómo lo hacemos".

   Cada bloque [data-secuencia] cuenta un trabajo en dos, tres o cuatro pasos
   sobre una imagen (los cuenta por sus textos).
   Este script solo decide en qué paso se está y lo apunta en el bloque: las
   clases p1, p2, p3 (y p4) de los que ya han llegado y data-paso (el que se ve).
   Lo que cambia en la imagen con cada paso está en la hoja de estilos.

   Hay dos maneras de avanzar:
     - Con el scroll (lo normal). El bloque es alto y lo de dentro se queda fijo
       bajo la cabecera (position:sticky). El scroll es el del navegador: ni se
       frena ni se secuestra.
     - Solos (data-secuencia="auto"). Los pasos se suceden mientras la imagen
       está a la vista; cada paso de la lista [data-sec-pasos] es un botón y hay
       un botón de pausa [data-sec-pausa]. La plantilla no lo usa todavía.

   La pieza "desmontada" depende de la clase sec-si del <html>, que pone un
   script de la cabecera. Sin ella (sin JavaScript, con movimiento reducido, al
   imprimir, o si aquí algo falla) cada pieza se ve terminada. */
(function () {
  'use strict';

  var raiz = document.documentElement;
  if (!raiz.classList.contains('sec-si')) return;
  if (!('IntersectionObserver' in window) || !window.requestAnimationFrame ||
      typeof window.CustomEvent !== 'function') {
    raiz.classList.remove('sec-si');
    return;
  }

  // Con scroll: dónde empieza cada paso (fracción del recorrido). Con tres pasos, 0,10 · 0,40 · 0,70;
  // con cuatro, 0,10 · 0,325 · 0,55 · 0,775. El número de pasos lo dan los textos.
  function cortes(n) {
    var c = [], i;
    for (i = 0; i < n; i++) c.push(0.10 + i * 0.9 / n);
    return c;
  }
  var ESPERA = [900, 2800, 2800, 5200];   // solos: lo que dura el título, cada paso y el último, en milisegundos
  var ALTO_MIN = 430;                     // con menos alto libre no se deja nada fijo
  var ALTO_MIN_1 = 500;                   // en una columna el texto va encima del dibujo: hace falta más alto,
                                          // o el dibujo se queda fijo pero diminuto (250 px de ancho en una ventana de 887 x 554)
  var unaColumna = window.matchMedia ? window.matchMedia('(max-width:999px)') : null;   // el mismo corte que la hoja de estilos

  var cabecera = document.querySelector('.cabecera');
  var boton = document.querySelector('[data-sec-pausa]');   // uno por página: para y reanuda los dibujos que avanzan solos
  var bloques = [];
  var hayFijos = false;
  var activo = true;      // ¿sigue puesta la clase sec-si?
  var pausa = false;
  var pendiente = false;

  /* --- el paso ------------------------------------------------------------- */
  function poner(b, k) {
    if (b.paso === k) return;
    b.paso = k;
    var el = b.el, i, txt = String(k);
    for (i = 1; i <= b.n; i++) el.classList.toggle('p' + i, k >= i);
    el.setAttribute('data-paso', txt);
    for (i = 0; i < b.textos.length; i++) {
      b.textos[i].classList.toggle('activo', b.textos[i].getAttribute('data-paso') === txt);
    }
    for (i = 0; i < b.botones.length; i++) {
      b.botones[i].setAttribute('aria-pressed', i + 1 === k ? 'true' : 'false');
    }
    el.dispatchEvent(new CustomEvent('secuencia:paso', { bubbles: true, detail: { paso: k } }));
  }
  // de golpe, sin transiciones
  function colocar(b, k) {
    b.el.classList.add('sin-trans');
    poner(b, k);
    void b.el.offsetWidth;
    b.el.classList.remove('sin-trans');
  }

  /* --- con el scroll -------------------------------------------------------- */
  var sonda = document.createElement('div');   // mide el alto de pantalla que no cambia al esconderse la barra del móvil
  sonda.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';

  function medir() {
    var cab = cabecera ? Math.floor(cabecera.getBoundingClientRect().height) : 0;
    raiz.style.setProperty('--sec-cab', cab + 'px');
    if (!hayFijos) return;
    var cabe = sonda.offsetHeight - cab >= (unaColumna && unaColumna.matches ? ALTO_MIN_1 : ALTO_MIN);
    if (cabe !== activo) {
      activo = cabe;
      raiz.classList.toggle('sec-si', cabe);
    }
    for (var i = 0; i < bloques.length; i++) bloques[i].tope = cab;
  }

  function mirar() {
    pendiente = false;
    if (!activo) return;
    for (var i = 0; i < bloques.length; i++) {
      var b = bloques[i];
      if (b.solo) continue;
      var r = b.el.getBoundingClientRect();
      var tramo = r.height - b.fija.offsetHeight;
      var q = tramo > 1 ? (b.tope - r.top) / tramo : 1;
      var k = 0;
      while (k < b.n && q >= b.cortes[k]) k++;
      poner(b, k);
    }
  }
  function pedir() {
    if (!pendiente) { pendiente = true; window.requestAnimationFrame(mirar); }
  }

  /* --- solos ---------------------------------------------------------------- */
  function seguir(b) {
    if (b.reloj || b.volviendo || b.mano || pausa || document.hidden || !b.visto) return;
    var ms = b.resto;
    if (!(ms > 0)) {
      ms = b.paso >= b.n ? ESPERA[3] : ESPERA[Math.min(b.paso, 2)];
      b.el.style.setProperty('--dura', ms + 'ms');
    }
    b.resto = 0;
    b.fin = Date.now() + ms;
    b.el.classList.add('en-marcha');
    b.reloj = window.setTimeout(function () { b.reloj = 0; avanzar(b); }, ms);
  }
  function parar(b) {
    if (!b.reloj) return;
    window.clearTimeout(b.reloj);
    b.reloj = 0;
    b.resto = Math.max(1, b.fin - Date.now());
    b.el.classList.remove('en-marcha');
  }
  function avanzar(b) {
    if (b.paso >= b.n) { volver(b); return; }
    poner(b, b.paso + 1);
    seguir(b);
  }
  // del último paso al primero: el dibujo se apaga, se recoloca y vuelve
  function volver(b) {
    b.el.classList.remove('en-marcha');
    b.el.classList.add('reinicia');
    b.volviendo = window.setTimeout(function () {
      b.volviendo = 0;
      colocar(b, 0);
      b.el.classList.remove('reinicia');
      b.resto = 0;
      seguir(b);
    }, 420);
  }
  function soltarVuelta(b) {
    if (!b.volviendo) return;
    window.clearTimeout(b.volviendo);
    b.volviendo = 0;
    b.el.classList.remove('reinicia');
  }
  /* El botón enseña lo que hará al pulsarlo: pausar si los dibujos avanzan solos, reanudar si
     están parados, sea por el propio botón o porque se ha elegido un paso a mano. */
  function parado() {
    if (pausa) return true;
    for (var i = 0; i < bloques.length; i++) if (bloques[i].solo && bloques[i].mano) return true;
    return false;
  }
  function pintarBoton() {
    if (!boton) return;
    var p = parado();
    boton.classList.toggle('en-pausa', p);
    boton.setAttribute('aria-label', p ? 'Reanudar la animación' : 'Pausar la animación');
  }
  // al dejar de verse: vuelve al principio, para que al regresar empiece de nuevo
  function olvidar(b) {
    if (b.visto) return;
    soltarVuelta(b);
    b.mano = false;
    b.resto = 0;
    b.el.classList.remove('a-mano', 'en-marcha');
    colocar(b, 0);
    pintarBoton();
  }
  function aMano(b, k) {
    soltarVuelta(b);
    parar(b);
    b.resto = 0;
    b.mano = true;
    b.el.classList.add('a-mano');
    poner(b, k);
    pintarBoton();
  }
  function botones(b) {
    var lista = b.el.querySelector('[data-sec-pasos]');
    if (!lista) return;
    Array.prototype.forEach.call(lista.children, function (li, i) {
      var bt = document.createElement('button');
      bt.type = 'button';
      bt.setAttribute('aria-pressed', 'false');
      while (li.firstChild) bt.appendChild(li.firstChild);
      li.appendChild(bt);
      bt.addEventListener('click', function () { aMano(b, i + 1); });
      b.botones.push(bt);
    });
    lista.classList.add('sec-botones');
  }

  /* --- arranque ------------------------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-secuencia]'), function (el) {
    var b = {
      el: el, paso: -1, tope: 0,
      solo: el.getAttribute('data-secuencia') === 'auto',
      fija: el.querySelector('.sec-fija'),
      vista: el.querySelector('.vista'),
      textos: el.querySelectorAll('.sec-texto'),
      botones: [], visto: false, mano: false, reloj: 0, volviendo: 0, olvido: 0, fin: 0, resto: 0
    };
    if (!b.solo && !b.fija) {              // nada que mover: se deja terminada
      el.classList.add('p1', 'p2', 'p3', 'p4');
      return;
    }
    // cuántos pasos tiene: los textos de .sec-pasos (con scroll) o los renglones de la lista (solos)
    var lista = el.querySelector('[data-sec-pasos]');
    b.n = (b.solo ? (lista ? lista.children.length : 0) : el.querySelectorAll('.sec-pasos .sec-texto').length) || 3;
    b.cortes = cortes(b.n);
    if (b.solo) {
      botones(b);
      // otro script puede pedir que la imagen se quede en el paso en que está
      el.addEventListener('secuencia:mano', function () { if (b.paso >= 0) aMano(b, b.paso); });
    } else hayFijos = true;
    bloques.push(b);
  });
  if (!bloques.length) return;

  if (hayFijos) document.body.appendChild(sonda);
  medir();
  bloques.forEach(function (b) { b.el.classList.add('sin-trans'); if (b.solo) poner(b, 0); });
  mirar();
  void raiz.offsetWidth;
  bloques.forEach(function (b) { b.el.classList.remove('sin-trans'); });

  if (hayFijos) window.addEventListener('scroll', pedir, { passive: true });
  window.addEventListener('resize', function () { medir(); pedir(); });
  window.addEventListener('load', function () { medir(); pedir(); });

  var ojo = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (en) {
      var b = null, i;
      for (i = 0; i < bloques.length; i++) if (bloques[i].vista === en.target) b = bloques[i];
      if (!b) return;
      b.visto = en.isIntersecting && en.intersectionRatio >= 0.5;
      window.clearTimeout(b.olvido);
      if (b.visto) seguir(b);
      else {
        parar(b);
        b.olvido = window.setTimeout(function () { olvidar(b); }, 700);
      }
    });
  }, { threshold: [0, 0.5] });
  bloques.forEach(function (b) { if (b.solo && b.vista) ojo.observe(b.vista); });

  document.addEventListener('visibilitychange', function () {
    bloques.forEach(function (b) {
      if (!b.solo) return;
      if (document.hidden) parar(b); else seguir(b);
    });
  });

  // Pausa: para todos los dibujos que avanzan solos; al reanudar siguen donde estaban. Si lo que
  // los tenía parados era un paso elegido a mano, una sola pulsación los pone otra vez en marcha.
  if (boton) {
    boton.addEventListener('click', function () {
      pausa = !parado();
      bloques.forEach(function (b) {
        if (!b.solo) return;
        if (pausa) { parar(b); return; }
        b.mano = false;
        b.el.classList.remove('a-mano');
        seguir(b);
      });
      pintarBoton();
    });
  }
})();
