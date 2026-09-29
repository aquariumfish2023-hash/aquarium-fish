/*
 * Aquarium Fish - punto de entrada de compatibilidad
 *
 * La lógica original se conserva íntegramente en app-monolitico.js.
 * Este archivo únicamente carga ese código sin convertirlo en módulo,
 * para mantener disponibles las funciones globales usadas por onclick="...".
 */
(function () {
  "use strict";

  if (window.__AQUARIUM_FISH_MONOLITHIC_LOADED__) return;
  window.__AQUARIUM_FISH_MONOLITHIC_LOADED__ = true;

  var script = document.createElement("script");
  script.src = "app-monolitico.js";
  script.async = false;
  document.head.appendChild(script);
})();
