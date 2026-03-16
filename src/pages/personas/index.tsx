import React from 'react'
import {
  createPersona,
  deletePersona,
  getPersonasByRole,
  updatePersona,
} from './request'
import { PERSONAS_TABS, type CreatePersonaDTO, type PersonaResponseDTO, type PersonRole } from './type'
import './styles.css'

/** Búsqueda: letras (con tildes), números, sin espacio inicial y un solo espacio entre palabras */
function sanitizeSearch(value: string): string {
  const allowed = value.replace(/[^a-zA-Z0-9áéíóúüÁÉÍÓÚÜñÑ\s]/g, '')
  return allowed.replace(/\s+/g, ' ').trimStart()
}

/** Letras (incl. áéíóúüñ), sin espacio al inicio, un solo espacio entre palabras, máx 50 */
function sanitizeNombreApellido(value: string): string {
  const noSpecial = value.replace(/[^a-zA-ZáéíóúüÁÉÍÓÚÜñÑ\s]/g, '')
  const singleSpace = noSpecial.replace(/\s+/g, ' ').trimStart()
  return singleSpace.slice(0, 50)
}

/** Solo dígitos, máx 8 */
function sanitizeDNI(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8)
}

/** Solo números y + (el + solo al inicio), máx 13 caracteres */
function sanitizeTelefono(value: string): string {
  const cleaned = value.replace(/[^\d+]/g, '')
  const digits = cleaned.replace(/\D/g, '')
  const hasPlus = cleaned.includes('+')
  const maxDigits = hasPlus ? 12 : 13
  return hasPlus ? '+' + digits.slice(0, maxDigits) : digits.slice(0, maxDigits)
}

/** Alfanumérico, tildes, guión -; un solo espacio entre palabras/números, sin espacio al inicio, máx 75 */
function sanitizeEscuela(value: string): string {
  const allowed = value.replace(/[^a-zA-Z0-9áéíóúüÁÉÍÓÚÜñÑ\-\s]/g, '')
  return allowed.replace(/\s+/g, ' ').trimStart().slice(0, 75)
}

/** Solo dígitos, máx 4 */
function sanitizeMesa(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4)
}

function emptyForm(rol: PersonRole): CreatePersonaDTO {
  return {
    Nombre: '',
    Apellido: '',
    DNI: '',
    Rol: rol,
    Telefono: '',
    Escuela: '',
    Mesa: '',
    LiderId: null,
  }
}

function formFromEntity(entity: PersonaResponseDTO): CreatePersonaDTO {
  return {
    Nombre: entity.Nombre,
    Apellido: entity.Apellido,
    DNI: entity.DNI,
    Rol: entity.Rol,
    Telefono: entity.Telefono ?? '',
    Escuela: entity.EscuelaNombre ?? '',
    Mesa: entity.NroMesa != null ? String(entity.NroMesa) : '',
    LiderId: null,
  }
}

