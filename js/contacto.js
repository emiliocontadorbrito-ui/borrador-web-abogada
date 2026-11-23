/* Formulario de contacto. El sitio no tiene servidor que recoja el mensaje:
   al pulsar «Enviar» se prepara en el programa de correo de quien escribe, con
   el asunto y el texto ya puestos, y solo le queda mandarlo. La página lo dice
   así; nunca da el mensaje por enviado. Si esto falla, el propio navegador hace
   algo parecido con el action="mailto:" del formulario. */
(function () {
  var form = document.getElementById('form-contacto');
  var aviso = document.getElementById('form-aviso');
  if (!form || !aviso) return;
  // data-destino: la copia del artefacto no puede llevar action="mailto:" y lo trae así
  var destino = (form.getAttribute('data-destino') || form.getAttribute('action') || '').replace(/^mailto:/, '');
  if (!destino) return;

  function valor(id) {
    var el = document.getElementById(id);
    return el ? el.value.replace(/^\s+|\s+$/g, '') : '';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    // la comprobación de los campos obligatorios la hace el navegador antes de llegar aquí
    var asunto = valor('asunto') || 'Consulta desde la web';
    var cuerpo = valor('mensaje') + '\n\n' + valor('nombre') + '\n' + valor('correo');
    var enlace = 'mailto:' + destino + '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(cuerpo);

    aviso.textContent = '';
    // el trato (tú o usted) lo dice el propio formulario: data-trato="usted"
    // y quien habla (un despacho o una sola persona): data-voz="yo"
    var usted = form.getAttribute('data-trato') === 'usted';
    var yo = form.getAttribute('data-voz') === 'yo';
    aviso.appendChild(document.createTextNode(usted ?
      'Se ha preparado el mensaje en su programa de correo: solo falta que lo envíe desde ahí. ' +
      'Si no se ha abierto, ' + (yo ? 'escríbame' : 'escríbanos') + ' a ' :
      'Se ha preparado el mensaje en tu programa de correo: solo falta que lo envíes desde ahí. ' +
      'Si no se ha abierto, ' + (yo ? 'escríbeme' : 'escríbenos') + ' a '));
    var a = document.createElement('a');
    a.href = 'mailto:' + destino;
    a.textContent = destino;
    aviso.appendChild(a);
    aviso.appendChild(document.createTextNode('.'));
    aviso.hidden = false;

    window.location.href = enlace;
  });
})();
