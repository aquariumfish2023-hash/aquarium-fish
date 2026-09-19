# Aquarium Fish — Etapa 2

## Centro de sincronización y respaldo

- Se añadió un Centro de sincronización visible desde Más.
- Muestra estado de Firebase, última sincronización, último respaldo y cantidad de registros locales.
- Se añadió el botón Sincronizar ahora para forzar una comprobación/conexión.
- Se registra la fecha de la última sincronización confirmada en el dispositivo.
- El respaldo manual existente ahora actualiza también el Centro de sincronización.
- Restaurar respaldo conserva la protección existente: primero descarga una copia de los datos actuales.
- No se cambió la estructura del documento de Firebase ni la lógica de datos existente.
- Service Worker actualizado a v19 para evitar caché de la versión anterior.