function normalizeOptionalString(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export default function PersonasPage(): React.JSX.Element {
  const [activeTabIndex, setActiveTabIndex] = React.useState(0)
  const tab = PERSONAS_TABS[activeTabIndex]
  const [list, setList] = React.useState<PersonaResponseDTO[]>([])
  const [listLoading, setListLoading] = React.useState(false)
  const [showForm, setShowForm] = React.useState(false)
  const [editingId, setEditingId] = React.useState<number | null>(null)
  const [form, setForm] = React.useState<CreatePersonaDTO>(() => emptyForm(tab.rol))
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  const [leaders, setLeaders] = React.useState<PersonaResponseDTO[]>([])
  const [leadersLoading, setLeadersLoading] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)

  const [stats, setStats] = React.useState({ referentes: 0, punteros: 0, votantes: 0 })
  const [statsLoading, setStatsLoading] = React.useState(false)
  const [reportesReferentes, setReportesReferentes] = React.useState<PersonaResponseDTO[]>([])
  const [reportesPunteros, setReportesPunteros] = React.useState<PersonaResponseDTO[]>([])
  const [reportesVotantes, setReportesVotantes] = React.useState<PersonaResponseDTO[]>([])
  const [reportesListsLoading, setReportesListsLoading] = React.useState(false)

  const [leaderFilterText, setLeaderFilterText] = React.useState('')
  const [leaderDropdownOpen, setLeaderDropdownOpen] = React.useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = React.useState(false)
  const leaderDropdownRef = React.useRef<HTMLDivElement>(null)
  const leaderBlurTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaderSelectRef = React.useRef<HTMLSelectElement>(null)

  const fetchList = React.useCallback(() => {
    if (tab.isReportes) return
    setListLoading(true)
    getPersonasByRole(tab.rol)
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setListLoading(false))
  }, [tab.rol, tab.isReportes])

  React.useEffect(() => {
    fetchList()
  }, [fetchList])

  React.useEffect(() => {
    if (tab.id === 'reportes') {
      setStatsLoading(true)
      Promise.all([
        getPersonasByRole(2),
        getPersonasByRole(3),
        getPersonasByRole(4),
      ])
        .then(([ref, pun, vot]) =>
          setStats({
            referentes: ref.length,
            punteros: pun.length,
            votantes: vot.length,
          })
        )
        .catch(() => setStats({ referentes: 0, punteros: 0, votantes: 0 }))
        .finally(() => setStatsLoading(false))
    }
  }, [tab.id])

  React.useEffect(() => {
    if (tab.isReportes) return
    setForm((prev) => ({ ...prev, Rol: tab.rol, LiderId: null }))
    setShowForm(false)
    setEditingId(null)
    setPage(1)
    setLeaderFilterText('')
    setLeaderDropdownOpen(false)
  }, [tab.rol, tab.isReportes])

  React.useEffect(() => {
    return () => {
      if (leaderBlurTimerRef.current) clearTimeout(leaderBlurTimerRef.current)
    }
  }, [])

  const filteredList = React.useMemo(() => {
    let base = list
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      base = list.filter(
        (p) =>
          p.Nombre.toLowerCase().includes(q) ||
          p.Apellido.toLowerCase().includes(q) ||
          (p.DNI && p.DNI.includes(q))
      )
    }
    return [...base].sort((a, b) => {
      const ap = (a.Apellido || '').toLowerCase()
      const bp = (b.Apellido || '').toLowerCase()
      if (ap < bp) return -1
      if (ap > bp) return 1
      const an = (a.Nombre || '').toLowerCase()
      const bn = (b.Nombre || '').toLowerCase()
      if (an < bn) return -1
      if (an > bn) return 1
      return 0
    })
  }, [list, search])

  const totalPages = Math.max(1, Math.ceil(filteredList.length / perPage))
  const paginatedList = React.useMemo(() => {
    const start = (page - 1) * perPage
    return filteredList.slice(start, start + perPage)
  }, [filteredList, page, perPage])

  React.useEffect(() => {
    if (tab.isReportes || tab.leaderRole == null) {
      setLeaders([])
      return
    }
    setLeadersLoading(true)
    getPersonasByRole(tab.leaderRole)
      .then(setLeaders)
      .catch(() => setLeaders([]))
      .finally(() => setLeadersLoading(false))
  }, [tab.leaderRole, tab.isReportes])

  React.useEffect(() => {
    if (!tab.isReportes) return
    setReportesListsLoading(true)
    Promise.all([
      getPersonasByRole(2),
      getPersonasByRole(3),
      getPersonasByRole(4),
    ])
      .then(([ref, pun, vot]) => {
        setReportesReferentes(ref)
        setReportesPunteros(pun)
        setReportesVotantes(vot)
      })
      .catch(() => {
        setReportesReferentes([])
        setReportesPunteros([])
        setReportesVotantes([])
      })
      .finally(() => setReportesListsLoading(false))
  }, [tab.isReportes])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm(tab.rol))
    setShowForm(true)
    setError(null)
    setSuccessMessage(null)
  }

  /** Genera el HTML del reporte jerárquico (referentes / punteros / votantes) */
  function buildReportHtml(rol: 2 | 3 | 4, list: PersonaResponseDTO[]): string {
    const now = new Date()
    const groupTitle =
      rol === 2 ? 'LISTADO DE REFERENTES' : rol === 3 ? 'LISTADO DE PUNTEROS' : 'LISTADO DE VOTANTES'
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`

    const groups = new Map<string, PersonaResponseDTO[]>()
    list.forEach((p) => {
      const key = p.LiderNombre ?? 'Sin líder'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(p)
    })

    const groupEntries = Array.from(groups.entries()).sort(([a], [b]) => {
      const aParts = a.split(' ')
      const bParts = b.split(' ')
      const aLast = aParts[aParts.length - 1].toLowerCase()
      const bLast = bParts[bParts.length - 1].toLowerCase()
      if (aLast < bLast) return -1
      if (aLast > bLast) return 1
      return a.localeCompare(b, 'es', { sensitivity: 'base' })
    })

    const rowsHtml = groupEntries
      .map(([leaderName, persons], groupIndex) => {
        const parts = leaderName.split(' ')
        const leaderApellido = parts.length > 1 ? parts[parts.length - 1] : leaderName
        const leaderNombre = parts.length > 1 ? parts.slice(0, -1).join(' ') : ''

        const sortedPersons = [...persons].sort((a, b) => {
          const ap = (a.Apellido || '').toLowerCase()
          const bp = (b.Apellido || '').toLowerCase()
          if (ap < bp) return -1
          if (ap > bp) return 1
          const an = (a.Nombre || '').toLowerCase()
          const bn = (b.Nombre || '').toLowerCase()
          if (an < bn) return -1
          if (an > bn) return 1
          return 0
        })

        const leaderRow = `
            <tr class="reportLeaderRow">
              <td>${groupIndex + 1}</td>
              <td><strong>${leaderApellido.toUpperCase()}</strong></td>
              <td><strong>${leaderNombre}</strong></td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
            </tr>`

        const subRows = sortedPersons
          .map(
            (p, idx) => `
                <tr class="reportSubRow">
                  <td>${groupIndex + 1}.${idx + 1}</td>
                  <td class="reportSubApellido">${p.Apellido}</td>
                  <td>${p.Nombre}</td>
                  <td>${p.DNI}</td>
                  <td>${p.Telefono ?? '—'}</td>
                  <td>${p.EscuelaNombre ?? '—'}</td>
                  <td>${p.NroMesa ?? '—'}</td>
                </tr>`
          )
          .join('')

        const spacer = groupIndex < groupEntries.length - 1
          ? '<tr class="reportGroupSpacer"><td colspan="7"></td></tr>'
          : ''
        return leaderRow + subRows + spacer
      })
      .join('')

    const pageTitle = rol === 2 ? 'Listado de Referentes' : rol === 3 ? 'Listado de Punteros' : 'Listado de Votantes'
    return `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charSet="utf-8" />
          <title>Reporte - ${pageTitle}</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; }
            .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
            h1 { font-size: 22px; margin: 0; letter-spacing: 0.02em; }
            .meta { color: #555; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background: #f3f4f6; }
            tr.reportLeaderRow { background: #e5e7eb; font-weight: bold; }
            tr.reportSubRow { background: #fff; }
            tr.reportSubRow td.reportSubApellido { padding-left: 24px; }
            tr.reportGroupSpacer td { height: 10px; border: none; border-left: 1px solid #ccc; border-right: 1px solid #ccc; background: #fff; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${groupTitle}</h1>
            <div class="meta">Fecha: ${formattedDate}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Apellido</th>
                <th>Nombre</th>
                <th>DNI</th>
                <th>Teléfono</th>
                <th>Escuela</th>
                <th>Mesa</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
      `
  }

  /** Reporte jerárquico: Referente → Punteros → Votantes (1, 1.1, 1.1.1, 1.1.2, 1.2, …) */
  function buildJerarquiaReportHtml(): string {
    const now = new Date()
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`

    const sortByApellidoNombre = (a: PersonaResponseDTO, b: PersonaResponseDTO) => {
      const ap = (a.Apellido || '').toLowerCase()
      const bp = (b.Apellido || '').toLowerCase()
      if (ap < bp) return -1
      if (ap > bp) return 1
      const an = (a.Nombre || '').toLowerCase()
      const bn = (b.Nombre || '').toLowerCase()
      if (an < bn) return -1
      if (an > bn) return 1
      return 0
    }

    const refs = [...reportesReferentes].sort(sortByApellidoNombre)
    const punterosByLider = new Map<number, PersonaResponseDTO[]>()
    reportesPunteros.forEach((p) => {
      const lid = p.LiderId ?? 0
      if (!punterosByLider.has(lid)) punterosByLider.set(lid, [])
      punterosByLider.get(lid)!.push(p)
    })
    punterosByLider.forEach((arr) => arr.sort(sortByApellidoNombre))

    const votantesByLider = new Map<number, PersonaResponseDTO[]>()
    reportesVotantes.forEach((v) => {
      const lid = v.LiderId ?? 0
      if (!votantesByLider.has(lid)) votantesByLider.set(lid, [])
      votantesByLider.get(lid)!.push(v)
    })
    votantesByLider.forEach((arr) => arr.sort(sortByApellidoNombre))

    const rows: string[] = []
    refs.forEach((ref, i) => {
      const numRef = i + 1
      rows.push(`
        <tr class="reportRowRef">
          <td class="reportNumRef">${numRef}</td>
          <td>Referente</td>
          <td><strong>${ref.Apellido}</strong></td>
          <td><strong>${ref.Nombre}</strong></td>
          <td>${ref.DNI}</td>
          <td>${ref.Telefono ?? '—'}</td>
          <td>${ref.EscuelaNombre ?? '—'}</td>
          <td>${ref.NroMesa ?? '—'}</td>
        </tr>`)

      const punteros = punterosByLider.get(ref.Id) ?? []
      punteros.forEach((pun, j) => {
        const numPun = `${numRef}.${j + 1}`
        rows.push(`
        <tr class="reportRowPun">
          <td class="reportNumPun">${numPun}</td>
          <td>Puntero</td>
          <td class="reportIndent1">${pun.Apellido}</td>
          <td>${pun.Nombre}</td>
          <td>${pun.DNI}</td>
          <td>${pun.Telefono ?? '—'}</td>
          <td>${pun.EscuelaNombre ?? '—'}</td>
          <td>${pun.NroMesa ?? '—'}</td>
        </tr>`)

        const votantes = votantesByLider.get(pun.Id) ?? []
        votantes.forEach((vot, k) => {
          const numVot = `${numPun}.${k + 1}`
          rows.push(`
        <tr class="reportRowVot">
          <td class="reportNumVot">${numVot}</td>
          <td class="reportRolVot">Votante</td>
          <td class="reportIndent2">${vot.Apellido}</td>
          <td>${vot.Nombre}</td>
          <td>${vot.DNI}</td>
          <td>${vot.Telefono ?? '—'}</td>
          <td>${vot.EscuelaNombre ?? '—'}</td>
          <td>${vot.NroMesa ?? '—'}</td>
        </tr>`)
        })
      })
      if (i < refs.length - 1) {
        rows.push('<tr class="reportJerarquiaSpacer"><td colspan="8"></td></tr>')
      }
    })

    const rowsHtml = rows.join('')

    return `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charSet="utf-8" />
          <title>Reporte - Jerarquía Referentes / Punteros / Votantes</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; }
            .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
            h1 { font-size: 22px; margin: 0; letter-spacing: 0.02em; }
            .meta { color: #555; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background: #f3f4f6; }
            tr.reportRowRef { background: #e5e7eb; font-weight: bold; }
            tr.reportRowPun { background: #f9fafb; }
            tr.reportRowVot { background: #fff; }
            td.reportNumRef { padding-left: 8px; }
            td.reportNumPun { padding-left: 28px; }
            td.reportNumVot { padding-left: 56px; }
            td.reportRolVot { padding-left: 24px; }
            td.reportIndent1 { padding-left: 24px; }
            td.reportIndent2 { padding-left: 40px; }
            tr.reportJerarquiaSpacer td { height: 14px; border: none; border-left: 1px solid #ccc; border-right: 1px solid #ccc; background: #fff; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>JERARQUÍA REFERENTES → PUNTEROS → VOTANTES</h1>
            <div class="meta">Fecha: ${formattedDate}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Rol</th>
                <th>Apellido</th>
                <th>Nombre</th>
                <th>DNI</th>
                <th>Teléfono</th>
                <th>Escuela</th>
                <th>Mesa</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
      `
  }

  function openReportWindow(html: string): void {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.open()
    w.document.write(html)
    w.document.close()
    w.focus()
  }

  function viewReportFromReportes(rol: 2 | 3 | 4) {
    const list = rol === 2 ? reportesReferentes : rol === 3 ? reportesPunteros : reportesVotantes
    if (list.length === 0) {
      window.alert('No hay datos para mostrar.')
      return
    }
    openReportWindow(buildReportHtml(rol, list))
  }

  function printReportFromReportes(rol: 2 | 3 | 4) {
    const list = rol === 2 ? reportesReferentes : rol === 3 ? reportesPunteros : reportesVotantes
    if (list.length === 0) {
      window.alert('No hay datos para imprimir.')
      return
    }
    const w = window.open('', '_blank')
    if (!w) return
    w.document.open()
    w.document.write(buildReportHtml(rol, list))
    w.document.close()
    w.focus()
    w.print()
  }

  function viewJerarquiaReport() {
    openReportWindow(buildJerarquiaReportHtml())
  }

  function printJerarquiaReport() {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.open()
    w.document.write(buildJerarquiaReportHtml())
    w.document.close()
    w.focus()
    w.print()
  }

  function handleViewReport() {
    if (tab.isReportes) return
    if (filteredList.length === 0) {
      window.alert('No hay datos para imprimir.')
      return
    }

    const now = new Date()
    const formattedDateTime = now.toLocaleString('es-AR')

    let html: string

    if (tab.rol === 2 || tab.rol === 3 || tab.rol === 4) {
      html = buildReportHtml(tab.rol, filteredList)
    } else {
      // Otros roles: listado simple ordenado por apellido
      const first = filteredList[0]
      const groupTitle = first?.LiderNombre || tab.label

      // Ordenar alfabéticamente por Apellido, luego Nombre
      const sorted = [...filteredList].sort((a, b) => {
        const ap = (a.Apellido || '').toLowerCase()
        const bp = (b.Apellido || '').toLowerCase()
        if (ap < bp) return -1
        if (ap > bp) return 1
        const an = (a.Nombre || '').toLowerCase()
        const bn = (b.Nombre || '').toLowerCase()
        if (an < bn) return -1
        if (an > bn) return 1
        return 0
      })

      const rowsHtml = sorted
        .map(
          (p, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${p.Apellido}</td>
              <td>${p.Nombre}</td>
              <td>${p.DNI}</td>
              <td>${p.Telefono ?? '—'}</td>
              <td>${p.EscuelaNombre ?? '—'}</td>
              <td>${p.NroMesa ?? '—'}</td>
            </tr>`
        )
        .join('')

      html = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charSet="utf-8" />
          <title>Reporte - ${groupTitle}</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; }
            .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
            h1 { font-size: 22px; margin: 0; }
            .meta { color: #555; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Grupo: ${groupTitle}</h1>
            <div class="meta">Fecha y hora: ${formattedDateTime}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Apellido</th>
                <th>Nombre</th>
                <th>DNI</th>
                <th>Teléfono</th>
                <th>Escuela</th>
                <th>Mesa</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
      `
    }

    openReportWindow(html)
  }

  function handlePrintReport() {
    if (tab.isReportes) return
    if (filteredList.length === 0) {
      window.alert('No hay datos para imprimir.')
      return
    }

    const now = new Date()
    const formattedDateTime = now.toLocaleString('es-AR')

    let html: string

    if (tab.rol === 2 || tab.rol === 3 || tab.rol === 4) {
      html = buildReportHtml(tab.rol, filteredList)
    } else {
      const first = filteredList[0]
      const groupTitle =
        tab.rol === 2 || tab.rol === 4
          ? first?.LiderNombre || 'Grupo sin nombre'
          : tab.label

      const sorted = [...filteredList].sort((a, b) => {
        const ap = (a.Apellido || '').toLowerCase()
        const bp = (b.Apellido || '').toLowerCase()
        if (ap < bp) return -1
        if (ap > bp) return 1
        const an = (a.Nombre || '').toLowerCase()
        const bn = (b.Nombre || '').toLowerCase()
        if (an < bn) return -1
        if (an > bn) return 1
        return 0
      })

      const rowsHtml = sorted
        .map(
          (p, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${p.Apellido}</td>
              <td>${p.Nombre}</td>
              <td>${p.DNI}</td>
              <td>${p.Telefono ?? '—'}</td>
              <td>${p.EscuelaNombre ?? '—'}</td>
              <td>${p.NroMesa ?? '—'}</td>
            </tr>`
        )
        .join('')

      html = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charSet="utf-8" />
          <title>Reporte - ${groupTitle}</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; }
            .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
            h1 { font-size: 22px; margin: 0; }
            .meta { color: #555; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Grupo: ${groupTitle}</h1>
            <div class="meta">Fecha y hora: ${formattedDateTime}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Apellido</th>
                <th>Nombre</th>
                <th>DNI</th>
                <th>Teléfono</th>
                <th>Escuela</th>
                <th>Mesa</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
      `
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  function openEdit(entity: PersonaResponseDTO) {
    setEditingId(entity.Id)
    setForm(formFromEntity(entity))
    setShowForm(true)
    setError(null)
    setSuccessMessage(null)
  }

  function closeForm() {
    setShowCloseConfirm(false)
    setShowForm(false)
    setEditingId(null)
    setError(null)
    setLeaderFilterText('')
    setLeaderDropdownOpen(false)
  }

  function hasFormData(): boolean {
    const empty = emptyForm(tab.rol)
    return (
      (form.Nombre ?? '').trim() !== (empty.Nombre ?? '').trim() ||
      (form.Apellido ?? '').trim() !== (empty.Apellido ?? '').trim() ||
      (form.DNI ?? '').trim() !== (empty.DNI ?? '').trim() ||
      (form.Telefono ?? '').trim() !== (empty.Telefono ?? '').trim() ||
      (form.Escuela ?? '').trim() !== (empty.Escuela ?? '').trim() ||
      (form.Mesa ?? '').trim() !== (empty.Mesa ?? '').trim() ||
      form.LiderId != null
    )
  }

  function handleCloseForm() {
    if (hasFormData()) {
      setShowCloseConfirm(true)
      return
    }
    closeForm()
  }

  function confirmCloseAndDiscard() {
    setShowCloseConfirm(false)
    closeForm()
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    const payload: CreatePersonaDTO = {
      Nombre: form.Nombre.trim(),
      Apellido: form.Apellido.trim(),
      DNI: form.DNI.trim(),
      Rol: form.Rol,
      Telefono: normalizeOptionalString(form.Telefono ?? ''),
      Escuela: normalizeOptionalString(form.Escuela ?? ''),
      Mesa: normalizeOptionalString(form.Mesa ?? ''),
      LiderId: form.LiderId ?? null,
    }

    if (!payload.Nombre || !payload.Apellido || !payload.DNI) {
      setError('Nombre, Apellido y DNI son obligatorios.')
      return
    }

    if (tab.leaderRole != null) {
      if (payload.LiderId == null || payload.LiderId <= 0) {
        const leaderLabel =
          tab.rol === 2 ? 'Grupo' : tab.rol === 3 ? 'Referente' : 'Puntero'
        setError(`Debe seleccionar un ${leaderLabel}.`)
        return
      }
    }

    setIsSubmitting(true)
    try {
      if (editingId != null) {
        await updatePersona(editingId, payload)
        setSuccessMessage('Actualizado correctamente.')
        closeForm()
      } else {
        await createPersona(payload)
        setSuccessMessage('Creado correctamente.')
        setForm(emptyForm(tab.rol))
      }
      fetchList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(entity: PersonaResponseDTO) {
    const name = `${entity.Nombre} ${entity.Apellido}`
    if (!window.confirm(`¿Eliminar a ${name}?`)) return
    try {
      await deletePersona(entity.Id)
      fetchList()
      if (editingId === entity.Id) closeForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar.')
    }
  }

  const leaderLabel =
    tab.rol === 2 ? 'Grupo' : tab.rol === 3 ? 'Referente' : tab.rol === 4 ? 'Puntero' : null

  function getLeaderDisplay(p: PersonaResponseDTO, options?: { showReferente?: boolean }) {
    const base = `${p.Apellido ?? ''} ${p.Nombre ?? ''}${p.DNI ? ` (DNI ${p.DNI})` : ''}`.trim()
    if (options?.showReferente && p.LiderNombre) {
      return `${base} - Referente: ${p.LiderNombre}`
    }
    return base
  }

  const leaderDisplayOpts = tab.rol === 4 ? { showReferente: true } : undefined

  const sortLeadersByApellidoNombre = (a: PersonaResponseDTO, b: PersonaResponseDTO) => {
    const ap = (a.Apellido || '').toLowerCase()
    const bp = (b.Apellido || '').toLowerCase()
    if (ap < bp) return -1
    if (ap > bp) return 1
    const an = (a.Nombre || '').toLowerCase()
    const bn = (b.Nombre || '').toLowerCase()
    if (an < bn) return -1
    if (an > bn) return 1
    return 0
  }

  const leadersSorted = React.useMemo(
    () => [...leaders].sort(sortLeadersByApellidoNombre),
    [leaders]
  )

  const filteredLeadersForAutocomplete = React.useMemo(() => {
    const base = leaders.filter((p) => p.Id !== (form.LiderId ?? 0))
    const filtered = leaderFilterText.trim()
      ? (() => {
          const q = leaderFilterText.trim().toLowerCase()
          return base.filter(
            (p) =>
              (p.Nombre && p.Nombre.toLowerCase().includes(q)) ||
              (p.Apellido && p.Apellido.toLowerCase().includes(q)) ||
              (p.DNI && String(p.DNI).toLowerCase().includes(q))
          )
        })()
      : base
    return [...filtered].sort(sortLeadersByApellidoNombre)
  }, [leaders, leaderFilterText, form.LiderId])

  const tabIcons: Record<string, React.ReactNode> = {
    admin: (
      <svg className="personasTabIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    grupos: (
      <svg className="personasTabIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
        <path d="M16 11l2 2 4-4" />
      </svg>
    ),
    referentes: (
      <svg className="personasTabIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20v-2a4 4 0 014-4h8a4 4 0 014 4v2" />
        <path d="M12 12v4M10 16h4" />
      </svg>
    ),
    punteros: (
      <svg className="personasTabIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      </svg>
    ),
    votantes: (
      <svg className="personasTabIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
    reportes: (
      <svg className="personasTabIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" />
        <path d="M18 17V9M13 17V5M8 17v-3" />
      </svg>
    ),
  }

  return (
    <section className="personasPage">
      <nav className="personasNav" aria-label="Tipos de persona">
        <div className="personasTabs" role="tablist">
          {PERSONAS_TABS.map((t, i) => (
            <button
              key={`tab-${t.id}-${i}`}
              type="button"
              role="tab"
              aria-selected={activeTabIndex === i}
              aria-controls={`panel-${t.id}`}
              id={`tab-${t.id}`}
              className={`personasTab ${activeTabIndex === i ? 'personasTabActive' : ''}`}
              onClick={() => setActiveTabIndex(i)}
            >
              <span className="personasTabIconWrap">{tabIcons[t.id]}</span>
              <span className="personasTabLabel">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div
        id={`panel-${tab.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab.id}`}
        className="personasPanel"
      >
        <nav key="breadcrumb" className="personasBreadcrumb" aria-label="Miga de pan">
          <span><a href="#">Inicio</a></span>
          <span className="personasBreadcrumbSep">/</span>
          <span><a href="#">Personas</a></span>
          <span className="personasBreadcrumbSep">/</span>
          <span>{tab.label}</span>
        </nav>

        <header key="panelHeader" className="personasPanelHeader">
          <div className="personasPanelTitleBlock">
            <h2>
              {tab.id === 'reportes' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18" />
                  <path d="M18 17V9M13 17V5M8 17v-3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20v-2a4 4 0 014-4h8a4 4 0 014 4v2" />
                </svg>
              )}
              {tab.label}
            </h2>
            <p className="personasPanelDescription">
              {tab.isReportes
                ? 'Estadísticas por rol: referentes, punteros, votantes y total de votos.'
                : `Administrá los ${tab.label.toLowerCase()} del sistema. Creá, editá o eliminá registros desde la tabla.`}
            </p>
          </div>
          {!tab.isReportes && (
            <div className="personasHeaderActions">
              <button type="button" className="personasButton personasButtonPrimary" onClick={openCreate}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Nuevo {tab.singular}
              </button>
              {(tab.id === 'referentes' || tab.id === 'punteros' || tab.id === 'votantes') && (
                <>
                  <button
                    type="button"
                    className="personasButton personasButtonSecondary"
                    onClick={handleViewReport}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Ver reporte
                  </button>
                  <button
                    type="button"
                    className="personasButton personasButtonSecondary"
                    onClick={handlePrintReport}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9V3h12v6" />
                      <path d="M6 17v4h12v-4" />
                      <path d="M6 13h12a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v1a3 3 0 0 0 3 3z" />
                      <path d="M9 17h6" />
                    </svg>
                    Imprimir reporte
                  </button>
                </>
              )}
            </div>
          )}
        </header>

        {tab.isReportes ? (
          <div key="reportesPanel" className="reportesPanel">
            {statsLoading ? (
              <p className="personasLoading">Cargando estadísticas...</p>
            ) : (
              <div className="reportesGrid">
                <div className="reportesCard">
                  <span className="reportesCardLabel">Referentes</span>
                  <span className="reportesCardValue">{stats.referentes}</span>
                </div>
                <div className="reportesCard">
                  <span className="reportesCardLabel">Punteros</span>
                  <span className="reportesCardValue">{stats.punteros}</span>
                </div>
                <div className="reportesCard">
                  <span className="reportesCardLabel">Votantes</span>
                  <span className="reportesCardValue">{stats.votantes}</span>
                </div>
                <div className="reportesCard reportesCardTotal">
                  <span className="reportesCardLabel">Total de votos</span>
                  <span className="reportesCardValue">{stats.referentes + stats.punteros + stats.votantes}</span>
                </div>
              </div>
            )}

            <h3 className="reportesListadosTitle">Listados para ver o imprimir</h3>
            {reportesListsLoading ? (
              <p className="personasLoading">Cargando listados...</p>
            ) : (
              <div className="reportesListadosGrid">
                <div className="reportesListadoCard">
                  <span className="reportesListadoCardLabel">Todos los referentes</span>
                  <span className="reportesListadoCardCount">{reportesReferentes.length} referentes</span>
                  <div className="reportesListadoCardActions">
                    <button type="button" className="personasButton personasButtonSecondary" onClick={() => viewReportFromReportes(2)} disabled={reportesReferentes.length === 0}>
                      Ver reporte
                    </button>
                    <button type="button" className="personasButton" onClick={() => printReportFromReportes(2)} disabled={reportesReferentes.length === 0}>
                      Imprimir reporte
                    </button>
                  </div>
                </div>
                <div className="reportesListadoCard">
                  <span className="reportesListadoCardLabel">Todos los punteros</span>
                  <span className="reportesListadoCardCount">{reportesPunteros.length} punteros</span>
                  <div className="reportesListadoCardActions">
                    <button type="button" className="personasButton personasButtonSecondary" onClick={() => viewReportFromReportes(3)} disabled={reportesPunteros.length === 0}>
                      Ver reporte
                    </button>
                    <button type="button" className="personasButton" onClick={() => printReportFromReportes(3)} disabled={reportesPunteros.length === 0}>
                      Imprimir reporte
                    </button>
                  </div>
                </div>
                <div className="reportesListadoCard">
                  <span className="reportesListadoCardLabel">Todos los votantes</span>
                  <span className="reportesListadoCardCount">{reportesVotantes.length} votantes</span>
                  <div className="reportesListadoCardActions">
                    <button type="button" className="personasButton personasButtonSecondary" onClick={() => viewReportFromReportes(4)} disabled={reportesVotantes.length === 0}>
                      Ver reporte
                    </button>
                    <button type="button" className="personasButton" onClick={() => printReportFromReportes(4)} disabled={reportesVotantes.length === 0}>
                      Imprimir reporte
                    </button>
                  </div>
                </div>
                <div className="reportesListadoCard reportesListadoCardJerarquia">
                  <span className="reportesListadoCardLabel">Jerarquía completa</span>
                  <span className="reportesListadoCardCount">Referentes → Punteros → Votantes</span>
                  <div className="reportesListadoCardActions">
                    <button type="button" className="personasButton personasButtonSecondary" onClick={viewJerarquiaReport}>
                      Ver reporte
                    </button>
                    <button type="button" className="personasButton" onClick={printJerarquiaReport}>
                      Imprimir reporte
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
        <div key="searchWrap" className={`personasSearchWrap${showForm ? ' personasSearchWrapDisabled' : ''}`}>
          <svg className="personasSearchIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Buscar por nombre, apellido o DNI"
            value={search}
            onChange={(e) => { setSearch(sanitizeSearch(e.target.value)); setPage(1) }}
            disabled={showForm}
            aria-label="Buscar"
          />
        </div>

        {showForm && (
          <div key="formCard" className="personasCard">
            <div className="personasFormHeader">
              <h3 className="personasFormTitle">
                {editingId != null ? `Editar ${tab.singular}` : `Crear ${tab.singular}`}
              </h3>
              <button
                type="button"
                className="personasFormClose"
                onClick={handleCloseForm}
                title="Cerrar (se pierden los datos no guardados)"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <form className="personasForm" onSubmit={onSubmit}>
              <label className="personasField">
                <span className="personasFieldLabel">Nombre *</span>
                <input
                  className="personasInput"
                  value={form.Nombre}
                  onChange={(e) => setForm((s) => ({ ...s, Nombre: sanitizeNombreApellido(e.target.value) }))}
                  maxLength={50}
                  autoComplete="given-name"
                />
              </label>
              <label className="personasField">
                <span className="personasFieldLabel">Apellido *</span>
                <input
                  className="personasInput"
                  value={form.Apellido}
                  onChange={(e) => setForm((s) => ({ ...s, Apellido: sanitizeNombreApellido(e.target.value) }))}
                  maxLength={50}
                  autoComplete="family-name"
                />
              </label>
              <label className="personasField">
                <span className="personasFieldLabel">DNI *</span>
                <input
                  className="personasInput"
                  value={form.DNI}
                  onChange={(e) => setForm((s) => ({ ...s, DNI: sanitizeDNI(e.target.value) }))}
                  inputMode="numeric"
                  maxLength={8}
                  autoComplete="off"
                />
              </label>
              <label className="personasField">
                <span className="personasFieldLabel">Teléfono</span>
                <input
                  className="personasInput"
                  value={form.Telefono ?? ''}
                  onChange={(e) => setForm((s) => ({ ...s, Telefono: sanitizeTelefono(e.target.value) }))}
                  inputMode="tel"
                  maxLength={13}
                  autoComplete="tel"
                />
              </label>
              <label className="personasField">
                <span className="personasFieldLabel">Escuela</span>
                <input
                  className="personasInput"
                  value={form.Escuela ?? ''}
                  onChange={(e) => setForm((s) => ({ ...s, Escuela: sanitizeEscuela(e.target.value) }))}
                  maxLength={75}
                  autoComplete="organization"
                />
              </label>
              <label className="personasField">
                <span className="personasFieldLabel">Mesa</span>
                <input
                  className="personasInput"
                  value={form.Mesa ?? ''}
                  onChange={(e) => setForm((s) => ({ ...s, Mesa: sanitizeMesa(e.target.value) }))}
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="off"
                />
              </label>
              {leaderLabel != null && (
                <label className="personasField personasFieldFull">
                  <span className="personasFieldLabel">{leaderLabel} *</span>
                  <div
                    className="personasLeaderComboWrap"
                    ref={leaderDropdownRef}
                  >
                    <input
                      type="text"
                      className="personasInput personasLeaderInput"
                      placeholder={`Escribí nombre, apellido o DNI para buscar...`}
                      value={leaderFilterText}
                      onChange={(e) => {
                        const value = e.target.value
                        setLeaderFilterText(value)
                        if (value.trim() === '') {
                          setLeaderDropdownOpen(false)
                          setForm((s) => ({ ...s, LiderId: null }))
                        } else {
                          setLeaderDropdownOpen(true)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (
                          (e.key === 'Tab' || e.key === 'Enter') &&
                          leaderDropdownOpen &&
                          filteredLeadersForAutocomplete.length > 0
                        ) {
                          e.preventDefault()
                          const first = filteredLeadersForAutocomplete[0]
                          setForm((s) => ({ ...s, LiderId: first.Id }))
                          setLeaderFilterText(getLeaderDisplay(first, leaderDisplayOpts))
                          setLeaderDropdownOpen(false)
                          if (e.key === 'Tab') {
                            setTimeout(() => leaderSelectRef.current?.focus(), 0)
                          }
                        }
                      }}
                      onBlur={() => {
                        if (leaderBlurTimerRef.current) clearTimeout(leaderBlurTimerRef.current)
                        leaderBlurTimerRef.current = setTimeout(() => setLeaderDropdownOpen(false), 180)
                      }}
                      disabled={leadersLoading}
                      autoComplete="off"
                      aria-autocomplete="list"
                      aria-expanded={leaderDropdownOpen}
                    />
                    {leaderDropdownOpen && !leadersLoading && (
                      <ul
                        className="personasLeaderDropdown"
                        role="listbox"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {filteredLeadersForAutocomplete.length === 0 ? (
                          <li className="personasLeaderDropdownEmpty">Sin resultados</li>
                        ) : (
                          filteredLeadersForAutocomplete.map((p) => (
                            <li
                              key={`leader-ac-${p.Id}`}
                              role="option"
                              className="personasLeaderDropdownItem"
                              onMouseDown={() => {
                                if (leaderBlurTimerRef.current) clearTimeout(leaderBlurTimerRef.current)
                                setForm((s) => ({ ...s, LiderId: p.Id }))
                                setLeaderFilterText(getLeaderDisplay(p, leaderDisplayOpts))
                                setLeaderDropdownOpen(false)
                              }}
                            >
                              {getLeaderDisplay(p, leaderDisplayOpts)}
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>
                  <select
                    ref={leaderSelectRef}
                    className="personasInput personasLeaderSelect"
                    value={form.LiderId ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Number(e.target.value)
                      setForm((s) => ({ ...s, LiderId: val }))
                      if (val == null) {
                        setLeaderFilterText('')
                      } else {
                        const p = leaders.find((l) => l.Id === val)
                        setLeaderFilterText(p ? getLeaderDisplay(p, leaderDisplayOpts) : '')
                      }
                    }}
                    disabled={leadersLoading}
                    title={`O elegí un ${leaderLabel} de la lista`}
                  >
                    <option value="">
                      {leadersLoading ? 'Cargando...' : `Seleccione un ${leaderLabel}`}
                    </option>
                    {leadersSorted.map((p) => (
                      <option key={`leader-${p.Id}`} value={p.Id}>
                        {getLeaderDisplay(p, leaderDisplayOpts)}
                      </option>
                    ))}
                  </select>
                  {!leadersLoading && leaders.length === 0 && tab.leaderRole != null && (
                    <span className="personasFieldHint">
                      No hay {leaderLabel.toLowerCase()}s cargados. Cree primero uno en la pestaña
                      correspondiente.
                    </span>
                  )}
                </label>
              )}
              <div className="personasActions">
                <button className="personasButton" disabled={isSubmitting} type="submit">
                  {isSubmitting
                    ? 'Guardando...'
                    : editingId != null
                      ? 'Guardar cambios'
                      : `Crear ${tab.singular}`}
                </button>
                <button type="button" className="personasButton personasButtonSecondary" onClick={closeForm}>
                  Cancelar
                </button>
                <div className="personasStatus" role="status" aria-live="polite">
                  {error ? <span key="error" className="personasError">{error}</span> : null}
                  {successMessage ? <span key="success" className="personasSuccess">{successMessage}</span> : null}
                </div>
              </div>
            </form>
          </div>
        )}

        <div key="tableCard" className="personasTableCard">
        <div className="personasTableWrap">
          {listLoading ? (
            <p className="personasLoading">Cargando lista...</p>
          ) : filteredList.length === 0 ? (
            <p className="personasEmpty">
              {list.length === 0
                ? `No hay ${tab.label.toLowerCase()} cargados.`
                : 'No hay resultados para la búsqueda.'}
            </p>
          ) : (
            <table className="personasTable">
              <thead>
                <tr>
                  <th>Apellido</th>
                  <th>Nombre</th>
                  <th>DNI</th>
                  <th>Teléfono</th>
                  {tab.leaderRole != null && (
                    <th>
                      {tab.rol === 2
                        ? 'Grupo'
                        : tab.rol === 3
                          ? 'Referente'
                          : tab.rol === 4
                            ? 'Puntero'
                            : 'Líder / Grupo'}
                    </th>
                  )}
                  <th className="personasTableActions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((row) => (
                  <tr key={`persona-${row.Id}`}>
                    <td>{row.Apellido}</td>
                    <td>{row.Nombre}</td>
                    <td>{row.DNI}</td>
                    <td>{row.Telefono ?? '—'}</td>
                    {tab.leaderRole != null && <td>{row.LiderNombre ?? '—'}</td>}
                    <td className="personasTableActions">
                      <button
                        type="button"
                        className="personasTableLink"
                        onClick={() => openEdit(row)}
                        title="Editar"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="personasTableLink personasTableLinkDelete"
                        onClick={() => handleDelete(row)}
                        title="Eliminar"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!listLoading && filteredList.length > 0 && (
          <div className="personasPagination">
            <span>Total: {filteredList.length} {tab.label.toLowerCase()}</span>
            <div className="personasPaginationNav">
              <button
                type="button"
                className="personasPaginationBtn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Página anterior"
              >
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={`page-${n}`}
                  type="button"
                  className={`personasPaginationBtn ${page === n ? 'personasPaginationBtnActive' : ''}`}
                  onClick={() => setPage(n)}
                  aria-current={page === n ? 'page' : undefined}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className="personasPaginationBtn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Página siguiente"
              >
                →
              </button>
              <div className="personasPaginationPerPage">
                <select
                  value={perPage}
                  onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
                  aria-label="Elementos por página"
                >
                  {[7, 10, 15, 25].map((n) => (
                    <option key={`perpage-${n}`} value={n}>{n} / página</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
        </div>
          </>
        )}
      </div>

      {showCloseConfirm && (
        <div
          className="personasConfirmOverlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="personasConfirmTitle"
          aria-describedby="personasConfirmMessage"
        >
          <div className="personasConfirmModal">
            <h3 id="personasConfirmTitle" className="personasConfirmTitle">Advertencia</h3>
            <p id="personasConfirmMessage" className="personasConfirmMessage">
              ¿Cerrar sin guardar? Se perderá todo lo cargado.
            </p>
            <div className="personasConfirmActions">
              <button type="button" className="personasButton personasButtonSecondary" onClick={() => setShowCloseConfirm(false)}>
                Cancelar
              </button>
              <button type="button" className="personasButton personasConfirmAccept" onClick={confirmCloseAndDiscard}>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
