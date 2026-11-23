/* La cinta de etiquetas que se desliza sola: un botón para pararla y seguirla.
   Lo que se mueve solo más de cinco segundos tiene que poder pararse (WCAG 2.2.2).
   Con movimiento reducido la cinta no se mueve y el botón no se ve (lo hace la
   hoja de estilos). Si esto no carga, la cinta se para al pasar el ratón. */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.cinta'), function (cinta) {
    var boton = cinta.nextElementSibling;
    if (!boton || !boton.classList.contains('cinta-pausa')) return;
    boton.hidden = false;
    boton.addEventListener('click', function () {
      var parada = cinta.classList.toggle('parada');
      boton.setAttribute('aria-pressed', parada ? 'true' : 'false');
      boton.textContent = parada ? 'Seguir' : 'Parar';
    });
  });
  // al subir por la página la cinta va al revés, y al bajar vuelve (como extrafazant.nl)
  var cintas = document.querySelectorAll('.cinta');
  if (!cintas.length) return;
  var antes = window.pageYOffset;
  window.addEventListener('scroll', function () {
    var y = window.pageYOffset;
    if (Math.abs(y - antes) < 6) return;
    var atras = y < antes; antes = y;
    Array.prototype.forEach.call(cintas, function (c) { c.classList.toggle('al-reves', atras); });
  }, { passive: true });
})();
