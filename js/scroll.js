/* Lo que se mueve al bajar por la página, en todo el sitio:
     1. lo que queda más abajo entra al llegar a ello (aparece y sube unos píxeles);
     2. una línea del color de la marca bajo la cabecera dice cuánto se ha recorrido.
   Si esto falla o no carga, la página se ve entera: solo se esconde lo que
   todavía no está en pantalla, y lo esconde este mismo script.
   Con movimiento reducido no hace nada. */
/* 3. La cabecera, si el sitio.toml lo pide en [estilo]:
     cab-esconde  se va hacia arriba al bajar más de 200 px y vuelve en cuanto se sube un poco;
     cab-pildora  pasa a «pegada» (cab-pegada) en cuanto se baja 30 px.
   Esto va aparte y también con movimiento reducido (allí cambia de golpe, sin transición). */
(function () {
  var raiz = document.documentElement;
  var esconde = raiz.classList.contains('cab-esconde'), pildora = raiz.classList.contains('cab-pildora');
  if (!esconde && !pildora) return;
  var cab = document.querySelector('.cabecera');
  if (!cab) return;
  var antes = window.pageYOffset, pedido = false;
  // al llegar a un ancla (desde otra página o con un enlace de esta) la cabecera no se esconde:
  // si no, el destino quedaría con un hueco encima donde iba la cabecera
  var quieta = location.hash.length > 1 ? Date.now() + 2000 : 0;
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="#"]');
    if (a && a.pathname === location.pathname) quieta = Date.now() + 2000;
  });
  window.addEventListener('hashchange', function () { quieta = Date.now() + 2000; cab.classList.remove('oculta'); });
  function mirar() {
    pedido = false;
    var y = window.pageYOffset;
    if (pildora) raiz.classList.toggle('cab-pegada', y > 30);
    if (esconde) {
      var abierto = cab.querySelector('.menu.abierto, .menu-grupo.abierto');
      if (Date.now() < quieta) { cab.classList.remove('oculta'); }
      else if (y > 200 && y > antes + 4 && !abierto) cab.classList.add('oculta');
      else if (y < antes - 4 || y <= 200) cab.classList.remove('oculta');
      // con la cabecera escondida asoma el botón de contacto del pie (.contacto-fijo)
      raiz.classList.toggle('cab-oculta', cab.classList.contains('oculta'));
    }
    antes = y;
  }
  window.addEventListener('scroll', function () { if (!pedido) { pedido = true; (window.requestAnimationFrame || setTimeout)(mirar); } }, { passive: true });
  // con el teclado, la cabecera vuelve si el foco entra en ella
  cab.addEventListener('focusin', function () { cab.classList.remove('oculta'); });
  mirar();
})();

(function () {
  var raiz = document.documentElement;
  if (!('IntersectionObserver' in window) || !window.requestAnimationFrame || !window.matchMedia ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* --- 1. Entradas --------------------------------------------------------- */
  // De estas rejillas entra cada pieza por su cuenta, una detrás de otra.
  var REJILLAS = '.columnas,.mosaico,.rejilla,.galeria,.indice,.cifras,.datos,.rejilla-titular,.lista-marca,.cuando,.proceso,.equipo,.tarifas,.incluye,.preguntas-lista';
  var piezas = [];
  function repartir(el) {
    if (el.matches(REJILLAS)) Array.prototype.forEach.call(el.children, repartir);
    else piezas.push(el);
  }
  Array.prototype.forEach.call(document.querySelectorAll('main section:not(.portada) > .contenedor'), function (c) {
    Array.prototype.forEach.call(c.children, repartir);
  });
  // los caminos (bloque CAMINOS) en pantalla estrecha, donde la sección no se fija: el punto de
  // partida y cada camino entran por su cuenta, uno detrás de otro
  if (window.matchMedia('(max-width:699px)').matches)
    Array.prototype.forEach.call(document.querySelectorAll('.caminos .ca-inicio, .caminos .ca-camino'), function (el) { piezas.push(el); });

  var corte = window.innerHeight * 0.94;
  piezas = piezas.filter(function (el) { return el.getBoundingClientRect().top > corte; });
  piezas.forEach(function (el) { el.classList.add('entra', 'entra-pend'); });

  var ojo = new IntersectionObserver(function (entradas) {
    var k = 0;
    entradas.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      ojo.unobserve(el);
      el.style.setProperty('--k', String(Math.min(k++, 6)));
      el.classList.remove('entra-pend');
      // al acabar se quita todo, para no pisar las transiciones propias de la pieza
      window.setTimeout(function () { el.classList.remove('entra'); el.style.removeProperty('--k'); }, 1500);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
  piezas.forEach(function (el) { ojo.observe(el); });

  /* --- 2. Línea de recorrido bajo la cabecera -------------------------------- */
  var cab = document.querySelector('.cabecera');
  if (!cab) return;
  var barra = document.createElement('span');
  barra.className = 'progreso';
  barra.setAttribute('aria-hidden', 'true');
  cab.appendChild(barra);
  var pendiente = false;
  function poner() {
    pendiente = false;
    var max = raiz.scrollHeight - window.innerHeight;
    var v = max > 0 ? Math.min(1, Math.max(0, window.pageYOffset / max)) : 0;
    // en una página que casi no se desliza, la línea no dice nada: no se pinta
    barra.style.transform = 'scaleX(' + (max > window.innerHeight * 0.6 ? v.toFixed(4) : 0) + ')';
  }
  function pedir() { if (!pendiente) { pendiente = true; window.requestAnimationFrame(poner); } }
  window.addEventListener('scroll', pedir, { passive: true });
  window.addEventListener('resize', pedir);
  poner();
})();
