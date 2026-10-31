# Prode LNA — Etapa 1

## Estado
Preparación del esquema D1, Worker independiente y pantallas informativas. **No hay autenticación ni grupos funcionales todavía**. La web continúa en modo «Próximamente». No se modificó el Worker de votaciones ni Mi Carrera.

## Arquitectura
- Identidad única por usuario autenticado (proveedor de identidad por definir y configurar).
- Un voto por usuario y partido, compartido entre Mi Carrera, ranking global y todos los grupos.
- Los puntos se calculan del lado del servidor con las reglas actuales de Mi Carrera; nunca se aceptan puntos enviados por el navegador.
- Grupos públicos visibles en el directorio y privados por invitación; roles owner/member.
- La API del Prode es independiente de `lna-votaciones-api`.

## Preparación en Cloudflare
1. Crear una base D1 llamada `lna-prode`.
2. Aplicar `database/prode/001_initial.sql` en esa D1 (no en la base de votaciones).
3. Completar `workers/prode/wrangler.toml` con el ID real y habilitar el binding DB.
4. Seleccionar proveedor de identidad que valide tokens en el Worker, configurar claves y reglas de acceso.
5. Implementar y probar creación/unión de grupos con autenticación, límites y validación de permisos antes de activar controles en la web.
6. Planificar migración verificable de votos anónimos existentes: **no confiar automáticamente en puntos o historial provistos por localStorage**.

## API preparada
- `GET /api/prode/health`: estado de preparación.
- `GET /api/prode/groups/public`: directorio de grupos públicos (requiere D1).
- Todas las operaciones de escritura devuelven 405 hasta implementar autenticación segura.

## Seguridad
No publicar secretos ni credenciales en GitHub. No usar identificadores de visitante como autenticación. No activar creación de grupos ni rankings basados en votos locales hasta que exista verificación de identidad y migración segura.
