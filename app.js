/*
 * Aquarium Fish — cargador modular
 *
 * Los módulos se mantienen separados para facilitar el mantenimiento,
 * pero se cargan en EXACTAMENTE el mismo orden que tenían dentro de
 * app-monolitico.js.  Es importante que la carga sea síncrona porque
 * la aplicación utiliza funciones globales llamadas desde onclick="..."
 * y algunas variables se inicializan en módulos posteriores.
 */
(function () {
  "use strict";

  if (window.__AQUARIUM_FISH_MODULAR_LOADED__) return;
  window.__AQUARIUM_FISH_MODULAR_LOADED__ = true;

  var modules = [
    "app-core.js",
    "app-inventario-reportes.js",
    "app-cotizaciones.js",
    "app-operacion.js",
    "app-caja-respaldos.js",
    "app-mejoras.js"
  ];

  // app.js se ejecuta durante el parseo de index.html. document.write
  // permite conservar la carga bloqueante y ordenada de los módulos.
  if (document.readyState === "loading") {
    document.write(
      modules.map(function (src) {
        return '<script src="' + src + '"><\\/script>';
      }).join("\n")
    );
    return;
  }

  // Ruta de compatibilidad si app.js se carga posteriormente.
  var loadNext = function (index) {
    if (index >= modules.length) return;
    var script = document.createElement("script");
    script.src = modules[index];
    script.onload = function () { loadNext(index + 1); };
    script.onerror = function () {
      console.error("No se pudo cargar el módulo Aquarium Fish:", modules[index]);
    };
    document.head.appendChild(script);
  };
  loadNext(0);
})();
