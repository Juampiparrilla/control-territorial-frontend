# Control Territorial - Frontend

Aplicacion (React + TypeScript + Vite) para administrar personas y generar listados/reportes.

## Conceptos principales

### Roles (tabs)
La pagina `Personas` organiza la UI por rol usando `PERSONAS_TABS`:

- `Grupo` (tab `grupos`, rol 1)
- `Referente` (tab `referentes`, rol 2)
- `Puntero` (tab `punteros`, rol 3)
- `Votante` (tab `votantes`, rol 4)
- `Reportes` (tab `reportes`, sin CRUD; genera listados)

Cada tab de CRUD permite crear/editar/eliminar registros del rol correspondiente.
La relacion jerarquica se guarda via `LiderId`.

## Jerarquia

`Grupo -> Referente -> Puntero -> Votante`

## Filtros y sincronizacion (Reportes por seleccion)

En `Personas > Reportes` hay una card `Reportes por seleccion` con 3 selects:

- `Grupo`
- `Referente`
- `Puntero`

Comportamiento:

- Los selects dependientes se habilitan/deshabilitan segun la seleccion del nivel superior.
- Al entrar a `Reportes`, los selects arrancan en placeholder (interpretado como “Todos”).
- Si cambias `Grupo`, se resetean `Referente` y `Puntero` a placeholder para evitar combinaciones inconsistentes.
- “placeholder = Todos” significa que ese nivel no filtra (no se arma una jerarquia parcial).

### Acciones unificadas: `Ver` / `Imprimir`
En `Reportes por seleccion` hay solo 2 iconos:

- `Ver`: abre el HTML del listado
- `Imprimir`: imprime el mismo HTML con `window.print()`

La combinacion de selects decide el listado (respetando la jerarquia hasta el nivel elegido):

- `Grupo=Todos`, `Referente=Todos`, `Puntero=Todos`:
  - `LISTADO DE GRUPOS` (solo informacion de grupos)
- `Grupo=uno`, `Referente=Todos`, `Puntero=Todos`:
  - `Listado de Referentes` del grupo seleccionado
- `Grupo=uno`, `Referente=uno`, `Puntero=Todos`:
  - `Punteros y votantes del referente` (muestra votantes de los punteros del referente)
- `Grupo=uno`, `Referente=uno`, `Puntero=uno`:
  - `Listado de Votantes` del puntero seleccionado

Encabezado del reporte:

- Antes del titulo se muestra una linea con la ruta hasta el nivel elegido:
  - `Grupo: ...`
  - `Grupo: ... -> Referente: ...`
  - `Grupo: ... -> Referente: ... -> Puntero: ...`
- Donde un nivel esta en placeholder, se escribe `Todos`.

## Form CRUD (autocomplete/select) y roles

Al crear/editar registros de roles que dependen de otros (por ejemplo `Referente` depende de `Grupo`, etc.), el campo de relacion usa:

- Input de busqueda (autocomplete) mas un icono que revela el dropdown.
- `form.LiderId` es la fuente de verdad (evita duplicacion visual entre input y select).
- Si el usuario borra el texto cuando hay una seleccion, se permite deseleccionar limpiando `form.LiderId`.
- Al editar un registro, el campo de relacion (ej. `Grupo`) se pre-carga con el valor que tenia el registro original.

## Reportes globales (cards)

Ademas de `Reportes por seleccion`, existen cards globales en `Reportes` (ej. `Todos los referentes`, `Todos los punteros`, `Todos los votantes`, `Cantidades totales`).

