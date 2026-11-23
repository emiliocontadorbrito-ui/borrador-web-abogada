/* Comparador de dos fotos (antes | después) y pestañas.
   Si esto falla o no carga, la página se lee igual: las dos fotos de cada
   comparador salen una al lado de la otra y todos los paneles, uno debajo de otro. */
(function () {
  var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conObservador = 'IntersectionObserver' in window;

  /* --- Comparador --------------------------------------------------------
     La foto de antes va encima y se recorta con clip-path; la línea se mueve
     con transform. Ninguna de las dos cosas recalcula la maquetación. */
  function comparador(fig, conEstreno) {
    var marco = fig.querySelector('.comparador-marco');
    var antes = fig.querySelector('.comparador-antes');
    var linea = fig.querySelector('.comparador-linea');
    var tirador = fig.querySelector('.comparador-tirador');
    if (!marco || !antes || !linea || !tirador) return;

    var pos = 50;            // % del ancho que ocupa la foto de antes
    var puntero = null;      // id del puntero que manda
    var arrastrando = false;
    var enEspera = false;    // dedo apoyado que todavía no se ha movido de lado
    var x0 = 0;

    function poner(p) {
      pos = Math.max(0, Math.min(100, p));
      antes.style.clipPath = 'inset(0 ' + (100 - pos) + '% 0 0)';
      linea.style.transform = 'translateX(' + pos + '%)';
      tirador.setAttribute('aria-valuenow', String(Math.round(pos)));
      tirador.setAttribute('aria-valuetext', Math.round(pos) + ' % de la foto de antes a la vista');
    }
    function desdeX(x) {
      var r = marco.getBoundingClientRect();
      return r.width ? (x - r.left) / r.width * 100 : 50;
    }
    function cortarAnimacion() { fig.classList.remove('animando'); }
    function enTirador(el) { return el === tirador || tirador.contains(el); }
    function capturar(id) { try { marco.setPointerCapture(id); } catch (e) { /* sin captura también funciona */ } }

    marco.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // Con un arrastre en marcha, un segundo dedo no manda: la línea no salta.
      if (arrastrando && puntero !== null && e.pointerId !== puntero) return;
      cortarAnimacion();
      puntero = e.pointerId; x0 = e.clientX;
      if (e.pointerType === 'mouse' || enTirador(e.target)) {
        // Ratón, o dedo sobre el tirador: se arrastra desde el primer momento.
        arrastrando = true; enEspera = false;
        capturar(e.pointerId);
        if (!enTirador(e.target)) poner(desdeX(e.clientX));
        e.preventDefault();
      } else {
        // Dedo sobre la foto: puede ser el gesto de bajar por la página. No se
        // mueve nada hasta que el dedo se desplaza de lado.
        arrastrando = false; enEspera = true;
      }
    });
    marco.addEventListener('pointermove', function (e) {
      if (e.pointerId !== puntero) return;
      if (enEspera && Math.abs(e.clientX - x0) > 6) { enEspera = false; arrastrando = true; capturar(e.pointerId); }
      if (arrastrando) poner(desdeX(e.clientX));
    });
    function soltar(e) {
      if (e.pointerId !== puntero) return;
      if (enEspera && e.type === 'pointerup') poner(desdeX(e.clientX));   // toque sin arrastre
      arrastrando = false; enEspera = false; puntero = null;
    }
    marco.addEventListener('pointerup', soltar);
    marco.addEventListener('pointercancel', soltar);
    marco.addEventListener('lostpointercapture', soltar);

    // Teclado, con el foco en el tirador. Sin animación: es una acción repetida.
    tirador.addEventListener('keydown', function (e) {
      var p = pos;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') p -= e.shiftKey ? 10 : 2;
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') p += e.shiftKey ? 10 : 2;
      else if (e.key === 'PageDown') p -= 10;
      else if (e.key === 'PageUp') p += 10;
      else if (e.key === 'Home') p = 0;
      else if (e.key === 'End') p = 100;
      else return;
      e.preventDefault(); cortarAnimacion(); poner(p);
    });

    // Estreno: la primera vez que el comparador entra en pantalla la línea
    // recorre la foto una vez y deja ver lo nuevo. Con movimiento reducido no se hace.
    if (conEstreno && conObservador && !reducido) {
      poner(88);
      var ojo = new IntersectionObserver(function (entradas) {
        if (!entradas[0].isIntersecting) return;
        ojo.disconnect();
        fig.classList.add('visto', 'estreno', 'animando');
        poner(50);
        window.setTimeout(function () { fig.classList.remove('animando', 'estreno'); }, 1300);
        fig.dispatchEvent(new CustomEvent('comparador:visto', { bubbles: true }));
      }, { threshold: 0.4 });
      ojo.observe(marco);
    } else {
      poner(50);
      if (conEstreno) fig.classList.add('visto');
    }
  }

  /* --- Pestañas ------------------------------------------------------------ */
  function pestanas(lista) {
    var tabs = Array.prototype.slice.call(lista.querySelectorAll('[role="tab"]'));
    var paneles = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    if (!tabs.length || paneles.indexOf(null) !== -1) return;

    function activar(i, conFoco) {
      tabs.forEach(function (t, k) {
        var activa = k === i;
        t.setAttribute('aria-selected', activa ? 'true' : 'false');
        t.tabIndex = activa ? 0 : -1;
        paneles[k].hidden = !activa;
      });
      var fig = paneles[i].querySelector('.comparador');
      if (fig && i !== 0) fig.classList.add('visto');
      if (conFoco) tabs[i].focus();
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { activar(i, false); });
      t.addEventListener('keydown', function (e) {
        var n = i;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        else return;
        e.preventDefault(); activar(n, true);
      });
    });

    paneles.forEach(function (p, k) {
      var fig = p.querySelector('.comparador');
      if (fig) comparador(fig, k === 0);
    });
    lista.hidden = false;
    activar(0, false);

    // Las fotos de los otros paneles se piden cuando el primero ya se ha visto,
    // para que cambiar de pestaña no deje la foto en blanco.
    function pedirResto() {
      paneles.slice(1).forEach(function (p) {
        Array.prototype.forEach.call(p.querySelectorAll('img[loading="lazy"]'), function (img) { img.loading = 'eager'; });
      });
    }
    var primero = paneles[0].querySelector('.comparador');
    if (primero && !primero.classList.contains('visto')) primero.addEventListener('comparador:visto', pedirResto);
    else pedirResto();
  }

  var listas = document.querySelectorAll('.pestanas[role="tablist"]');
  Array.prototype.forEach.call(listas, pestanas);

  // Comparadores sueltos, fuera de unas pestañas.
  Array.prototype.forEach.call(document.querySelectorAll('.comparador'), function (fig) {
    if (fig.closest('[role="tabpanel"]')) return;
    comparador(fig, true);
  });
})();
