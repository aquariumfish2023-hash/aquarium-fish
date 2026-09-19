# ETAPA JARVIS — Asistente del negocio

- JARVIS conserva la preparación de ventas existente.
- Agrega consultas en lenguaje natural sobre ventas de hoy, inventario bajo/agotado, cotizaciones pendientes, encargos activos, saldos de clientes y caja.
- Usa la base local actual mediante `window.db`; no cambia la estructura de Firebase ni `firestore.rules`.
- Mantiene entrada por texto y reconocimiento de voz en español (`es-CO`) y la voz de respuesta del navegador.
- No registra ventas automáticamente: las ventas siguen requiriendo confirmación en el formulario existente.
