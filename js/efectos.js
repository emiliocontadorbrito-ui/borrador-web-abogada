/* Las piezas que se mueven con el recorrido de la página (y no con el reloj).
   Lo único que hace este guion es medir y poner números; lo que se ve lo dice la hoja de estilo.

   1. [data-recorrido]: recibe --p, de 0 a 1, según lo que se ha bajado.
        "paso"  (por defecto): 0 cuando el borde de arriba asoma por abajo de la pantalla,
                1 cuando el de abajo se va por arriba. --q es lo mismo, pero 0 al asomar y
                1 cuando la pieza está entera en pantalla (o llena la pantalla).
        "fijo"  la pieza es más alta que la pantalla y lo de dentro se queda fijo (sticky):
                0 cuando empieza a fijarse, 1 cuando se suelta. Además pone data-tramo
                con el número del tramo (0, 1, 2...) si la pieza dice data-tramos="n"
                (con data-tramos-modo="partes", los n tramos duran lo mismo).
        "hilo"  una línea que se llena al leer (bloque FASES): --p es cuánto de [data-hilo] ha
                pasado ya por la línea de lectura (a tres quintos de la pantalla); cada
                [data-hito] que la ha cruzado lleva «pasado» y data-tramo es el último de ellos.
   2. [data-cuenta]: una cifra que sube desde cero al entrar en pantalla (1,6 s).
   3. .carrusel: los botones de anterior y siguiente, y arrastrar con el ratón.
   4. .test: el test de varias preguntas que recomienda una opción (sin enviar nada).

   Pone «ef-si» en <html> al empezar: el CSS solo esconde o desplaza algo con esa clase. Sin
   JavaScript, si este guion falla o con movimiento reducido, todo se ve en su sitio y quieto
   (--p no existe y cada pieza queda en su estado final). Las cifras salen con su valor. */
