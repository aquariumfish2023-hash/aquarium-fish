# Aquarium Fish — Etapa 1: limpieza y estabilidad

Cambios realizados sin modificar la estructura de Firebase ni eliminar funciones de negocio:

- Limpieza de tres implementaciones antiguas duplicadas de `renderInventory`, `renderSales` y `renderMoves`.
- Arranque seguro: un `localStorage` corrupto ya no bloquea la carga de la aplicación.
- Guardado con manejo de errores para evitar fallos silenciosos.
- Indicador visible de sincronización en la cabecera y en el panel de datos.
- Mensajes de sincronización más claros: guardando, conectado, guardado local y error.
- Protección global frente a errores de interfaz y promesas no controladas, mostrando mensajes sencillos al usuario y dejando el detalle técnico en la consola.
- Eliminación de un ID HTML duplicado (`availabilityPanel`).
- Service Worker actualizado de `v17` a `v18` para forzar la nueva caché de archivos.
- No se cambió la estructura de datos de Firebase.
- No se eliminaron módulos de Inventario, Ventas, Cotizador, Clientes, Caja, Encargos, Reportes, Respaldo, Lista para clientes ni JARVIS.

## Verificación

- `app.js`: sintaxis válida.
- `jarvis.js`: sintaxis válida.
- `sw.js`: sintaxis válida.
- No quedan funciones JavaScript duplicadas con el mismo nombre.
- No quedan IDs HTML duplicados.
