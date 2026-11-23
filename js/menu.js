/* El menú: el botón del móvil y el desplegable de «Qué hacemos».
   Si esto falla, la página se sigue leyendo entera: en el móvil la lista de
   servicios va siempre abierta y en el ordenador se abre al pasar el ratón o
   al llegar con el teclado (lo hace la hoja de estilo mientras no esté la
   clase menu-js, que pone este script). */
(function () {
  var boton = document.querySelector('.menu-boton');
  var menu = document.getElementById('menu');
  if (!boton || !menu) return;

  boton.addEventListener('click', function () {
    var abierto = menu.classList.toggle('abierto');
    boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
  });

  /* --- «Qué hacemos» -------------------------------------------------------- */
  var grupo = menu.querySelector('.menu-grupo');
  var abre = grupo && grupo.querySelector('.menu-abre');
  var estrecho = window.matchMedia ? window.matchMedia('(max-width:1100px)') : null;
  function esMovil() { return !!(estrecho && estrecho.matches); }

  function poner(abierto) {
    grupo.classList.toggle('abierto', abierto);
    // en el móvil la lista está siempre a la vista: el botón lo dice así
    abre.setAttribute('aria-expanded', abierto || esMovil() ? 'true' : 'false');
  }
  if (abre) {
    document.documentElement.classList.add('menu-js');
    abre.addEventListener('click', function () {
      if (!esMovil()) poner(!grupo.classList.contains('abierto'));
    });
    // se cierra al pulsar fuera y cuando el foco sale de la lista
    document.addEventListener('click', function (e) {
      if (!grupo.contains(e.target)) poner(false);
    });
    grupo.addEventListener('focusout', function (e) {
      if (e.relatedTarget && !grupo.contains(e.relatedTarget)) poner(false);
    });
    if (estrecho) {
      var alCambiar = function () { poner(false); };
      if (estrecho.addEventListener) estrecho.addEventListener('change', alCambiar);
      else if (estrecho.addListener) estrecho.addListener(alCambiar);
    }
    poner(false);
  }

  // Escape cierra lo que esté abierto, para no dejar el menú tapando la página.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (grupo && grupo.classList.contains('abierto')) {
      var dentro = grupo.contains(document.activeElement);
      poner(false);
      if (dentro) abre.focus();
    }
    if (menu.classList.contains('abierto')) {
      menu.classList.remove('abierto');
      boton.setAttribute('aria-expanded', 'false');
      boton.focus();
    }
  });
})();