(function () {
  var raiz = document.documentElement;
  var reducido = !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };

  /* --- 1. Recorrido ---------------------------------------------------------------- */
  var piezas = reducido ? [] : Array.prototype.slice.call(document.querySelectorAll('[data-recorrido]'));
  if (piezas.length) raiz.classList.add('ef-si');
  var pedido = false;
  function medir() {
    pedido = false;
    var vh = window.innerHeight;
    for (var i = 0; i < piezas.length; i++) {
      var el = piezas[i], r = el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) continue;          // lejos: no se toca
      var p, q;
      if (el.getAttribute('data-recorrido') === 'fijo') {
        var largo = r.height - vh;
        p = largo > 0 ? -r.top / largo : (r.top <= 0 ? 1 : 0);
        p = Math.max(0, Math.min(1, p));
        var n = parseInt(el.getAttribute('data-tramos') || '0', 10);
        if (n > 0) {
          // «partes»: n tramos iguales (los turnos); si no, el que está en el centro
          var t = el.getAttribute('data-tramos-modo') === 'partes'
            ? String(Math.min(n - 1, Math.floor(p * n)))
            : String(Math.min(n - 1, Math.round(p * (n - 1))));
          if (el.getAttribute('data-tramo') !== t) el.setAttribute('data-tramo', t);
        }
      } else if (el.getAttribute('data-recorrido') === 'hilo') {
        var linea = vh * 0.6, hilo = el.querySelector('[data-hilo]') || el, rh = hilo.getBoundingClientRect();
        p = rh.height > 0 ? Math.max(0, Math.min(1, (linea - rh.top) / rh.height)) : 0;
        var hitos = el.querySelectorAll('[data-hito]'), ult = 0;
        for (var j = 0; j < hitos.length; j++) {
          var pasa = hitos[j].getBoundingClientRect().top < linea;
          hitos[j].classList.toggle('pasado', pasa);
          if (pasa) ult = j;
        }
        if (el.getAttribute('data-tramo') !== String(ult)) el.setAttribute('data-tramo', String(ult));
      } else {
        p = (vh - r.top) / (vh + r.height);
        q = (vh - r.top) / Math.min(vh, r.height);
        p = Math.max(0, Math.min(1, p));
        el.style.setProperty('--q', Math.max(0, Math.min(1, q)).toFixed(4));
      }
      el.style.setProperty('--p', p.toFixed(4));
    }
  }
  function pedir() { if (!pedido) { pedido = true; raf(medir); } }
  // [data-lateral]: lo que la fila de dentro se sale por la derecha (--dx, en px); la hoja de
  // estilo hace la sección así de alta y desliza la fila esa distancia mientras está fijada.
  var laterales = piezas.filter(function (el) { return el.hasAttribute('data-lateral'); });
  function anchos() {
    laterales.forEach(function (el) {
      var pista = el.querySelector('.lat-pista');
      if (!pista) return;
      el.style.setProperty('--dx', Math.max(0, pista.scrollWidth - pista.clientWidth));
    });
  }
  if (piezas.length) {
    anchos();
    window.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', function () { anchos(); pedir(); });
    window.addEventListener('load', function () { anchos(); pedir(); });
    medir();
  }

  /* --- 2. Cifras que suben ---------------------------------------------------------- */
  var cifras = document.querySelectorAll('[data-cuenta]');
  function formato(v, dec) {
    var s = v.toFixed(dec).split('.');
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');      // 12.500 (como se escribe en España)
    return s.join(',');
  }
  if (cifras.length && !reducido && 'IntersectionObserver' in window) {
    var ojo = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        ojo.unobserve(e.target);
        var el = e.target, fin = parseFloat(el.getAttribute('data-cuenta')), dec = (el.getAttribute('data-cuenta').split('.')[1] || '').length;
        var t0 = null, dura = 2000;                              // como en altufanulu.com: 2 s
        function paso(t) {
          if (t0 === null) t0 = t;
          var k = Math.min(1, (t - t0) / dura);
          var e2 = 1 - Math.pow(1 - k, 3);                       // sale rápido y frena al final
          el.textContent = formato(fin * e2, dec);
          if (k < 1) raf(paso); else el.textContent = el.getAttribute('data-texto');
        }
        el.textContent = formato(0, dec);
        raf(paso);
      });
    }, { threshold: 0.6 });
    Array.prototype.forEach.call(cifras, function (el) {
      // si ya está en pantalla al cargar, no se anima (se vería saltar)
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9 && r.bottom > 0) return;
      ojo.observe(el);
    });
  }

  /* --- 2b. Palabras que se enfocan al llegar ([data-enfoca]) -------------------------- */
  var enfocar = document.querySelectorAll('[data-enfoca]');
  if (enfocar.length && !reducido && 'IntersectionObserver' in window) {
    raiz.classList.add('ef-enfoque');
    var ojo2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('enfocada'); ojo2.unobserve(e.target); } });
    }, { threshold: 0.35 });
    Array.prototype.forEach.call(enfocar, function (el) { ojo2.observe(el); });
  }

  /* --- 2c. La fila del centro (listas con [data-centro], y todas en pantallas táctiles) --
     La fila que pasa por el centro de la pantalla lleva «activa»: en la lista grande se
     enciende y se ven su foto; en un móvil hace lo que con ratón hace pasar por encima (como
     fratellisimonetti.com). */
  var listas = Array.prototype.slice.call(document.querySelectorAll('.lista-n'));
  var tactil = window.matchMedia && window.matchMedia('(hover: none)').matches;
  listas = listas.filter(function (l) { return l.hasAttribute('data-centro') || tactil; });
  if (listas.length && !reducido) {
    listas.forEach(function (l) { l.classList.add('con-centro'); });
    var pidoCentro = false;
    function centro() {
      pidoCentro = false;
      var mitad = window.innerHeight / 2;
      listas.forEach(function (l) {
        var mejor = null, d = Infinity, r = l.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) { l.classList.remove('en-centro'); return; }
        Array.prototype.forEach.call(l.children, function (li) {
          var b = li.getBoundingClientRect(), dd = Math.abs(b.top + b.height / 2 - mitad);
          if (dd < d) { d = dd; mejor = li; }
        });
        l.classList.add('en-centro');
        Array.prototype.forEach.call(l.children, function (li) { li.classList.toggle('activa', li === mejor); });
      });
    }
    window.addEventListener('scroll', function () { if (!pidoCentro) { pidoCentro = true; raf(centro); } }, { passive: true });
    centro();
  }
  // con ratón, la foto de la fila sigue un poco al puntero (como la lista de obras de fratellisimonetti.com)
  if (!reducido && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    Array.prototype.forEach.call(document.querySelectorAll('.lista-n:not(.trabajos) .ln-fila'), function (f) {
      f.addEventListener('pointermove', function (e) {
        var r = f.getBoundingClientRect();
        f.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        f.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
    });
  }

  // en las noticias, «Leer» aparece donde está el puntero dentro de la foto (como deltacafes.com)
  if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    Array.prototype.forEach.call(document.querySelectorAll('a.nt-pieza .nt-foto'), function (f) {
      f.addEventListener('pointermove', function (e) {
        var r = f.getBoundingClientRect();
        f.style.setProperty('--x', Math.round(e.clientX - r.left) + 'px');
        f.style.setProperty('--y', Math.round(e.clientY - r.top) + 'px');
      });
    });
  }

  /* --- 2d. «En esta página»: marca el apartado que se está leyendo ------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll('.en-esta'), function (nav) {
    if (!('IntersectionObserver' in window)) return;
    var enlaces = Array.prototype.slice.call(nav.querySelectorAll('a'));
    var dianas = enlaces.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    function marcar() {
      var y = window.innerHeight * 0.35, actual = 0;
      dianas.forEach(function (d, i) { if (d && d.getBoundingClientRect().top < y) actual = i; });
      enlaces.forEach(function (a, i) {
        if (i === actual) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }
    var pido = false;
    window.addEventListener('scroll', function () { if (!pido) { pido = true; raf(function () { pido = false; marcar(); }); } }, { passive: true });
    marcar();
  });

  /* --- 3. Carruseles --------------------------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll('.carrusel'), function (c) {
    var pista = c.querySelector('.carrusel-pista');
    if (!pista) return;
    var ant = c.querySelector('.carrusel-ant'), sig = c.querySelector('.carrusel-sig');
    var barra = c.querySelector('.carrusel-progreso span');
    var cuenta = c.querySelector('.carrusel-cuenta');
    var total = pista.children.length;
    function salto() { var h = pista.querySelector(':scope > *'); return h ? h.getBoundingClientRect().width + 20 : pista.clientWidth * 0.8; }
    function estado() {
      if (ant) ant.disabled = pista.scrollLeft < 4;
      if (sig) sig.disabled = pista.scrollLeft + pista.clientWidth > pista.scrollWidth - 4;
      // la línea: el tramo que se ve, en su sitio (ancho = lo visible / el total)
      if (barra && pista.scrollWidth > 0) {
        var ancho = pista.clientWidth / pista.scrollWidth;
        barra.style.width = (ancho * 100).toFixed(2) + '%';
        barra.style.transform = 'translateX(' + (pista.scrollLeft / pista.clientWidth * 100).toFixed(2) + '%)';
        c.classList.toggle('sin-progreso', ancho > 0.98);
      }
      // «03 / 08»: la primera tarjeta a la vista y cuántas hay (como fratellisimonetti.com)
      if (cuenta && total) {
        var primera = pista.children[0].getBoundingClientRect().width + 20;
        var n = Math.min(total, Math.round(pista.scrollLeft / primera) + 1);
        cuenta.textContent = (n < 10 ? '0' : '') + n + ' / ' + (total < 10 ? '0' : '') + total;
      }
    }
    if (ant) { ant.hidden = false; ant.addEventListener('click', function () { pista.scrollBy({ left: -salto(), behavior: reducido ? 'auto' : 'smooth' }); }); }
    if (sig) { sig.hidden = false; sig.addEventListener('click', function () { pista.scrollBy({ left: salto(), behavior: reducido ? 'auto' : 'smooth' }); }); }
    pista.addEventListener('scroll', function () { raf(estado); }, { passive: true });
    window.addEventListener('resize', estado);
    estado();
    // arrastrar con el ratón (con el dedo ya se desliza solo)
    var x0 = 0, s0 = 0, abajo = false, movido = false;
    pista.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      abajo = true; movido = false; x0 = e.clientX; s0 = pista.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!abajo) return;
      var dx = e.clientX - x0;
      if (Math.abs(dx) > 4) { movido = true; pista.classList.add('arrastrando'); }
      pista.scrollLeft = s0 - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!abajo) return; abajo = false;
      pista.classList.remove('arrastrando');
    });
    // un arrastre no es un clic en el enlace de debajo
    pista.addEventListener('click', function (e) { if (movido) { e.preventDefault(); movido = false; } }, true);
  });

  /* --- 4. Test ---------------------------------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll('.test'), function (t) {
    var preguntas = Array.prototype.slice.call(t.querySelectorAll('.test-pregunta'));
    var resultados = Array.prototype.slice.call(t.querySelectorAll('.test-resultado'));
    var empezar = t.querySelector('.test-empezar'), otra = t.querySelector('.test-otra');
    var cuenta = t.querySelector('.test-cuenta');
    if (!preguntas.length || !resultados.length) return;
    t.classList.add('test-js');
    var actual = -1;
    var arcos = t.querySelectorAll('.ta-arco');
    function ver(i) {
      actual = i;
      t.classList.toggle('test-portada', i < 0);
      Array.prototype.forEach.call(arcos, function (a, k) { a.classList.toggle('hecho', k < i); a.classList.toggle('ahora', k === i); });
      preguntas.forEach(function (p, k) { p.hidden = k !== i; });
      if (cuenta) cuenta.textContent = i >= 0 && i < preguntas.length ? (i + 1) + ' de ' + preguntas.length : '';
      if (i >= 0 && i < preguntas.length) {
        resultados.forEach(function (r) { r.hidden = true; });
        var leyenda = preguntas[i].querySelector('legend');
        if (leyenda) { leyenda.setAttribute('tabindex', '-1'); leyenda.focus({ preventScroll: true }); }
      }
    }
    function terminar() {
      var puntos = {};
      preguntas.forEach(function (p) {
        var m = p.querySelector('input:checked');
        if (!m) return;
        (m.getAttribute('data-suma') || '').split(' ').forEach(function (k) { if (k) puntos[k] = (puntos[k] || 0) + 1; });
      });
      var mejor = resultados[0], max = -1;
      resultados.forEach(function (r) { var v = puntos[r.getAttribute('data-clave')] || 0; if (v > max) { max = v; mejor = r; } });
      preguntas.forEach(function (p) { p.hidden = true; });
      resultados.forEach(function (r) { r.hidden = r !== mejor; });
      Array.prototype.forEach.call(arcos, function (a) { a.classList.add('hecho'); a.classList.remove('ahora'); });
      if (cuenta) cuenta.textContent = '';
      t.classList.add('test-hecho');
      var h = mejor.querySelector('h3');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
    preguntas.forEach(function (p, k) {
      p.addEventListener('change', function () {
        // un instante para ver marcada la opción, y a la siguiente
        setTimeout(function () { if (k + 1 < preguntas.length) ver(k + 1); else terminar(); }, reducido ? 0 : 260);
      });
    });
    if (empezar) empezar.addEventListener('click', function () { ver(0); });
    if (otra) otra.addEventListener('click', function () {
      t.classList.remove('test-hecho');
      preguntas.forEach(function (p) { Array.prototype.forEach.call(p.querySelectorAll('input'), function (i) { i.checked = false; }); });
      ver(0);
    });
    ver(empezar ? -1 : 0);
  });
})();
