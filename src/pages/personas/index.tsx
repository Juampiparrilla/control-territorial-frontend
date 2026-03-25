import React from 'react'
import {
  createPersona,
  deletePersona,
  getPersonasByRole,
  matchPadronByDni,
  syncPadronActive,
  updatePersona,
  uploadPadron,
} from './request'
import {
  PERSONAS_TABS,
  type CreatePersonaDTO,
  type PersonaResponseDTO,
  type PersonRole,
  type PadronUploadResultDTO,
} from './type'
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
  const dto: CreatePersonaDTO = {
    Nombre: entity.Nombre,
    Apellido: entity.Apellido,
    DNI: entity.DNI,
    Rol: entity.Rol,
    Telefono: entity.Telefono ?? '',
    Escuela: entity.EscuelaNombre ?? '',
    Mesa: entity.NroMesa != null ? String(entity.NroMesa) : '',
    LiderId: entity.LiderId ?? null,
  }
  return dto
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

  const [stats, setStats] = React.useState({ grupos: 0, referentes: 0, punteros: 0, votantes: 0 })
  const [statsLoading, setStatsLoading] = React.useState(false)
  const [reportesGrupos, setReportesGrupos] = React.useState<PersonaResponseDTO[]>([])
  const [reportesReferentes, setReportesReferentes] = React.useState<PersonaResponseDTO[]>([])
  const [reportesPunteros, setReportesPunteros] = React.useState<PersonaResponseDTO[]>([])
  const [reportesVotantes, setReportesVotantes] = React.useState<PersonaResponseDTO[]>([])
  const [reportesListsLoading, setReportesListsLoading] = React.useState(false)
  const [reportesGrupoId, setReportesGrupoId] = React.useState<number | null>(null)
  const [reportesReferenteId, setReportesReferenteId] = React.useState<number | null>(null)
  const [reportesPunteroId, setReportesPunteroId] = React.useState<number | null>(null)
  const [padronFile, setPadronFile] = React.useState<File | null>(null)
  const [padronStep, setPadronStep] = React.useState<1 | 2>(1)
  const [showPadronModal, setShowPadronModal] = React.useState(false)
  const [padronUploadLoading, setPadronUploadLoading] = React.useState(false)
  const [padronUploadError, setPadronUploadError] = React.useState<string | null>(null)
  const [padronUploadResult, setPadronUploadResult] = React.useState<PadronUploadResultDTO | null>(null)
  const [padronSyncLoading, setPadronSyncLoading] = React.useState(false)
  const [padronSyncError, setPadronSyncError] = React.useState<string | null>(null)
  const [padronSyncResult, setPadronSyncResult] = React.useState<PadronUploadResultDTO | null>(null)
  const padronLastLookupDniRef = React.useRef<string>('')
  const [dniAutoFillLoading, setDniAutoFillLoading] = React.useState(false)

  const [showAdminModal, setShowAdminModal] = React.useState(false)
  const [adminList, setAdminList] = React.useState<PersonaResponseDTO[]>([])
  const [adminListLoading, setAdminListLoading] = React.useState(false)
  const [adminSearch, setAdminSearch] = React.useState('')
  const [adminPage, setAdminPage] = React.useState(1)
  const [adminPerPage, setAdminPerPage] = React.useState(10)
  const [adminShowForm, setAdminShowForm] = React.useState(false)
  const [adminEditingId, setAdminEditingId] = React.useState<number | null>(null)
  const [adminForm, setAdminForm] = React.useState<CreatePersonaDTO>(() => emptyForm(0))
  const [adminSubmitting, setAdminSubmitting] = React.useState(false)
  const [adminError, setAdminError] = React.useState<string | null>(null)
  const [adminSuccess, setAdminSuccess] = React.useState<string | null>(null)

  const [showAppHelpModal, setShowAppHelpModal] = React.useState(false)

  function resetPadronImportState() {
    setPadronStep(1)
    setPadronFile(null)
    setPadronUploadLoading(false)
    setPadronUploadError(null)
    setPadronUploadResult(null)
    setPadronSyncLoading(false)
    setPadronSyncError(null)
    setPadronSyncResult(null)
  }

  function openPadronImportModal() {
    resetPadronImportState()
    setShowPadronModal(true)
  }

  function closePadronImportModal() {
    setShowPadronModal(false)
  }

  const fetchAdmins = React.useCallback(() => {
    setAdminListLoading(true)
    getPersonasByRole(0)
      .then((res) => setAdminList(res))
      .catch(() => setAdminList([]))
      .finally(() => setAdminListLoading(false))
  }, [])

  function openAdminModal() {
    setAdminError(null)
    setAdminSuccess(null)
    setAdminSearch('')
    setAdminPage(1)
    setAdminPerPage(10)
    setAdminShowForm(false)
    setAdminEditingId(null)
    setAdminForm(emptyForm(0))
    setShowAdminModal(true)
    fetchAdmins()
  }

  function closeAdminModal() {
    setShowAdminModal(false)
  }

  function openAppHelpModal() {
    setShowAppHelpModal(true)
    // #region agent log
    fetch('http://127.0.0.1:7743/ingest/9817c7ed-4593-4ad7-9571-e38db2bdfd68',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b35ed6'},body:JSON.stringify({sessionId:'b35ed6',location:'PersonasPage:index.tsx:openAppHelpModal',message:'openAppHelpModal() called',data:{},timestamp:Date.now(),hypothesisId:'H1_help_drawer_open'},)}).catch(()=>{});
    // #endregion
    requestAnimationFrame(() => {
      // #region agent log
      const drawerEl = document.querySelector<HTMLElement>('.personasHelpAppModal')
      const closeBtnEl = document.querySelector<HTMLElement>('.personasHelpDrawerClose')
      const helpBtnSvg = document.querySelector<HTMLElement>('.personasInicioHelpBtnInTitle svg')
      fetch('http://127.0.0.1:7743/ingest/9817c7ed-4593-4ad7-9571-e38db2bdfd68',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b35ed6'},body:JSON.stringify({sessionId:'b35ed6',location:'PersonasPage:index.tsx:openAppHelpModal:measure',message:'Drawer measurements',data:{drawerWidth:drawerEl?.getBoundingClientRect().width,drawerHeight:drawerEl?.getBoundingClientRect().height,closeBtnWidth:closeBtnEl?.getBoundingClientRect().width,closeBtnHeight:closeBtnEl?.getBoundingClientRect().height,helpBtnSvgWidth:helpBtnSvg?.getBoundingClientRect().width,helpBtnSvgHeight:helpBtnSvg?.getBoundingClientRect().height},timestamp:Date.now(),hypothesisId:'H2_layout_measurements'},)}).catch(()=>{});
      // #endregion
    })
  }

  function closeAppHelpModal() {
    setShowAppHelpModal(false)
  }

  function openAdminCreate() {
    setAdminError(null)
    setAdminSuccess(null)
    setAdminEditingId(null)
    setAdminForm(emptyForm(0))
    setAdminShowForm(true)
  }

  function openAdminEdit(row: PersonaResponseDTO) {
    setAdminError(null)
    setAdminSuccess(null)
    setAdminEditingId(row.Id)
    setAdminForm({
      Nombre: row.Nombre ?? '',
      Apellido: row.Apellido ?? '',
      DNI: row.DNI ?? '',
      Rol: 0,
      Telefono: row.Telefono ?? '',
      Escuela: row.EscuelaNombre ?? '',
      Mesa: row.NroMesa != null ? String(row.NroMesa) : '',
      LiderId: null,
    })
    setAdminShowForm(true)
  }

  async function handleAdminDelete(row: PersonaResponseDTO) {
    try {
      await deletePersona(row.Id)
      setAdminSuccess('Administrador eliminado.')
      fetchAdmins()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar.'
      setAdminError(msg)
    }
  }

  async function handleAdminSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAdminError(null)
    setAdminSuccess(null)

    const payload: CreatePersonaDTO = {
      Nombre: sanitizeNombreApellido(adminForm.Nombre ?? ''),
      Apellido: sanitizeNombreApellido(adminForm.Apellido ?? ''),
      DNI: sanitizeDNI(adminForm.DNI ?? ''),
      Rol: 0,
      Telefono: normalizeOptionalString(adminForm.Telefono ?? ''),
      Escuela: normalizeOptionalString(adminForm.Escuela ?? ''),
      Mesa: normalizeOptionalString(adminForm.Mesa ?? ''),
      LiderId: null,
    }

    if (!payload.Nombre.trim() || !payload.Apellido.trim() || !payload.DNI.trim()) {
      setAdminError('Completá Nombre, Apellido y DNI.')
      return
    }

    setAdminSubmitting(true)
    try {
      if (adminEditingId == null) {
        await createPersona(payload)
        setAdminSuccess('Administrador creado.')
      } else {
        await updatePersona(adminEditingId, payload)
        setAdminSuccess('Administrador actualizado.')
      }
      setAdminShowForm(false)
      setAdminEditingId(null)
      fetchAdmins()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar.'
      setAdminError(msg)
    } finally {
      setAdminSubmitting(false)
    }
  }

  function agentLog(payload: { runId: string; hypothesisId: string; location: string; message: string; data?: Record<string, unknown> }) {
    // #region agent log
    fetch('http://127.0.0.1:7743/ingest/9817c7ed-4593-4ad7-9571-e38db2bdfd68',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b35ed6'},body:JSON.stringify({sessionId:'b35ed6',location:payload.location,message:payload.message,data:payload.data ?? {},timestamp:Date.now(),runId:payload.runId,hypothesisId:payload.hypothesisId})}).catch(()=>{});
    // #endregion
  }

  async function handlePadronAutoFillByDni() {
    const dni = (form.DNI ?? '').trim()
    if (dni.length !== 8) return
    if (padronLastLookupDniRef.current === dni) return

    setDniAutoFillLoading(true)
    try {
      const match = await matchPadronByDni(dni)
      if (!match) {
        padronLastLookupDniRef.current = dni
        return
      }

      setForm((prev) => {
        const nombreEmpty = (prev.Nombre ?? '').trim().length === 0
        const apellidoEmpty = (prev.Apellido ?? '').trim().length === 0
        const escuelaEmpty = (prev.Escuela ?? '').trim().length === 0
        const mesaEmpty = (prev.Mesa ?? '').trim().length === 0

        agentLog({
          runId: 'pre-fix',
          hypothesisId: 'H_PADRON_AUTOFILL',
          location: 'src/pages/personas/index.tsx:padron-autofill',
          message: 'Padron match applied to empty fields',
          data: { dni, nombreEmpty, apellidoEmpty, escuelaEmpty, mesaEmpty },
        })

        return {
          ...prev,
          Nombre: nombreEmpty ? match.Nombre : prev.Nombre,
          Apellido: apellidoEmpty ? match.Apellido : prev.Apellido,
          Escuela: escuelaEmpty ? match.EscuelaNombre : prev.Escuela,
          Mesa: mesaEmpty ? String(match.MesaNro ?? '') : prev.Mesa,
        }
      })

      padronLastLookupDniRef.current = dni
    } catch (e) {
      // no-op: no queres bloquear la UX si el padrón no responde
    } finally {
      setDniAutoFillLoading(false)
    }
  }

  async function handleUploadPadronClick() {
    setPadronUploadError(null)
    setPadronUploadResult(null)
    setPadronSyncError(null)
    setPadronSyncResult(null)
    if (!padronFile) {
      setPadronUploadError('Seleccioná un archivo Excel (.xlsx).')
      return
    }
    setPadronUploadLoading(true)
    try {
      const res = await uploadPadron(padronFile)
      setPadronUploadResult(res)
      setPadronStep(2)
      agentLog({
        runId: 'debug',
        hypothesisId: 'H_SYNC_FLOW_UPLOAD',
        location: 'src/pages/personas/index.tsx:handleUploadPadronClick',
        message: 'Upload padrón result received',
        data: { RowsStored: res.RowsStored, PersonasUpdated: res.PersonasUpdated, DnisNotFoundCount: res.DnisNotFound?.length ?? 0 },
        timestamp: Date.now(),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar el padrón.'
      setPadronUploadError(msg)
      agentLog({
        runId: 'debug',
        hypothesisId: 'H_SYNC_FLOW_UPLOAD',
        location: 'src/pages/personas/index.tsx:handleUploadPadronClick',
        message: 'Upload padrón error',
        data: { error: msg },
        timestamp: Date.now(),
      })
    } finally {
      setPadronUploadLoading(false)
    }
  }

  async function fetchReportesData(): Promise<{
    grupos: PersonaResponseDTO[]
    referentes: PersonaResponseDTO[]
    punteros: PersonaResponseDTO[]
    votantes: PersonaResponseDTO[]
  }> {
    const [grupos, referentes, punteros, votantes] = await Promise.all([
      getPersonasByRole(1),
      getPersonasByRole(2),
      getPersonasByRole(3),
      getPersonasByRole(4),
    ])
    agentLog({
      runId: 'pre-fix',
      hypothesisId: 'H27',
      location: 'src/pages/personas/index.tsx:fetchReportesData',
      message: 'Fetched reportes data for unified reports',
      data: { grupos: grupos.length, referentes: referentes.length, punteros: punteros.length, votantes: votantes.length },
    })
    return { grupos, referentes, punteros, votantes }
  }

  // UI state (NO es fuente de verdad del grupo seleccionado; la fuente es form.LiderId)
  const [leaderFilterText, setLeaderFilterText] = React.useState('')
  const [leaderIsTyping, setLeaderIsTyping] = React.useState(false)
  const [leaderDropdownOpen, setLeaderDropdownOpen] = React.useState(false)
  const [leaderSelectVisible, setLeaderSelectVisible] = React.useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = React.useState(false)
  const leaderDropdownRef = React.useRef<HTMLDivElement>(null)
  const leaderBlurTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaderSelectRef = React.useRef<HTMLSelectElement>(null)

  const fetchList = React.useCallback(() => {
    if (tab.isReportes || tab.id === 'configuracion' || tab.id === 'inicio') return
    setListLoading(true)
    getPersonasByRole(tab.rol)
      .then((res) => {
        setList(res)
        agentLog({
          runId: 'debug',
          hypothesisId: 'H_EAGER_LOADING_INCLUDE_EVIDENCE',
          location: 'src/pages/personas/index.tsx:fetchList',
          message: 'Loaded personas list for role',
          data: {
            rol: tab.rol,
            count: res.length,
            withEscuelaNombre: res.filter((p) => (p.EscuelaNombre ?? '').trim().length > 0).length,
            withMesa: res.filter((p) => p.NroMesa != null).length,
          },
          timestamp: Date.now(),
        })
      })
      .catch(() => setList([]))
      .finally(() => setListLoading(false))
  }, [tab.rol, tab.isReportes])

  React.useEffect(() => {
    fetchList()
  }, [fetchList])

  React.useEffect(() => {
    if (tab.id === 'reportes' || tab.id === 'inicio') {
      setStatsLoading(true)
      Promise.all([
        getPersonasByRole(1),
        getPersonasByRole(2),
        getPersonasByRole(3),
        getPersonasByRole(4),
      ])
        .then(([gru, ref, pun, vot]) =>
          setStats({
            grupos: gru.length,
            referentes: ref.length,
            punteros: pun.length,
            votantes: vot.length,
          })
        )
        .catch(() => setStats({ grupos: 0, referentes: 0, punteros: 0, votantes: 0 }))
        .finally(() => setStatsLoading(false))
    }
  }, [tab.id])

  React.useEffect(() => {
    // Reportes por selección: al entrar en Reportes, arrancar sin selección (placeholder)
    if (tab.id !== 'reportes') return
    setReportesGrupoId(null)
    setReportesReferenteId(null)
    setReportesPunteroId(null)
    agentLog({
      runId: 'pre-fix',
      hypothesisId: 'H24',
      location: 'src/pages/personas/index.tsx:reset-reportes-seleccion',
      message: 'Reset reportes por seleccion state on enter reportes',
      data: {},
    })
    agentLog({
      runId: 'pre-fix',
      hypothesisId: 'H_ORDER',
      location: 'src/pages/personas/index.tsx:reportes-actions-order',
      message: 'Reportes por seleccion action buttons order (visual)',
      data: {
        order: [
          'Ver referentes',
          'Impr. ref.',
          'Ver punteros (G)',
          'Impr. punteros (G)',
          'Ver punteros',
          'Impr. punteros',
          'Ver votantes',
          'Impr. votantes',
          'Ver P+V',
          'Impr. P+V',
        ],
      },
    })
  }, [tab.id])

  React.useEffect(() => {
    if (tab.id !== 'configuracion') return
    setPadronStep(1)
    setPadronUploadError(null)
    setPadronUploadResult(null)
    setPadronFile(null)
    setPadronSyncError(null)
    setPadronSyncResult(null)
    setShowPadronModal(false)
  }, [tab.id])

  React.useEffect(() => {
    if (tab.isReportes || tab.id === 'configuracion' || tab.id === 'inicio') return
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
      .finally(() => {
        setLeadersLoading(false)
        agentLog({
          runId: 'pre-fix',
          hypothesisId: 'H4',
          location: 'src/pages/personas/index.tsx:leaders-load',
          message: 'Leaders loaded for tab',
          data: { tabId: tab.id, leaderRole: tab.leaderRole },
        })
      })
  }, [tab.leaderRole, tab.isReportes])

  React.useEffect(() => {
    if (!tab.isReportes) return
    setReportesListsLoading(true)
    Promise.all([
      getPersonasByRole(1),
      getPersonasByRole(2),
      getPersonasByRole(3),
      getPersonasByRole(4),
    ])
      .then(([gru, ref, pun, vot]) => {
        setReportesGrupos(gru)
        setReportesReferentes(ref)
        setReportesPunteros(pun)
        setReportesVotantes(vot)
        agentLog({
          runId: 'pre-fix',
          hypothesisId: 'H1',
          location: 'src/pages/personas/index.tsx:reportes-load',
          message: 'Reportes lists loaded',
          data: {
            grupos: gru.length,
            referentes: ref.length,
            punteros: pun.length,
            votantes: vot.length,
            punterosSinLider: pun.filter((p) => p.LiderId == null).length,
            votantesSinLider: vot.filter((v) => v.LiderId == null).length,
          },
        })
        // No autoseleccionar en "Reportes por selección"
        setReportesGrupoId(null)
        setReportesReferenteId(null)
        setReportesPunteroId(null)
      })
      .catch(() => {
        setReportesGrupos([])
        setReportesReferentes([])
        setReportesPunteros([])
        setReportesVotantes([])
        setReportesGrupoId(null)
        setReportesReferenteId(null)
        setReportesPunteroId(null)
      })
      .finally(() => setReportesListsLoading(false))
  }, [tab.isReportes])

  const reportesGruposSorted = React.useMemo(() => {
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
    return [...reportesGrupos].sort(sortByApellidoNombre)
  }, [reportesGrupos])

  const reportesReferentesSorted = React.useMemo(() => {
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
    return [...reportesReferentes].sort(sortByApellidoNombre)
  }, [reportesReferentes])

  const reportesReferentesOptions = React.useMemo(() => {
    if (reportesGrupoId == null) return reportesReferentesSorted
    return reportesReferentesSorted.filter((r) => r.LiderId === reportesGrupoId)
  }, [reportesGrupoId, reportesReferentesSorted])

  const reportesReferenteSelectDisabled = React.useMemo(() => {
    // Bloquear hasta que se seleccione Grupo; luego bloquear si no hay referentes
    if (reportesGrupoId == null) return true
    return reportesReferentesOptions.length === 0
  }, [reportesGrupoId, reportesReferentesOptions.length])

  const reportesPunterosSorted = React.useMemo(() => {
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
    return [...reportesPunteros].sort(sortByApellidoNombre)
  }, [reportesPunteros])

  const reportesPunterosDeReferente = React.useMemo(() => {
    if (reportesReferenteId == null) return []
    return reportesPunteros.filter((p) => p.LiderId === reportesReferenteId)
  }, [reportesPunteros, reportesReferenteId])

  const reportesPunterosDeReferenteSorted = React.useMemo(() => {
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
    return [...reportesPunterosDeReferente].sort(sortByApellidoNombre)
  }, [reportesPunterosDeReferente])

  const reportesPunteroSelectDisabled = React.useMemo(() => {
    // Si no hay referente seleccionado, o el referente no tiene punteros, bloquear selector
    if (reportesReferenteId == null) return true
    return reportesPunterosDeReferenteSorted.length === 0
  }, [reportesReferenteId, reportesPunterosDeReferenteSorted.length])

  const reportesPunterosOptions = React.useMemo(() => {
    return reportesReferenteId == null ? reportesPunterosSorted : reportesPunterosDeReferenteSorted
  }, [reportesReferenteId, reportesPunterosSorted, reportesPunterosDeReferenteSorted])

  React.useEffect(() => {
    // Cuando cambia el referente, mantener puntero válido o limpiar/auto-seleccionar
    if (!tab.isReportes) return
    if (reportesReferenteId == null) {
      if (reportesPunteroId != null) setReportesPunteroId(null)
      return
    }
    const allowed = reportesPunterosDeReferenteSorted
    const isValid = reportesPunteroId != null && allowed.some((p) => p.Id === reportesPunteroId)
    if (isValid) return
    // No autoseleccionar: volver a placeholder si no es válido
    setReportesPunteroId(null)
    agentLog({
      runId: 'pre-fix',
      hypothesisId: 'H19',
      location: 'src/pages/personas/index.tsx:reportes-sync-puntero',
      message: 'Synced puntero selection after referente change',
      data: { referenteId: reportesReferenteId, prevPunteroId: reportesPunteroId, nextPunteroId: null, options: allowed.length },
    })
  }, [tab.isReportes, reportesReferenteId, reportesPunterosDeReferenteSorted, reportesPunteroId])

  React.useEffect(() => {
    // Cuando cambia el grupo, resetear referente y puntero (placeholder)
    if (!tab.isReportes) return
    setReportesReferenteId(null)
    setReportesPunteroId(null)
    agentLog({
      runId: 'pre-fix',
      hypothesisId: 'H25',
      location: 'src/pages/personas/index.tsx:reportes-sync-referente',
      message: 'Reset referente/puntero after grupo change',
      data: { grupoId: reportesGrupoId },
    })
  }, [tab.isReportes, reportesGrupoId])

  const reportesVotantesDePuntero = React.useMemo(() => {
    if (reportesPunteroId == null) return []
    return reportesVotantes.filter((v) => v.LiderId === reportesPunteroId)
  }, [reportesVotantes, reportesPunteroId])

  const reportesVotantesDeReferente = React.useMemo(() => {
    if (reportesReferenteId == null) return []
    const punIds = new Set(reportesPunterosDeReferente.map((p) => p.Id))
    return reportesVotantes.filter((v) => v.LiderId != null && punIds.has(v.LiderId))
  }, [reportesVotantes, reportesReferenteId, reportesPunterosDeReferente])

  const cantidadesTotalesRows = React.useMemo(() => {
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

    const punterosByReferente = new Map<number, PersonaResponseDTO[]>()
    reportesPunteros.forEach((p) => {
      const refId = p.LiderId ?? 0
      if (!punterosByReferente.has(refId)) punterosByReferente.set(refId, [])
      punterosByReferente.get(refId)!.push(p)
    })

    const votantesByPuntero = new Map<number, number>()
    reportesVotantes.forEach((v) => {
      const punId = v.LiderId ?? 0
      votantesByPuntero.set(punId, (votantesByPuntero.get(punId) ?? 0) + 1)
    })

    const rows = [...reportesReferentes]
      .sort(sortByApellidoNombre)
      .map((ref) => {
        const punteros = punterosByReferente.get(ref.Id) ?? []
        const votos = punteros.reduce((acc, pun) => acc + (votantesByPuntero.get(pun.Id) ?? 0), 0)
        return {
          refId: ref.Id,
          refApellido: ref.Apellido,
          refNombre: ref.Nombre,
          punteros: punteros.length,
          votos,
        }
      })

    agentLog({
      runId: 'pre-fix',
      hypothesisId: 'H2',
      location: 'src/pages/personas/index.tsx:cantidades-totales-memo',
      message: 'Cantidades totales computed',
      data: {
        rows: rows.length,
        totalPunteros: rows.reduce((a, r) => a + r.punteros, 0),
        totalVotos: rows.reduce((a, r) => a + r.votos, 0),
        top3: rows.slice(0, 3),
      },
    })

    return rows
  }, [reportesReferentes, reportesPunteros, reportesVotantes])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm(tab.rol))
    setShowForm(true)
    setError(null)
    setSuccessMessage(null)
    setLeaderSelectVisible(false)
  }

  /** Genera el HTML del reporte jerárquico (referentes / punteros / votantes) */
  function buildReportHtml(
    rol: 2 | 3 | 4,
    list: PersonaResponseDTO[],
    leaderById?: Map<number, PersonaResponseDTO>,
    options?: {
      groupName?: string
      allLeaders?: PersonaResponseDTO[]
      includeRolColumn?: boolean
      headerPathLine?: string
    }
  ): string {
    const now = new Date()
    const groupTitle =
      rol === 2 ? 'LISTADO DE REFERENTES' : rol === 3 ? 'LISTADO DE PUNTEROS' : 'LISTADO DE VOTANTES'
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
    const groupName = (options?.groupName ?? 'Varios').trim() || 'Varios'
    const includeRolColumn = options?.includeRolColumn ?? (rol === 2)
    const headerPathLine = (options?.headerPathLine ?? '').trim()
    const leaderRolLabel = rol === 2 ? 'Grupo' : rol === 3 ? 'Referente' : 'Puntero'
    const subRolLabel = rol === 2 ? 'Referente' : rol === 3 ? 'Puntero' : 'Votante'

    const groups = new Map<number, { leaderName: string; persons: PersonaResponseDTO[] }>()
    list.forEach((p) => {
      const idKey = p.LiderId ?? 0
      const leaderName = p.LiderNombre ?? 'Sin líder'
      if (!groups.has(idKey)) groups.set(idKey, { leaderName, persons: [] })
      groups.get(idKey)!.persons.push(p)
    })

    // Para reportes "globales": incluir líderes sin registros (ej. referentes sin punteros)
    if (Array.isArray(options?.allLeaders) && options!.allLeaders.length > 0) {
      options!.allLeaders.forEach((l) => {
        if (!groups.has(l.Id)) {
          groups.set(l.Id, { leaderName: `${l.Nombre} ${l.Apellido}`.trim(), persons: [] })
        }
      })
      agentLog({
        runId: 'pre-fix',
        hypothesisId: 'H20',
        location: 'src/pages/personas/index.tsx:buildReportHtml-allLeaders',
        message: 'Included empty leaders in report',
        data: { rol, leaders: options!.allLeaders.length, groups: groups.size },
      })
    }

    const groupEntries = Array.from(groups.entries()).sort(([, a], [, b]) => {
      const aParts = a.leaderName.split(' ')
      const bParts = b.leaderName.split(' ')
      const aLast = aParts[aParts.length - 1].toLowerCase()
      const bLast = bParts[bParts.length - 1].toLowerCase()
      if (aLast < bLast) return -1
      if (aLast > bLast) return 1
      return a.leaderName.localeCompare(b.leaderName, 'es', { sensitivity: 'base' })
    })

    const rowsHtml = groupEntries
      .map(([leaderId, group], groupIndex) => {
        const leaderName = group.leaderName
        const parts = leaderName.split(' ')
        const leaderApellido = parts.length > 1 ? parts[parts.length - 1] : leaderName
        const leaderNombre = parts.length > 1 ? parts.slice(0, -1).join(' ') : ''
        const leaderDni = leaderId > 0 ? (leaderById?.get(leaderId)?.DNI ?? '—') : '—'

        const sortedPersons = [...group.persons].sort((a, b) => {
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
              ${includeRolColumn ? `<td>${leaderRolLabel}</td>` : ''}
              <td><strong>${leaderApellido.toUpperCase()}${leaderNombre ? `, ${leaderNombre}` : ''}</strong></td>
              <td>${leaderDni}</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
            </tr>`

        const subRows = sortedPersons
          .map(
            (p, idx) => `
                <tr class="reportSubRow">
                  <td>${groupIndex + 1}.${idx + 1}</td>
                  ${includeRolColumn ? `<td class="reportRolCell">${subRolLabel}</td>` : ''}
                  <td class="reportSubApellido">${p.Apellido}, ${p.Nombre}</td>
                  <td>${p.DNI}</td>
                  <td>${p.Telefono ?? '—'}</td>
                  <td>${p.EscuelaNombre ?? '—'}</td>
                  <td>${p.NroMesa ?? '—'}</td>
                </tr>`
          )
          .join('')

        const subtotalRow = includeRolColumn
          ? `
            <tr class="reportSubTotalRow">
              <td></td>
              <td></td>
              <td><strong>Subtotal : ${sortedPersons.length}</strong></td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
            </tr>`
          : ''

        const spacer = groupIndex < groupEntries.length - 1
          ? `<tr class="reportGroupSpacer"><td colspan="${includeRolColumn ? 7 : 6}"></td></tr>`
          : ''
        return leaderRow + subRows + subtotalRow + spacer
      })
      .join('')

    const totalRowHtml = includeRolColumn
      ? (() => {
          const total = groupEntries.reduce((acc, [, g]) => acc + g.persons.length, 0)
          return `
            <tr class="reportBlankRow"><td colspan="7"></td></tr>
            <tr class="reportGrandTotalRow">
              <td></td>
              <td></td>
              <td><strong>TOTAL : ${total}</strong></td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
            </tr>`
        })()
      : ''

    const pageTitle = rol === 2 ? 'Listado de Referentes' : rol === 3 ? 'Listado de Punteros' : 'Listado de Votantes'
    return `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charSet="utf-8" />
          <title>Reporte - ${pageTitle}</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; }
            .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
            .headerLeft { display: flex; flex-direction: column; }
            h1 { font-size: 22px; margin: 0; letter-spacing: 0.02em; }
            .meta { color: #555; font-size: 13px; }
            .metaLine { margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background: #f3f4f6; }
            tr.reportLeaderRow { background: #e5e7eb; font-weight: bold; }
            tr.reportSubRow { background: #fff; }
            tr.reportSubRow td.reportSubApellido { padding-left: 24px; }
            tr.reportSubTotalRow { background: #f3f4f6; font-weight: 700; }
            tr.reportGrandTotalRow { background: #e5e7eb; font-weight: 900; }
            tr.reportBlankRow td { border: none; height: 12px; background: #fff; }
            tr.reportGroupSpacer td { height: 10px; border: none; border-left: 1px solid #ccc; border-right: 1px solid #ccc; background: #fff; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="headerLeft">
              ${headerPathLine ? `<div class="metaLine">${headerPathLine}</div>` : ''}
              <h1>${groupTitle}</h1>
            </div>
            <div class="meta">
              <div>Fecha: ${formattedDate}</div>
              ${headerPathLine ? '' : `<div class="metaLine">Grupo: ${groupName}</div>`}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                ${includeRolColumn ? '<th>Rol</th>' : ''}
                <th>Apellido/s y Nombre/s</th>
                <th>DNI</th>
                <th>Teléfono</th>
                <th>Escuela</th>
                <th>Mesa</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              ${totalRowHtml}
            </tbody>
          </table>
        </body>
      </html>
      `
  }

  /** Reporte jerárquico: Referente → Punteros → Votantes (1, 1.1, 1.1.1, 1.1.2, 1.2, …) */
  function buildJerarquiaReportHtml(
    data?: { grupos: PersonaResponseDTO[]; referentes: PersonaResponseDTO[]; punteros: PersonaResponseDTO[]; votantes: PersonaResponseDTO[] },
    options?: { headerPathLine?: string }
  ): string {
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

    const grupos = [...(data?.grupos ?? reportesGrupos)].sort(sortByApellidoNombre)
    const refs = [...(data?.referentes ?? reportesReferentes)].sort(sortByApellidoNombre)
    const refsByGrupo = new Map<number, PersonaResponseDTO[]>()
    refs.forEach((r) => {
      const gid = r.LiderId ?? 0
      if (!refsByGrupo.has(gid)) refsByGrupo.set(gid, [])
      refsByGrupo.get(gid)!.push(r)
    })
    const punterosByLider = new Map<number, PersonaResponseDTO[]>()
    ;(data?.punteros ?? reportesPunteros).forEach((p) => {
      const lid = p.LiderId ?? 0
      if (!punterosByLider.has(lid)) punterosByLider.set(lid, [])
      punterosByLider.get(lid)!.push(p)
    })
    punterosByLider.forEach((arr) => arr.sort(sortByApellidoNombre))

    const votantesByLider = new Map<number, PersonaResponseDTO[]>()
    ;(data?.votantes ?? reportesVotantes).forEach((v) => {
      const lid = v.LiderId ?? 0
      if (!votantesByLider.has(lid)) votantesByLider.set(lid, [])
      votantesByLider.get(lid)!.push(v)
    })
    votantesByLider.forEach((arr) => arr.sort(sortByApellidoNombre))

    const rows: string[] = []
    let totalReferentes = 0
    let totalPunteros = 0
    let totalVotantes = 0
    grupos.forEach((g, gi) => {
      const numG = gi + 1
      rows.push(`
        <tr class="reportRowGroup">
          <td class="reportNumGroup">${numG}</td>
          <td>Grupo</td>
          <td><strong>${g.Apellido}, ${g.Nombre}</strong></td>
          <td>${g.DNI}</td>
          <td>${g.Telefono ?? '—'}</td>
          <td>${g.EscuelaNombre ?? '—'}</td>
          <td>${g.NroMesa ?? '—'}</td>
        </tr>`)

      const refsForGroup = refsByGrupo.get(g.Id) ?? []
      const groupReferentes = refsForGroup.length
      let groupPunteros = 0
      let groupVotantes = 0
      if (refsForGroup.length === 0) {
        rows.push(`
          <tr class="reportRowEmpty">
            <td class="reportNumEmpty">${numG}.—</td>
            <td>Referente</td>
            <td class="reportIndent1"><em>Sin referentes</em></td>
            <td>—</td><td>—</td><td>—</td><td>—</td>
          </tr>`)
      } else {
        refsForGroup.forEach((ref, ri) => {
          const numRef = `${numG}.${ri + 1}`
          rows.push(`
            <tr class="reportRowRef">
              <td class="reportNumRef">${numRef}</td>
              <td>Referente</td>
              <td class="reportIndent1"><strong>${ref.Apellido}, ${ref.Nombre}</strong></td>
              <td>${ref.DNI}</td>
              <td>${ref.Telefono ?? '—'}</td>
              <td>${ref.EscuelaNombre ?? '—'}</td>
              <td>${ref.NroMesa ?? '—'}</td>
            </tr>`)

          const punteros = punterosByLider.get(ref.Id) ?? []
          groupPunteros += punteros.length
          if (punteros.length === 0) {
            rows.push(`
              <tr class="reportRowEmpty">
                <td class="reportNumEmpty">${numRef}.—</td>
                <td>Puntero</td>
                <td class="reportIndent2"><em>Sin punteros</em></td>
                <td>—</td><td>—</td><td>—</td><td>—</td>
              </tr>`)
          } else {
            punteros.forEach((pun, pj) => {
              const numPun = `${numRef}.${pj + 1}`
              rows.push(`
                <tr class="reportRowPun">
                  <td class="reportNumPun">${numPun}</td>
                  <td>Puntero</td>
                  <td class="reportIndent2">${pun.Apellido}, ${pun.Nombre}</td>
                  <td>${pun.DNI}</td>
                  <td>${pun.Telefono ?? '—'}</td>
                  <td>${pun.EscuelaNombre ?? '—'}</td>
                  <td>${pun.NroMesa ?? '—'}</td>
                </tr>`)

              const votantes = votantesByLider.get(pun.Id) ?? []
              groupVotantes += votantes.length
              if (votantes.length === 0) {
                rows.push(`
                  <tr class="reportRowEmpty">
                    <td class="reportNumEmpty">${numPun}.—</td>
                    <td>Votante</td>
                    <td class="reportIndent3"><em>Sin votantes</em></td>
                    <td>—</td><td>—</td><td>—</td><td>—</td>
                  </tr>`)
              } else {
                votantes.forEach((vot, vk) => {
                  const numVot = `${numPun}.${vk + 1}`
                  rows.push(`
                    <tr class="reportRowVot">
                      <td class="reportNumVot">${numVot}</td>
                      <td class="reportRolVot">Votante</td>
                      <td class="reportIndent3">${vot.Apellido}, ${vot.Nombre}</td>
                      <td>${vot.DNI}</td>
                      <td>${vot.Telefono ?? '—'}</td>
                      <td>${vot.EscuelaNombre ?? '—'}</td>
                      <td>${vot.NroMesa ?? '—'}</td>
                    </tr>`)
                })
              }
            })
          }
        })
      }

      totalReferentes += groupReferentes
      totalPunteros += groupPunteros
      totalVotantes += groupVotantes
      rows.push(`
        <tr class="reportSubTotalRow">
          <td></td>
          <td></td>
          <td><strong>Subtotal Referentes: ${groupReferentes} | Punteros: ${groupPunteros} | Votantes: ${groupVotantes}</strong></td>
          <td>—</td><td>—</td><td>—</td><td>—</td>
        </tr>`)

      if (gi < grupos.length - 1) {
        rows.push('<tr class="reportJerarquiaSpacer"><td colspan="7"></td></tr>')
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
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; }
            .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
            .headerLeft { display: flex; flex-direction: column; }
            h1 { font-size: 22px; margin: 0; letter-spacing: 0.02em; }
            .meta { color: #555; font-size: 13px; }
            .metaLine { margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background: #f3f4f6; }
            tr.reportRowGroup { background: #dbeafe; font-weight: 900; }
            tr.reportRowRef { background: #e5e7eb; font-weight: bold; }
            tr.reportRowPun { background: #f9fafb; }
            tr.reportRowVot { background: #fff; }
            tr.reportRowEmpty { background: #fff; color: #6b7280; }
            tr.reportSubTotalRow { background: #f3f4f6; font-weight: 800; }
            tr.reportGrandTotalRow { background: #e5e7eb; font-weight: 900; }
            tr.reportBlankRow td { border: none; height: 12px; background: #fff; }
            td.reportNumGroup { padding-left: 8px; }
            td.reportNumRef { padding-left: 18px; }
            td.reportNumPun { padding-left: 36px; }
            td.reportNumVot { padding-left: 56px; }
            td.reportNumEmpty { padding-left: 56px; color: #6b7280; }
            td.reportRolVot { padding-left: 24px; }
            td.reportIndent1 { padding-left: 18px; }
            td.reportIndent2 { padding-left: 36px; }
            td.reportIndent3 { padding-left: 52px; }
            tr.reportJerarquiaSpacer td { height: 14px; border: none; border-left: 1px solid #ccc; border-right: 1px solid #ccc; background: #fff; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="headerLeft">
              ${
                (options?.headerPathLine ?? '').trim()
                  ? `<div class="metaLine">${(options?.headerPathLine ?? '').trim()}</div>`
                  : ''
              }
              <h1>JERARQUÍA POR GRUPO → REFERENTES → PUNTEROS → VOTANTES</h1>
            </div>
            <div class="meta">
              <div>Fecha: ${formattedDate}</div>
              ${
                (options?.headerPathLine ?? '').trim()
                  ? ''
                  : `<div class="metaLine">Grupo: Varios</div>`
              }
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Rol</th>
                <th>Apellido/s y Nombre/s</th>
                <th>DNI</th>
                <th>Teléfono</th>
                <th>Escuela</th>
                <th>Mesa</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="reportBlankRow"><td colspan="7"></td></tr>
              <tr class="reportGrandTotalRow">
                <td></td>
                <td></td>
                <td><strong>TOTAL Referentes: ${totalReferentes} | Punteros: ${totalPunteros} | Votantes: ${totalVotantes}</strong></td>
                <td>—</td><td>—</td><td>—</td><td>—</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
      `
  }

  function buildGruposOnlyReportHtml(options?: { headerPathLine?: string }): string {
    const now = new Date()
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
    const headerPathLine = (options?.headerPathLine ?? '').trim()

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

    const grupos = [...reportesGrupos].sort(sortByApellidoNombre)
    agentLog({
      runId: 'pre-fix',
      hypothesisId: 'H_GRUPOS_ONLY_HTML',
      location: 'src/pages/personas/index.tsx:buildGruposOnlyReportHtml',
      message: 'Building grupos-only report (flat list)',
      data: { groupsCount: grupos.length },
    })

    const rowsHtml = grupos
      .map(
        (g, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${(g.Apellido || '').toUpperCase()}${g.Nombre ? `, ${g.Nombre}` : ''}</strong></td>
          <td>${g.DNI}</td>
          <td>${g.Telefono ?? '—'}</td>
        </tr>`
      )
      .join('')

    return `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charSet="utf-8" />
          <title>Reporte - Listado de Grupos</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; }
            .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
            .headerLeft { display: flex; flex-direction: column; }
            h1 { font-size: 22px; margin: 0; letter-spacing: 0.02em; }
            .meta { color: #555; font-size: 13px; }
            .metaLine { margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="headerLeft">
              ${headerPathLine ? `<div class="metaLine">${headerPathLine}</div>` : ''}
              <h1>LISTADO DE GRUPOS</h1>
            </div>
            <div class="meta">
              <div>Fecha: ${formattedDate}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Apellido/s y Nombre/s</th>
                <th>DNI</th>
                <th>Teléfono</th>
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

  function buildPunterosPorGrupoReportHtml(data?: { grupos: PersonaResponseDTO[]; referentes: PersonaResponseDTO[]; punteros: PersonaResponseDTO[] }): string {
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

    const grupos = [...(data?.grupos ?? reportesGrupos)].sort(sortByApellidoNombre)
    const referentes = [...(data?.referentes ?? reportesReferentes)].sort(sortByApellidoNombre)

    const referentesByGrupo = new Map<number, PersonaResponseDTO[]>()
    referentes.forEach((r) => {
      const gid = r.LiderId ?? 0
      if (!referentesByGrupo.has(gid)) referentesByGrupo.set(gid, [])
      referentesByGrupo.get(gid)!.push(r)
    })

    const punterosByReferente = new Map<number, PersonaResponseDTO[]>()
    ;(data?.punteros ?? reportesPunteros).forEach((p) => {
      const rid = p.LiderId ?? 0
      if (!punterosByReferente.has(rid)) punterosByReferente.set(rid, [])
      punterosByReferente.get(rid)!.push(p)
    })
    punterosByReferente.forEach((arr) => arr.sort(sortByApellidoNombre))

    const rows: string[] = []
    let totalReferentes = 0
    let totalPunteros = 0
    grupos.forEach((g, gi) => {
      // Fila cabecera del grupo
      rows.push(`
        <tr class="reportGroupTopRow">
          <td class="reportNumGroup">${gi + 1}</td>
          <td>Grupo</td>
          <td><strong>${g.Apellido.toUpperCase()}${g.Nombre ? `, ${g.Nombre}` : ''}</strong></td>
          <td>${g.DNI}</td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
        </tr>`)

      const refs = referentesByGrupo.get(g.Id) ?? []
      const groupReferentes = refs.length
      let groupPunteros = 0
      if (refs.length === 0) {
        rows.push(`
          <tr class="reportEmptyRow">
            <td></td>
            <td>Referente</td>
            <td class="reportIndent1"><em>Sin referentes</em></td>
            <td>—</td><td>—</td><td>—</td><td>—</td>
          </tr>`)
      } else {
        refs.forEach((ref, ri) => {
          const punteros = punterosByReferente.get(ref.Id) ?? []
          groupPunteros += punteros.length
          rows.push(`
            <tr class="reportLeaderRow">
              <td class="reportNumRef">${gi + 1}.${ri + 1}</td>
              <td>Referente</td>
              <td class="reportIndent1"><strong>${ref.Apellido.toUpperCase()}${ref.Nombre ? `, ${ref.Nombre}` : ''}</strong></td>
              <td>${ref.DNI}</td>
              <td>${ref.Telefono ?? '—'}</td>
              <td>${ref.EscuelaNombre ?? '—'}</td>
              <td>${ref.NroMesa ?? '—'}</td>
            </tr>`)

          if (punteros.length === 0) {
            rows.push(`
              <tr class="reportEmptyRow">
                <td></td>
                <td>Puntero</td>
                <td class="reportIndent2"><em>Sin punteros</em></td>
                <td>—</td><td>—</td><td>—</td><td>—</td>
              </tr>`)
          } else {
            punteros.forEach((p, pi) => {
              rows.push(`
                <tr class="reportSubRow">
                  <td class="reportNumPun">${gi + 1}.${ri + 1}.${pi + 1}</td>
                  <td class="reportRolPuntero">Puntero</td>
                  <td class="reportIndent2">${p.Apellido}, ${p.Nombre}</td>
                  <td>${p.DNI}</td>
                  <td>${p.Telefono ?? '—'}</td>
                  <td>${p.EscuelaNombre ?? '—'}</td>
                  <td>${p.NroMesa ?? '—'}</td>
                </tr>`)
            })
          }
        })
      }

      totalReferentes += groupReferentes
      totalPunteros += groupPunteros
      rows.push(`
        <tr class="reportSubTotalRow">
          <td></td>
          <td></td>
          <td><strong>Subtotal Referentes: ${groupReferentes} | Subtotal Punteros: ${groupPunteros}</strong></td>
          <td>—</td><td>—</td><td>—</td><td>—</td>
        </tr>`)

      if (gi < grupos.length - 1) {
        rows.push('<tr class="reportGroupSpacer"><td colspan="7"></td></tr>')
      }
    })

    agentLog({
      runId: 'pre-fix',
      hypothesisId: 'H22',
      location: 'src/pages/personas/index.tsx:build-punteros-por-grupo',
      message: 'Building punteros report grouped by grupo then referente',
      data: { grupos: reportesGrupos.length, referentes: reportesReferentes.length, punteros: reportesPunteros.length },
    })

    return `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charSet="utf-8" />
          <title>Reporte - Listado de punteros (por grupo)</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; }
            .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
            h1 { font-size: 22px; margin: 0; letter-spacing: 0.02em; }
            .meta { color: #555; font-size: 13px; }
            .metaLine { margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background: #f3f4f6; }
            tr.reportGroupTopRow { background: #dbeafe; font-weight: 800; }
            tr.reportLeaderRow { background: #e5e7eb; font-weight: 700; }
            tr.reportSubRow { background: #fff; }
            tr.reportEmptyRow { background: #fff; color: #6b7280; }
            tr.reportSubTotalRow { background: #f3f4f6; font-weight: 800; }
            tr.reportGrandTotalRow { background: #e5e7eb; font-weight: 900; }
            tr.reportBlankRow td { border: none; height: 12px; background: #fff; }
            td.reportRolPuntero { padding-left: 24px; }
            td.reportIndent1 { padding-left: 18px; }
            td.reportIndent2 { padding-left: 36px; }
            td.reportNumGroup { padding-left: 8px; }
            td.reportNumRef { padding-left: 18px; }
            td.reportNumPun { padding-left: 36px; }
            tr.reportGroupSpacer td { height: 12px; border: none; border-left: 1px solid #ccc; border-right: 1px solid #ccc; background: #fff; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LISTADO DE PUNTEROS (POR GRUPO)</h1>
            <div class="meta">
              <div>Fecha: ${formattedDate}</div>
              <div class="metaLine">Grupo: Varios</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Rol</th>
                <th>Apellido/s y Nombre/s</th>
                <th>DNI</th>
                <th>Teléfono</th>
                <th>Escuela</th>
                <th>Mesa</th>
              </tr>
            </thead>
            <tbody>
              ${rows.join('')}
              <tr class="reportBlankRow"><td colspan="7"></td></tr>
              <tr class="reportGrandTotalRow">
                <td></td>
                <td></td>
                <td><strong>TOTAL Referentes: ${totalReferentes} | TOTAL Punteros: ${totalPunteros}</strong></td>
                <td>—</td><td>—</td><td>—</td><td>—</td>
              </tr>
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
    if (rol === 3) {
      openReportWindow(buildPunterosPorGrupoReportHtml())
      return
    }

    const leaderById =
      rol === 2
        ? new Map(reportesGrupos.map((g) => [g.Id, g]))
        : new Map(reportesPunteros.map((p) => [p.Id, p]))
    openReportWindow(buildReportHtml(rol, list, leaderById, { groupName: 'Varios' }))
  }

  function printReportFromReportes(rol: 2 | 3 | 4) {
    const list = rol === 2 ? reportesReferentes : rol === 3 ? reportesPunteros : reportesVotantes
    if (list.length === 0) {
      window.alert('No hay datos para imprimir.')
      return
    }
    if (rol === 3) {
      const w = window.open('', '_blank')
      if (!w) return
      w.document.open()
      w.document.write(buildPunterosPorGrupoReportHtml())
      w.document.close()
      w.focus()
      w.print()
      return
    }

    const leaderById =
      rol === 2
        ? new Map(reportesGrupos.map((g) => [g.Id, g]))
        : new Map(reportesPunteros.map((p) => [p.Id, p]))
    const w = window.open('', '_blank')
    if (!w) return
    w.document.open()
    w.document.write(buildReportHtml(rol, list, leaderById, { groupName: 'Varios' }))
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

  type ReportesSeleccionMode = 'todos' | 'grupo' | 'referente' | 'puntero'

  function getReportesSeleccionModeAndHeaderLine(): { mode: ReportesSeleccionMode; headerPathLine: string } {
    const grupoId = reportesGrupoId
    const referenteId = reportesReferenteId
    const punteroId = reportesPunteroId

    if (grupoId == null && referenteId == null && punteroId == null) {
      return { mode: 'todos', headerPathLine: 'Grupo: Todos' }
    }

    const grupo = grupoId != null ? reportesGrupos.find((g) => g.Id === grupoId) ?? null : null
    const grupoDisplay = grupo ? `${grupo.Apellido}, ${grupo.Nombre}` : 'Todos'

    if (grupoId != null && referenteId == null && punteroId == null) {
      return { mode: 'grupo', headerPathLine: `Grupo: ${grupoDisplay}` }
    }

    const ref = referenteId != null ? reportesReferentes.find((r) => r.Id === referenteId) ?? null : null
    const referenteDisplay = ref ? `${ref.Apellido}, ${ref.Nombre}` : 'Todos'

    if (grupoId != null && referenteId != null && punteroId == null) {
      return { mode: 'referente', headerPathLine: `Grupo: ${grupoDisplay} -> Referente: ${referenteDisplay}` }
    }

    const pun = punteroId != null ? reportesPunteros.find((p) => p.Id === punteroId) ?? null : null
    const punteroDisplay = pun ? `${pun.Apellido}, ${pun.Nombre}` : 'Todos'

    return { mode: 'puntero', headerPathLine: `Grupo: ${grupoDisplay} -> Referente: ${referenteDisplay} -> Puntero: ${punteroDisplay}` }
  }

  function viewReportesPorSeleccion() {
    const { mode, headerPathLine } = getReportesSeleccionModeAndHeaderLine()
    agentLog({
      runId: 'pre-fix',
      hypothesisId: 'H_SEL_MODE_VIEW',
      location: 'src/pages/personas/index.tsx:view-reportes-por-seleccion',
      message: 'Reportes por seleccion: view branch decided',
      data: { mode, grupoId: reportesGrupoId, referenteId: reportesReferenteId, punteroId: reportesPunteroId, headerPathLine },
    })

    if (mode === 'todos') {
      openReportWindow(buildGruposOnlyReportHtml({ headerPathLine }))
      return
    }
    if (mode === 'grupo') {
      viewReferentesDeGrupo()
      return
    }
    if (mode === 'referente') {
      openReportWindow(buildPunterosYVotosDeReferenteHtml({ headerPathLine }))
      return
    }
    viewVotantesDePuntero()
  }

  function printReportesPorSeleccion() {
    const { mode, headerPathLine } = getReportesSeleccionModeAndHeaderLine()
    agentLog({
      runId: 'pre-fix',
      hypothesisId: 'H_SEL_MODE_PRINT',
      location: 'src/pages/personas/index.tsx:print-reportes-por-seleccion',
      message: 'Reportes por seleccion: print branch decided',
      data: { mode, grupoId: reportesGrupoId, referenteId: reportesReferenteId, punteroId: reportesPunteroId, headerPathLine },
    })

    if (mode === 'todos') {
      const w = window.open('', '_blank')
      if (!w) return
      w.document.open()
      w.document.write(buildGruposOnlyReportHtml({ headerPathLine }))
      w.document.close()
      w.focus()
      w.print()
      return
    }
    if (mode === 'grupo') {
      printReferentesDeGrupo()
      return
    }
    if (mode === 'referente') {
      const w = window.open('', '_blank')
      if (!w) return
      w.document.open()
      w.document.write(buildPunterosYVotosDeReferenteHtml({ headerPathLine }))
      w.document.close()
      w.focus()
      w.print()
      return
    }
    printVotantesDePuntero()
  }

  function buildCantidadesTotalesReportHtml(): string {
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

    const grupos = [...reportesGrupos].sort(sortByApellidoNombre)
    const refsByGrupo = new Map<number, PersonaResponseDTO[]>()
    reportesReferentes.forEach((r) => {
      const gid = r.LiderId ?? 0
      if (!refsByGrupo.has(gid)) refsByGrupo.set(gid, [])
      refsByGrupo.get(gid)!.push(r)
    })
    refsByGrupo.forEach((arr) => arr.sort(sortByApellidoNombre))

    const punterosByReferente = new Map<number, PersonaResponseDTO[]>()
    reportesPunteros.forEach((p) => {
      const rid = p.LiderId ?? 0
      if (!punterosByReferente.has(rid)) punterosByReferente.set(rid, [])
      punterosByReferente.get(rid)!.push(p)
    })

    const votantesCountByPuntero = new Map<number, number>()
    reportesVotantes.forEach((v) => {
      const pid = v.LiderId ?? 0
      votantesCountByPuntero.set(pid, (votantesCountByPuntero.get(pid) ?? 0) + 1)
    })

    let globalIndex = 0
    const rows: string[] = []
    const groupSummaries: Array<{ grupoId: number; punteros: number; votantes: number }> = []

    grupos.forEach((g, gi) => {
      const refs = refsByGrupo.get(g.Id) ?? []
      rows.push(`
        <tr class="reportGroupTopRow">
          <td>${gi + 1}</td>
          <td><strong>${g.Apellido.toUpperCase()}${g.Nombre ? `, ${g.Nombre}` : ''}</strong></td>
          <td style="text-align:right;">—</td>
          <td style="text-align:right;">—</td>
          <td style="text-align:right;">—</td>
        </tr>`)

      if (refs.length === 0) {
        rows.push(`
          <tr class="reportEmptyRow">
            <td></td>
            <td class="reportIndent1"><em>Sin referentes</em></td>
            <td style="text-align:right;">0</td>
            <td style="text-align:right;">0</td>
            <td style="text-align:right;">0</td>
          </tr>`)
        groupSummaries.push({ grupoId: g.Id, punteros: 0, votantes: 0 })
        return
      }

      let groupPunteros = 0
      let groupVotantes = 0
      refs.forEach((ref) => {
        globalIndex += 1
        const punteros = punterosByReferente.get(ref.Id) ?? []
        const votos = punteros.reduce((acc, pun) => acc + (votantesCountByPuntero.get(pun.Id) ?? 0), 0)
        groupPunteros += punteros.length
        groupVotantes += votos
        rows.push(`
          <tr>
            <td>${gi + 1}.${globalIndex}</td>
            <td class="reportIndent1">${ref.Apellido}, ${ref.Nombre}</td>
            <td style="text-align:right;">${punteros.length}</td>
            <td style="text-align:right;">${votos}</td>
            <td style="text-align:right;">${punteros.length + votos}</td>
          </tr>`)
      })

      groupSummaries.push({ grupoId: g.Id, punteros: groupPunteros, votantes: groupVotantes })
      rows.push(`
        <tr class="reportSubTotalRow">
          <td></td>
          <td><strong>Subtotal ${g.Apellido.toUpperCase()}${g.Nombre ? `, ${g.Nombre}` : ''}</strong></td>
          <td style="text-align:right;"><strong>${groupPunteros}</strong></td>
          <td style="text-align:right;"><strong>${groupVotantes}</strong></td>
          <td style="text-align:right;"><strong>${groupPunteros + groupVotantes}</strong></td>
        </tr>`)

      if (gi < grupos.length - 1) {
        rows.push('<tr class="reportGroupSpacer"><td colspan="5"></td></tr>')
      }
    })

    const rowsHtml = rows.join('')

    const totalPunteros = cantidadesTotalesRows.reduce((a, r) => a + r.punteros, 0)
    const totalVotos = cantidadesTotalesRows.reduce((a, r) => a + r.votos, 0)
    const totalGeneral = totalPunteros + totalVotos

    agentLog({
      runId: 'pre-fix',
      hypothesisId: 'H3',
      location: 'src/pages/personas/index.tsx:build-cantidades-totales-html',
      message: 'Building cantidades totales HTML',
      data: { rows: cantidadesTotalesRows.length, totalPunteros, totalVotos, totalGeneral },
    })
    agentLog({
      runId: 'pre-fix',
      hypothesisId: 'H23',
      location: 'src/pages/personas/index.tsx:build-cantidades-totales-html-groups',
      message: 'Cantidades totales grouped by grupo',
      data: { grupos: grupos.length, groupSummaries },
    })

    return `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charSet="utf-8" />
          <title>Reporte - Cantidades totales</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; }
            .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
            h1 { font-size: 22px; margin: 0; letter-spacing: 0.02em; }
            .meta { color: #555; font-size: 13px; }
            .metaLine { margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background: #f3f4f6; }
            tfoot td { background: #e5e7eb; font-weight: 700; }
            tr.reportGroupTopRow { background: #dbeafe; font-weight: 900; }
            tr.reportSubTotalRow { background: #f3f4f6; font-weight: 700; }
            tr.reportEmptyRow { background: #fff; color: #6b7280; }
            td.reportIndent1 { padding-left: 18px; }
            tr.reportGroupSpacer td { height: 10px; border: none; border-left: 1px solid #ccc; border-right: 1px solid #ccc; background: #fff; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CANTIDADES TOTALES (POR REFERENTE)</h1>
            <div class="meta">
              <div>Fecha: ${formattedDate}</div>
              <div class="metaLine">Grupo: Varios</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Apellido/s y Nombre/s</th>
                <th style="text-align:right;">Punteros</th>
                <th style="text-align:right;">Votantes</th>
                <th style="text-align:right;">Total de votos (Punteros + Votantes)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2">Totales</td>
                <td style="text-align:right;">${totalPunteros}</td>
                <td style="text-align:right;">${totalVotos}</td>
                <td style="text-align:right;">${totalGeneral}</td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `
  }

  function buildPunterosYVotosDeReferenteHtml(options?: { headerPathLine?: string }): string {
    const now = new Date()
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
    const ref = reportesReferentes.find((r) => r.Id === reportesReferenteId) ?? null
    const title = ref ? `${ref.Apellido}, ${ref.Nombre}` : 'Referente'
    const groupName = ref?.LiderNombre ?? '—'
    const headerPathLine = (options?.headerPathLine ?? '').trim()

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

    const punteros = [...reportesPunterosDeReferente].sort(sortByApellidoNombre)
    const votantesByPuntero = new Map<number, PersonaResponseDTO[]>()
    reportesVotantesDeReferente.forEach((v) => {
      const pid = v.LiderId ?? 0
      if (!votantesByPuntero.has(pid)) votantesByPuntero.set(pid, [])
      votantesByPuntero.get(pid)!.push(v)
    })
    votantesByPuntero.forEach((arr) => arr.sort(sortByApellidoNombre))

    const rows: string[] = []
    punteros.forEach((pun, i) => {
      rows.push(`
        <tr class="reportRowPun">
          <td class="reportNumPun">${i + 1}</td>
          <td>Puntero</td>
          <td><strong>${pun.Apellido}, ${pun.Nombre}</strong></td>
          <td>${pun.DNI}</td>
          <td>${pun.Telefono ?? '—'}</td>
          <td>${pun.EscuelaNombre ?? '—'}</td>
          <td>${pun.NroMesa ?? '—'}</td>
        </tr>`)
      const votantes = votantesByPuntero.get(pun.Id) ?? []
      votantes.forEach((v, j) => {
        rows.push(`
        <tr class="reportRowVot">
          <td class="reportNumVot">${i + 1}.${j + 1}</td>
          <td class="reportRolVot">Votante</td>
          <td class="reportIndent2">${v.Apellido}, ${v.Nombre}</td>
          <td>${v.DNI}</td>
          <td>${v.Telefono ?? '—'}</td>
          <td>${v.EscuelaNombre ?? '—'}</td>
          <td>${v.NroMesa ?? '—'}</td>
        </tr>`)
      })
      if (i < punteros.length - 1) rows.push('<tr class="reportJerarquiaSpacer"><td colspan="6"></td></tr>')
    })

    agentLog({
      runId: 'pre-fix',
      hypothesisId: 'H14',
      location: 'src/pages/personas/index.tsx:build-punteros-votos-ref',
      message: 'Building punteros+votantes for referente',
      data: {
        referenteId: reportesReferenteId,
        punteros: reportesPunterosDeReferente.length,
        votantes: reportesVotantesDeReferente.length,
      },
    })

    return `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charSet="utf-8" />
          <title>Reporte - Punteros y votantes de referente</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; }
            .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
            .headerLeft { display: flex; flex-direction: column; }
            h1 { font-size: 22px; margin: 0; letter-spacing: 0.02em; }
            .meta { color: #555; font-size: 13px; }
            .metaLine { margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background: #f3f4f6; }
            tr.reportRowPun { background: #e5e7eb; font-weight: bold; }
            tr.reportRowVot { background: #fff; }
            td.reportNumPun { padding-left: 12px; }
            td.reportNumVot { padding-left: 40px; }
            td.reportIndent2 { padding-left: 24px; }
            tr.reportJerarquiaSpacer td { height: 12px; border: none; border-left: 1px solid #ccc; border-right: 1px solid #ccc; background: #fff; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="headerLeft">
              ${headerPathLine ? `<div class="metaLine">${headerPathLine}</div>` : ''}
              <h1>PUNTEROS Y VOTANTES DE: ${title}</h1>
            </div>
            <div class="meta">
              <div>Fecha: ${formattedDate}</div>
              ${headerPathLine ? '' : `<div class="metaLine">Grupo: ${groupName}</div>`}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Rol</th>
                <th>Apellido/s y Nombre/s</th>
                <th>DNI</th>
                <th>Teléfono</th>
                <th>Escuela</th>
                <th>Mesa</th>
              </tr>
            </thead>
            <tbody>
              ${rows.join('')}
            </tbody>
          </table>
        </body>
      </html>
    `
  }

  function viewVotantesDePuntero() {
    if (reportesPunteroId == null) return
    agentLog({
      runId: 'pre-fix',
      hypothesisId: 'H16',
      location: 'src/pages/personas/index.tsx:view-votantes-pun',
      message: 'View votantes de puntero',
      data: { punteroId: reportesPunteroId, count: reportesVotantesDePuntero.length },
    })
    const pun = reportesPunteros.find((p) => p.Id === reportesPunteroId) ?? null
    const ref = pun?.LiderId != null ? reportesReferentes.find((r) => r.Id === pun.LiderId) ?? null : null
    const grupo = ref?.LiderId != null ? reportesGrupos.find((g) => g.Id === ref.LiderId) ?? null : null
    const grupoDisplay = grupo ? `${grupo.Apellido}, ${grupo.Nombre}` : ref?.LiderNombre ?? '—'
    const referenteDisplay = ref ? `${ref.Apellido}, ${ref.Nombre}` : '—'
    const punteroDisplay = pun ? `${pun.Apellido}, ${pun.Nombre}` : '—'
    const leaderById = new Map(reportesPunteros.map((p) => [p.Id, p]))
    openReportWindow(
      buildReportHtml(4, reportesVotantesDePuntero, leaderById, {
        groupName: grupoDisplay,
        allLeaders: pun ? [pun] : undefined,
        includeRolColumn: true,
        headerPathLine: `Grupo: ${grupoDisplay} -> Referente: ${referenteDisplay} -> Puntero: ${punteroDisplay}`,
      })
    )
  }

  function viewReferentesDeGrupo() {
    if (reportesGrupoId == null) return
    const grupo = reportesGrupos.find((g) => g.Id === reportesGrupoId) ?? null
    const list = reportesReferentes.filter((r) => r.LiderId === reportesGrupoId)
    const leaderById = new Map(reportesGrupos.map((g) => [g.Id, g]))
    openReportWindow(
      buildReportHtml(2, list, leaderById, {
        groupName: grupo ? `${grupo.Apellido}, ${grupo.Nombre}` : '—',
        allLeaders: grupo ? [grupo] : undefined,
        headerPathLine: grupo ? `Grupo: ${grupo.Apellido}, ${grupo.Nombre}` : 'Grupo: Todos',
      })
    )
  }

  function printReferentesDeGrupo() {
    if (reportesGrupoId == null) return
    const grupo = reportesGrupos.find((g) => g.Id === reportesGrupoId) ?? null
    const list = reportesReferentes.filter((r) => r.LiderId === reportesGrupoId)
    const leaderById = new Map(reportesGrupos.map((g) => [g.Id, g]))
    const w = window.open('', '_blank')
    if (!w) return
    w.document.open()
    w.document.write(
      buildReportHtml(2, list, leaderById, {
        groupName: grupo ? `${grupo.Apellido}, ${grupo.Nombre}` : '—',
        allLeaders: grupo ? [grupo] : undefined,
        headerPathLine: grupo ? `Grupo: ${grupo.Apellido}, ${grupo.Nombre}` : 'Grupo: Todos',
      })
    )
    w.document.close()
    w.focus()
    w.print()
  }

  function printVotantesDePuntero() {
    if (reportesPunteroId == null) return
    agentLog({
      runId: 'pre-fix',
      hypothesisId: 'H16',
      location: 'src/pages/personas/index.tsx:print-votantes-pun',
      message: 'Print votantes de puntero',
      data: { punteroId: reportesPunteroId, count: reportesVotantesDePuntero.length },
    })
    const w = window.open('', '_blank')
    if (!w) return
    w.document.open()
    const pun = reportesPunteros.find((p) => p.Id === reportesPunteroId) ?? null
    const ref = pun?.LiderId != null ? reportesReferentes.find((r) => r.Id === pun.LiderId) ?? null : null
    const grupo = ref?.LiderId != null ? reportesGrupos.find((g) => g.Id === ref.LiderId) ?? null : null
    const grupoDisplay = grupo ? `${grupo.Apellido}, ${grupo.Nombre}` : ref?.LiderNombre ?? '—'
    const referenteDisplay = ref ? `${ref.Apellido}, ${ref.Nombre}` : '—'
    const punteroDisplay = pun ? `${pun.Apellido}, ${pun.Nombre}` : '—'
    const leaderById = new Map(reportesPunteros.map((p) => [p.Id, p]))
    w.document.write(
      buildReportHtml(4, reportesVotantesDePuntero, leaderById, {
        groupName: grupoDisplay,
        allLeaders: pun ? [pun] : undefined,
        includeRolColumn: true,
        headerPathLine: `Grupo: ${grupoDisplay} -> Referente: ${referenteDisplay} -> Puntero: ${punteroDisplay}`,
      })
    )
    w.document.close()
    w.focus()
    w.print()
  }

  function viewCantidadesTotalesReport() {
    if (cantidadesTotalesRows.length === 0) {
      window.alert('No hay datos para mostrar.')
      return
    }
    openReportWindow(buildCantidadesTotalesReportHtml())
  }

  function printCantidadesTotalesReport() {
    if (cantidadesTotalesRows.length === 0) {
      window.alert('No hay datos para imprimir.')
      return
    }
    const w = window.open('', '_blank')
    if (!w) return
    w.document.open()
    w.document.write(buildCantidadesTotalesReportHtml())
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

    if (tab.rol === 2) {
      fetchReportesData()
        .then(({ grupos, referentes }) => {
          const leaderById = new Map(grupos.map((g) => [g.Id, g]))
          openReportWindow(buildReportHtml(2, referentes, leaderById, { groupName: 'Varios' }))
        })
        .catch(() => window.alert('No se pudo generar el reporte.'))
      return
    }
    if (tab.rol === 3) {
      fetchReportesData()
        .then(({ grupos, referentes, punteros }) => {
          // Reusar la misma salida que en "Reportes" → "Todos los punteros"
          openReportWindow(buildPunterosPorGrupoReportHtml({ grupos, referentes, punteros }))
        })
        .catch(() => window.alert('No se pudo generar el reporte.'))
      return
    }
    if (tab.rol === 4) {
      // Votantes: mostrar Jerarquía completa (por grupo)
      fetchReportesData()
        .then(({ grupos, referentes, punteros, votantes }) => {
          openReportWindow(buildJerarquiaReportHtml({ grupos, referentes, punteros, votantes }))
        })
        .catch(() => window.alert('No se pudo generar el reporte.'))
      return
    }
    // Otros roles: listado simple ordenado por apellido
    {
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
              <td>${p.Apellido}, ${p.Nombre}</td>
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
            .metaLine { margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Grupo: ${groupTitle}</h1>
            <div class="meta">
              <div>Fecha y hora: ${formattedDateTime}</div>
              <div class="metaLine">Grupo: ${groupTitle}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Apellido/s y Nombre/s</th>
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

    if (tab.rol === 2) {
      fetchReportesData()
        .then(({ grupos, referentes }) => {
          const leaderById = new Map(grupos.map((g) => [g.Id, g]))
          const w = window.open('', '_blank')
          if (!w) return
          w.document.open()
          w.document.write(buildReportHtml(2, referentes, leaderById, { groupName: 'Varios' }))
          w.document.close()
          w.focus()
          w.print()
        })
        .catch(() => window.alert('No se pudo imprimir el reporte.'))
      return
    }
    if (tab.rol === 3) {
      fetchReportesData()
        .then(({ grupos, referentes, punteros }) => {
          const w = window.open('', '_blank')
          if (!w) return
          w.document.open()
          w.document.write(buildPunterosPorGrupoReportHtml({ grupos, referentes, punteros }))
          w.document.close()
          w.focus()
          w.print()
        })
        .catch(() => window.alert('No se pudo imprimir el reporte.'))
      return
    }
    if (tab.rol === 4) {
      fetchReportesData()
        .then(({ grupos, referentes, punteros, votantes }) => {
          const w = window.open('', '_blank')
          if (!w) return
          w.document.open()
          w.document.write(buildJerarquiaReportHtml({ grupos, referentes, punteros, votantes }))
          w.document.close()
          w.focus()
          w.print()
        })
        .catch(() => window.alert('No se pudo imprimir el reporte.'))
      return
    }
    // Otros roles: listado simple ordenado por apellido
    {
      const first = filteredList[0]
      const groupTitle =
        first?.LiderNombre || tab.label || 'Grupo sin nombre'

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
              <td>${p.Apellido}, ${p.Nombre}</td>
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
            .metaLine { margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Grupo: ${groupTitle}</h1>
            <div class="meta">
              <div>Fecha y hora: ${formattedDateTime}</div>
              <div class="metaLine">Grupo: ${groupTitle}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Apellido/s y Nombre/s</th>
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
    agentLog({
      runId: 'pre-fix',
      hypothesisId: 'H5',
      location: 'src/pages/personas/index.tsx:openEdit',
      message: 'Opening edit form',
      data: {
        entityId: entity.Id,
        entityRol: entity.Rol,
        entityLiderId: entity.LiderId,
        entityLiderNombre: entity.LiderNombre,
        tabId: tab.id,
        tabRol: tab.rol,
        tabLeaderRole: tab.leaderRole,
      },
    })
    setEditingId(entity.Id)
    const nextForm = formFromEntity(entity)
    agentLog({
      runId: 'post-fix',
      hypothesisId: 'H2',
      location: 'src/pages/personas/index.tsx:openEdit-nextForm',
      message: 'Computed form from entity',
      data: { nextFormLiderId: nextForm.LiderId ?? null, nextFormRol: nextForm.Rol },
    })
    setForm(nextForm)
    if (tab.leaderRole != null) {
      setLeaderDropdownOpen(false)
      setLeaderIsTyping(false)
      setLeaderFilterText('')
      setLeaderSelectVisible(false)
      agentLog({
        runId: 'post-fix',
        hypothesisId: 'H6',
        location: 'src/pages/personas/index.tsx:openEdit-leaderText',
        message: 'Edit opened with existing leader',
        data: { entityId: entity.Id, liderId: entity.LiderId ?? null, liderNombre: entity.LiderNombre ?? '' },
      })
    }
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
    setLeaderSelectVisible(false)
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

  const selectedLeaderDisplay = React.useMemo(() => {
    if (tab.leaderRole == null) return ''
    if (form.LiderId == null) return ''
    const match = leaders.find((l) => l.Id === form.LiderId)
    return match ? getLeaderDisplay(match, leaderDisplayOpts) : ''
  }, [tab.leaderRole, form.LiderId, leaders, leaderDisplayOpts])

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
    inicio: (
      <svg className="personasTabIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5 10v10h14V10" />
      </svg>
    ),
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
    configuracion: (
      <svg
        className="personasTabIcon"
        viewBox="-1 -1 26 26"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.99l.02.02a2.2 2.2 0 0 1-3.11 3.11l-.02-.02a1.8 1.8 0 0 0-1.99-.36 1.8 1.8 0 0 0-1.09 1.65V22a2.2 2.2 0 0 1-4.4 0v-.03a1.8 1.8 0 0 0-1.09-1.65 1.8 1.8 0 0 0-1.99.36l-.02.02A2.2 2.2 0 1 1 2.81 17l.02-.02a1.8 1.8 0 0 0 .36-1.99 1.8 1.8 0 0 0-1.65-1.09H1.5a2.2 2.2 0 0 1 0-4.4h.04a1.8 1.8 0 0 0 1.65-1.09 1.8 1.8 0 0 0-.36-1.99l-.02-.02A2.2 2.2 0 1 1 6.03 2.8l.02.02a1.8 1.8 0 0 0 1.99.36 1.8 1.8 0 0 0 1.09-1.65V1.5a2.2 2.2 0 0 1 4.4 0v.03a1.8 1.8 0 0 0 1.09 1.65 1.8 1.8 0 0 0 1.99-.36l.02-.02A2.2 2.2 0 1 1 21.2 6.03l-.02.02a1.8 1.8 0 0 0-.36 1.99 1.8 1.8 0 0 0 1.65 1.09h.03a2.2 2.2 0 0 1 0 4.4h-.03a1.8 1.8 0 0 0-1.65 1.09Z" />
      </svg>
    ),
  }

  function renderHeaderIcon(): React.ReactNode {
    const icon = tabIcons[tab.id]
    if (icon) return icon
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20v-2a4 4 0 014-4h8a4 4 0 014 4v2" />
      </svg>
    )
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
              {renderHeaderIcon()}
              {tab.label}
              {tab.id === 'inicio' && (
                <button
                  type="button"
                  className="personasInicioHelpBtnInTitle"
                  onClick={openAppHelpModal}
                  title="Ayuda para configuración inicial de la aplicación"
                  aria-label="Ayuda para configuración inicial de la aplicación"
                  onMouseEnter={(e) => {
                    // #region agent log
                    fetch('http://127.0.0.1:7743/ingest/9817c7ed-4593-4ad7-9571-e38db2bdfd68',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b35ed6'},body:JSON.stringify({sessionId:'b35ed6',location:'PersonasPage:index.tsx:help-btn-hover',message:'help button hover',data:{tabId:tab.id},timestamp:Date.now(),hypothesisId:'H6_help_btn_hover_tooltip'},)}).catch(()=>{});
                    const target = e.currentTarget as HTMLElement
                    const cs = window.getComputedStyle(target)
                    fetch('http://127.0.0.1:7743/ingest/9817c7ed-4593-4ad7-9571-e38db2bdfd68',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b35ed6'},body:JSON.stringify({sessionId:'b35ed6',location:'PersonasPage:index.tsx:help-btn-hover:computedStyle',message:'computed styles for help button',data:{borderWidth:cs.borderWidth,borderStyle:cs.borderStyle,backgroundColor:cs.backgroundColor,padding:cs.padding,display:cs.display,height:cs.height,width:cs.width},timestamp:Date.now(),hypothesisId:'H7_help_btn_contour_style'},)}).catch(()=>{});
                    // #endregion
                  }}
                >
                  <span className="personasHelpInfoIBadge" aria-hidden="true">
                    i
                  </span>
                </button>
              )}
            </h2>
            <p className="personasPanelDescription">
              {tab.isReportes
                ? 'Estadísticas por rol: referentes, punteros, votantes y total de votos.'
                : tab.id === 'inicio'
                ? 'Panel principal con estadísticas generales.'
                : tab.id === 'configuracion'
                ? ''
                : `Administrá los ${tab.label.toLowerCase()} del sistema. Creá, editá o eliminá registros desde la tabla.`}
            </p>
          </div>
          {!tab.isReportes && tab.id !== 'configuracion' && tab.id !== 'inicio' && (
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

        {tab.id === 'inicio' ? (
          <div key="inicioPanel" className="reportesPanel">
            {statsLoading ? (
              <p className="personasLoading">Cargando estadísticas...</p>
            ) : (
              <div className="reportesGrid">
                <div className="reportesCard">
                  <span className="reportesCardLabel">Grupos</span>
                  <span className="reportesCardValue">{stats.grupos}</span>
                </div>
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

            {showAppHelpModal && (
              <div
                className="personasHelpAppOverlay"
                role="dialog"
                aria-modal="true"
                aria-labelledby="appHelpTitle"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) closeAppHelpModal()
                }}
              >
                <div className="personasHelpAppModal">
                  <div className="personasHelpAppHeader">
                    <h3 id="appHelpTitle" className="personasHelpAppTitle">
                      Ayuda para usar la aplicación
                    </h3>
                    <button
                      type="button"
                      className="personasHelpDrawerClose"
                      onClick={closeAppHelpModal}
                      aria-label="Cerrar"
                      title="Cerrar"
                    >
                      ×
                    </button>
                  </div>

                  <div className="personasHelpAppBody">
                    <ol className="personasHelpAppList">
                      <li>
                        Carga la <strong>información de tu grupo</strong> en la pestaña <strong>Grupos</strong>.
                      </li>
                      <li>
                        Carga la <strong>información de los Referentes</strong> en la pestaña <strong>Referentes</strong>.
                        <br />
                        <span>Recordá que un referente tiene que pertenecer a un grupo.</span>
                      </li>
                      <li>
                        Carga la <strong>información de los Punteros</strong> en la pestaña <strong>Punteros</strong>.
                        <br />
                        <span>Recordá que un puntero tiene que pertenecer a un Referente.</span>
                      </li>
                      <li>
                        Carga la <strong>información de los Votantes</strong> en la pestaña <strong>Votantes</strong>.
                        <br />
                        <span>Recordá que un votante tiene que pertenecer a un Puntero.</span>
                      </li>
                    </ol>

                    <div className="personasHelpAppSection">
                      <strong>¿Qué hace la pestaña Reportes?</strong>
                      <div className="personasHelpAppText">
                        Te permite <strong>ver</strong> e <strong>imprimir</strong> listados armados con los filtros (Grupo, Referente y/o Puntero) para generar reportes de la jerarquía.
                      </div>
                    </div>

                    <div className="personasHelpAppSection">
                      <strong>¿Cómo se usa el Padrón?</strong>
                      <div className="personasHelpAppText">
                        El padrón es un Excel que se usa para <strong>completar y sincronizar datos por DNI</strong> (por ejemplo, Escuela/Mesa). Primero lo <strong>importás</strong> en Configuración y luego usás la opción de <strong>sincronizar</strong> para actualizar los registros existentes.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : tab.id === 'configuracion' ? (
          <div key="configPanel" className="reportesPanel">
            <div className="personasCard" style={{ marginTop: 12 }}>
              <div className="personasFormHeader">
                <h3 className="personasFormTitle">Administrador</h3>
              </div>
              <p style={{ margin: '0 0 12px', color: '#555', fontSize: 13 }}>
                Gestión de Administradores. Creá, editá o eliminá registros desde la tabla.
              </p>
              <button type="button" className="personasButton personasButtonPrimary" onClick={openAdminModal}>
                Gestionar administradores
              </button>
            </div>

            <div className="personasCard" style={{ marginTop: 12 }}>
              <div className="personasFormHeader">
                <h3 className="personasFormTitle">Padrón</h3>
              </div>

              <p style={{ margin: '0 0 12px', color: '#555', fontSize: 13 }}>
                Cargá el padrón en formato Excel para completar Escuela/Mesa (y sincronizar datos por DNI).
              </p>

              <button
                type="button"
                className="personasButton personasButtonPrimary"
                onClick={openPadronImportModal}
              >
                Importar padrón
              </button>
              <span className="personasHelpWrap" aria-label="Ayuda para el formato del Excel">
                <span className="personasHelpIcon" aria-hidden="true">i</span>
                <span className="personasHelpTooltip">
                  El Excel debe tener las columnas en este orden: DNI, Nombre, Apellido, Escuela, Mesa, Orden. La extension del archivo tiene que ser (.xlsx).
                </span>
              </span>
            </div>

            {showPadronModal && (
              <div
                className="personasPadronOverlay"
                role="dialog"
                aria-modal="true"
                aria-labelledby="padronImportTitle"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) closePadronImportModal()
                }}
              >
                <div className="personasPadronModal">
                  <div className="personasPadronModalHeader">
                    <div>
                      <h3 id="padronImportTitle" className="personasPadronModalTitle">Importar Padrón</h3>
                      <p className="personasPadronModalSubtitle">
                        Cargá el padrón en Excel y sincronizá por DNI.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="personasPadronClose"
                      onClick={closePadronImportModal}
                      aria-label="Cerrar"
                      title="Cerrar"
                    >
                      ×
                    </button>
                  </div>

                  <div className="personasPadronBody">
                    {padronStep === 1 ? (
                      <>
                        <label className="personasField">
                          <input
                            type="file"
                            accept=".xlsx"
                            onChange={(e) => {
                              const f = e.target.files?.[0] ?? null
                              setPadronFile(f)
                              setPadronUploadError(null)
                              setPadronUploadResult(null)
                              setPadronSyncError(null)
                              setPadronSyncResult(null)
                            }}
                          />
                        </label>

                        <div style={{ marginTop: 14, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="personasButton personasButtonPrimary"
                            disabled={padronUploadLoading || !padronFile}
                            onClick={() => { void handleUploadPadronClick() }}
                          >
                            {padronUploadLoading ? 'Cargando...' : 'Cargar Padrón'}
                          </button>
                          <button
                            type="button"
                            className="personasButton personasButtonSecondary"
                            disabled={padronUploadLoading}
                            onClick={closePadronImportModal}
                          >
                            Cancelar
                          </button>
                        </div>

                        {padronUploadError && (
                          <p className="personasError" style={{ color: 'crimson', marginTop: 12 }}>
                            {padronUploadError}
                          </p>
                        )}

                        {padronUploadResult && (
                          <p style={{ margin: '12px 0 0', color: '#555', fontSize: 13 }}>
                            Archivo cargado. Filas: {padronUploadResult.RowsStored}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="personasButton personasButtonPrimary"
                            disabled={padronSyncLoading || padronUploadResult == null}
                            onClick={async () => {
                              if (padronUploadResult == null) return
                              setPadronSyncError(null)
                              setPadronSyncLoading(true)
                              setPadronSyncResult(null)
                              try {
                                const res = await syncPadronActive()
                                setPadronSyncResult(res)
                                agentLog({
                                  runId: 'debug',
                                  hypothesisId: 'H_SYNC_FLOW_SYNC_ENDPOINT',
                                  location: 'src/pages/personas/index.tsx:padron-modal-sync-onclick',
                                  message: 'Sync padrón result received',
                                  data: {
                                    PersonasUpdated: res.PersonasUpdated,
                                    DnisNotFoundCount: res.DnisNotFound?.length ?? 0,
                                  },
                                  timestamp: Date.now(),
                                })
                              } catch (e) {
                                const msg = e instanceof Error ? e.message : 'Error al sincronizar.'
                                setPadronSyncError(msg)
                                agentLog({
                                  runId: 'debug',
                                  hypothesisId: 'H_SYNC_FLOW_SYNC_ENDPOINT',
                                  location: 'src/pages/personas/index.tsx:padron-modal-sync-onclick',
                                  message: 'Sync padrón error',
                                  data: { error: msg },
                                  timestamp: Date.now(),
                                })
                              } finally {
                                setPadronSyncLoading(false)
                              }
                            }}
                          >
                            {padronSyncLoading ? 'Sincronizando...' : 'Sincronizar datos'}
                          </button>

                          <button
                            type="button"
                            className="personasButton personasButtonSecondary"
                            disabled={padronSyncLoading}
                            onClick={() => setPadronStep(1)}
                          >
                            Volver a cargar
                          </button>
                        </div>

                        {padronSyncError && (
                          <p className="personasError" style={{ color: 'crimson', marginTop: 12 }}>
                            {padronSyncError}
                          </p>
                        )}

                        {padronUploadResult && (
                          <p style={{ margin: '12px 0 0', color: '#111', fontWeight: 600 }}>
                            Cargado: {padronUploadResult.RowsStored} filas
                          </p>
                        )}

                        {padronSyncResult && (
                          <div style={{ marginTop: 12 }}>
                            <p style={{ margin: 0, color: '#111', fontWeight: 600 }}>
                              Personas actualizadas: {padronSyncResult.PersonasUpdated}
                            </p>
                            <p style={{ margin: '6px 0 0', color: '#555', fontSize: 13 }}>
                              DNIs no encontrados en Personas: {padronSyncResult.DnisNotFound.length}
                            </p>

                            {padronSyncResult.DnisNotFound.length > 0 && (
                              <div style={{ marginTop: 10 }}>
                                <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600 }}>
                                  En rojo (no existían en personas):
                                </p>
                                <div style={{ color: 'crimson', fontSize: 13, lineHeight: 1.5, maxHeight: 180, overflow: 'auto' }}>
                                  {padronSyncResult.DnisNotFound.slice(0, 200).map((d) => (
                                    <div key={`dni-missing-${d}`}>{d}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                          <button type="button" className="personasButton personasButtonSecondary" onClick={closePadronImportModal}>
                            Cerrar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showAdminModal && (
              <div
                className="personasAdminOverlay"
                role="dialog"
                aria-modal="true"
                aria-labelledby="adminModalTitle"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) closeAdminModal()
                }}
              >
                <div className="personasAdminModal">
                  <div className="personasAdminModalHeader">
                    <div>
                      <h3 id="adminModalTitle" className="personasAdminModalTitle">Gestión de Administradores</h3>
                      <p className="personasAdminModalSubtitle">Creá, editá o eliminá registros desde la tabla.</p>
                    </div>
                    <button
                      type="button"
                      className="personasPadronClose"
                      onClick={closeAdminModal}
                      aria-label="Cerrar"
                      title="Cerrar"
                    >
                      ×
                    </button>
                  </div>

                  <div className="personasAdminModalBody">
                    <div className="personasAdminTopBar">
                      <div className="personasSearchWrap personasAdminSearchWrap">
                        <svg className="personasSearchIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="7" />
                          <path d="M21 21l-4.3-4.3" />
                        </svg>
                        <input
                          value={adminSearch}
                          onChange={(e) => { setAdminSearch(e.target.value); setAdminPage(1) }}
                          placeholder="Buscar por nombre, apellido o DNI"
                          disabled={adminShowForm || adminSubmitting}
                        />
                      </div>
                      <button
                        type="button"
                        className="personasButton personasButtonPrimary personasAdminNewBtn"
                        onClick={openAdminCreate}
                        disabled={adminShowForm || adminSubmitting}
                      >
                        + Nuevo administrador
                      </button>
                    </div>

                    {adminShowForm && (
                      <div className="personasCard" style={{ marginTop: 12 }}>
                        <div className="personasFormHeader">
                          <h3 className="personasFormTitle">
                            {adminEditingId != null ? 'Editar administrador' : 'Crear administrador'}
                          </h3>
                          <button
                            type="button"
                            className="personasFormClose"
                            onClick={() => { setAdminShowForm(false); setAdminEditingId(null) }}
                            title="Cerrar"
                            aria-label="Cerrar"
                          >
                            ×
                          </button>
                        </div>
                        <form className="personasForm" onSubmit={handleAdminSubmit}>
                          <label className="personasField">
                            <span className="personasFieldLabel">Nombre *</span>
                            <input
                              className="personasInput"
                              value={adminForm.Nombre}
                              onChange={(e) => setAdminForm((s) => ({ ...s, Nombre: sanitizeNombreApellido(e.target.value) }))}
                              maxLength={50}
                              autoComplete="given-name"
                            />
                          </label>
                          <label className="personasField">
                            <span className="personasFieldLabel">Apellido *</span>
                            <input
                              className="personasInput"
                              value={adminForm.Apellido}
                              onChange={(e) => setAdminForm((s) => ({ ...s, Apellido: sanitizeNombreApellido(e.target.value) }))}
                              maxLength={50}
                              autoComplete="family-name"
                            />
                          </label>
                          <label className="personasField">
                            <span className="personasFieldLabel">DNI *</span>
                            <input
                              className="personasInput"
                              value={adminForm.DNI}
                              onChange={(e) => setAdminForm((s) => ({ ...s, DNI: sanitizeDNI(e.target.value) }))}
                              inputMode="numeric"
                              maxLength={8}
                              autoComplete="off"
                            />
                          </label>
                          <label className="personasField">
                            <span className="personasFieldLabel">Teléfono</span>
                            <input
                              className="personasInput"
                              value={adminForm.Telefono ?? ''}
                              onChange={(e) => setAdminForm((s) => ({ ...s, Telefono: sanitizeTelefono(e.target.value) }))}
                              inputMode="tel"
                              maxLength={13}
                              autoComplete="tel"
                            />
                          </label>
                          <label className="personasField">
                            <span className="personasFieldLabel">Escuela</span>
                            <input
                              className="personasInput"
                              value={adminForm.Escuela ?? ''}
                              onChange={(e) => setAdminForm((s) => ({ ...s, Escuela: sanitizeEscuela(e.target.value) }))}
                              maxLength={75}
                              autoComplete="organization"
                            />
                          </label>
                          <label className="personasField">
                            <span className="personasFieldLabel">Mesa</span>
                            <input
                              className="personasInput"
                              value={adminForm.Mesa ?? ''}
                              onChange={(e) => setAdminForm((s) => ({ ...s, Mesa: sanitizeMesa(e.target.value) }))}
                              inputMode="numeric"
                              maxLength={4}
                              autoComplete="off"
                            />
                          </label>
                          <div className="personasActions personasFieldFull">
                            <button className="personasButton" disabled={adminSubmitting} type="submit">
                              {adminSubmitting ? 'Guardando...' : adminEditingId != null ? 'Guardar cambios' : 'Crear administrador'}
                            </button>
                            <button
                              type="button"
                              className="personasButton personasButtonSecondary"
                              onClick={() => { setAdminShowForm(false); setAdminEditingId(null) }}
                            >
                              Cancelar
                            </button>
                            <div className="personasStatus" role="status" aria-live="polite">
                              {adminError ? <span key="error" className="personasError">{adminError}</span> : null}
                              {adminSuccess ? <span key="success" className="personasSuccess">{adminSuccess}</span> : null}
                            </div>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="personasTableCard" style={{ marginTop: 12 }}>
                      <div className="personasTableWrap">
                        {adminListLoading ? (
                          <p className="personasLoading">Cargando lista...</p>
                        ) : (() => {
                          const q = adminSearch.trim().toLowerCase()
                          const filtered = q
                            ? adminList.filter(
                                (p) =>
                                  (p.Nombre ?? '').toLowerCase().includes(q) ||
                                  (p.Apellido ?? '').toLowerCase().includes(q) ||
                                  (p.DNI ?? '').toLowerCase().includes(q)
                              )
                            : adminList
                          const sorted = [...filtered].sort((a, b) => {
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
                          const totalPages = Math.max(1, Math.ceil(sorted.length / adminPerPage))
                          const start = (adminPage - 1) * adminPerPage
                          const pageRows = sorted.slice(start, start + adminPerPage)

                          if (sorted.length === 0) {
                            return <p className="personasEmpty">No hay administradores.</p>
                          }

                          return (
                            <>
                              <table className="personasTable">
                                <thead>
                                  <tr>
                                    <th>Apellido y Nombre</th>
                                    <th>DNI</th>
                                    <th>Teléfono</th>
                                    <th>Escuela</th>
                                    <th>Mesa</th>
                                    <th className="personasTableActions">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pageRows.map((row) => (
                                    <tr key={`admin-${row.Id}`}>
                                      <td>{`${row.Apellido}, ${row.Nombre}`}</td>
                                      <td>{row.DNI}</td>
                                      <td>{row.Telefono ?? '—'}</td>
                                      <td>{row.EscuelaNombre ?? '—'}</td>
                                      <td>{row.NroMesa ?? '—'}</td>
                                      <td className="personasTableActions">
                                        <button
                                          type="button"
                                          className="personasTableLink"
                                          onClick={() => openAdminEdit(row)}
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
                                          onClick={() => { void handleAdminDelete(row) }}
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
                              <div className="personasPagination">
                                <span>Total: {sorted.length} administradores</span>
                                <div className="personasPaginationNav">
                                  <button
                                    type="button"
                                    className="personasPaginationBtn"
                                    disabled={adminPage <= 1}
                                    onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
                                    aria-label="Página anterior"
                                  >
                                    ←
                                  </button>
                                  <button
                                    type="button"
                                    className="personasPaginationBtn"
                                    disabled={adminPage >= totalPages}
                                    onClick={() => setAdminPage((p) => Math.min(totalPages, p + 1))}
                                    aria-label="Página siguiente"
                                  >
                                    →
                                  </button>
                                  <div className="personasPaginationPerPage">
                                    <select
                                      value={adminPerPage}
                                      onChange={(e) => { setAdminPerPage(Number(e.target.value)); setAdminPage(1) }}
                                      aria-label="Elementos por página"
                                    >
                                      {[7, 10, 15, 25].map((n) => (
                                        <option key={`admin-perpage-${n}`} value={n}>{n} / página</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : tab.isReportes ? (
          <div key="reportesPanel" className="reportesPanel">
            <h3 className="reportesListadosTitle">Listados para ver o imprimir</h3>
            {reportesListsLoading ? (
              <p className="personasLoading">Cargando listados...</p>
            ) : (
              <div className="reportesListadosWrap">
                <div className="reportesRow reportesRowTop">
                  <div className="reportesListadoCard">
                    <span className="reportesListadoCardLabel">Todos los referentes</span>
                    <span className="reportesListadoCardCount">{reportesReferentes.length} referentes</span>
                    <div className="reportesListadoCardActions">
                      <button
                        type="button"
                        className="personasButton personasButtonSecondary personasIconButton"
                        onClick={() => viewReportFromReportes(2)}
                        disabled={reportesReferentes.length === 0}
                        title="Ver reporte"
                        aria-label="Ver reporte"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="personasButton personasIconButton"
                        onClick={() => printReportFromReportes(2)}
                        disabled={reportesReferentes.length === 0}
                        title="Imprimir reporte"
                        aria-label="Imprimir reporte"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M6 9V3h12v6" />
                          <path d="M6 17v4h12v-4" />
                          <path d="M6 13h12a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v1a3 3 0 0 0 3 3z" />
                          <path d="M9 17h6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="reportesListadoCard">
                    <span className="reportesListadoCardLabel">Todos los punteros</span>
                    <span className="reportesListadoCardCount">{reportesPunteros.length} punteros</span>
                    <div className="reportesListadoCardActions">
                      <button
                        type="button"
                        className="personasButton personasButtonSecondary personasIconButton"
                        onClick={() => viewReportFromReportes(3)}
                        disabled={reportesPunteros.length === 0}
                        title="Ver reporte"
                        aria-label="Ver reporte"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="personasButton personasIconButton"
                        onClick={() => printReportFromReportes(3)}
                        disabled={reportesPunteros.length === 0}
                        title="Imprimir reporte"
                        aria-label="Imprimir reporte"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M6 9V3h12v6" />
                          <path d="M6 17v4h12v-4" />
                          <path d="M6 13h12a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v1a3 3 0 0 0 3 3z" />
                          <path d="M9 17h6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="reportesListadoCard reportesListadoCardJerarquia">
                    <span className="reportesListadoCardLabel">Todos los votantes</span>
                    <span className="reportesListadoCardCount">{reportesVotantes.length} votantes</span>
                    <div className="reportesListadoCardActions">
                      <button
                        type="button"
                        className="personasButton personasButtonSecondary personasIconButton"
                        onClick={viewJerarquiaReport}
                        title="Ver reporte"
                        aria-label="Ver reporte"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="personasButton personasIconButton"
                        onClick={printJerarquiaReport}
                        title="Imprimir reporte"
                        aria-label="Imprimir reporte"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M6 9V3h12v6" />
                          <path d="M6 17v4h12v-4" />
                          <path d="M6 13h12a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v1a3 3 0 0 0 3 3z" />
                          <path d="M9 17h6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="reportesRow reportesRowMid">
                  <div className="reportesListadoCard reportesListadoCardTotales">
                    <span className="reportesListadoCardLabel">Cantidades totales</span>
                    <span className="reportesListadoCardCount">
                      {cantidadesTotalesRows.length} referentes (punteros y votos por referente)
                    </span>
                    <div className="reportesListadoCardActions">
                      <button
                        type="button"
                        className="personasButton personasButtonSecondary personasIconButton"
                        onClick={viewCantidadesTotalesReport}
                        disabled={cantidadesTotalesRows.length === 0}
                        title="Ver reporte"
                        aria-label="Ver reporte"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="personasButton personasIconButton"
                        onClick={printCantidadesTotalesReport}
                        disabled={cantidadesTotalesRows.length === 0}
                        title="Imprimir reporte"
                        aria-label="Imprimir reporte"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M6 9V3h12v6" />
                          <path d="M6 17v4h12v-4" />
                          <path d="M6 13h12a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v1a3 3 0 0 0 3 3z" />
                          <path d="M9 17h6" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="reportesListadoCard reportesListadoCardVehiculos">
                    <span className="reportesListadoCardLabel">Vehículos</span>
                    <span className="reportesListadoCardCount">Próximamente</span>
                    <div className="reportesListadoCardActions">
                      <button
                        type="button"
                        className="personasButton personasButtonSecondary personasIconButton"
                        disabled
                        title="Ver reporte"
                        aria-label="Ver reporte"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="personasButton personasIconButton"
                        disabled
                        title="Imprimir reporte"
                        aria-label="Imprimir reporte"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M6 9V3h12v6" />
                          <path d="M6 17v4h12v-4" />
                          <path d="M6 13h12a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v1a3 3 0 0 0 3 3z" />
                          <path d="M9 17h6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="reportesRow reportesRowBottom">
                  <div className="reportesListadoCard reportesListadoCardFiltros">
                    <span className="reportesListadoCardLabel">Reportes por selección</span>
                    <span className="reportesListadoCardCount">
                      Elegí grupo, referente y/o puntero para generar listados específicos.
                    </span>
                    <div className="reportesFilters">
                    <label className="reportesFilter">
                      <span>Grupo</span>
                      <select
                        className="personasInput"
                        value={reportesGrupoId ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value)
                          setReportesGrupoId(val)
                          agentLog({
                            runId: 'pre-fix',
                            hypothesisId: 'H26',
                            location: 'src/pages/personas/index.tsx:reportes-select-gru',
                            message: 'Selected grupo for reports',
                            data: { grupoId: val },
                          })
                        }}
                      >
                        <option value="">Seleccione grupo</option>
                        {reportesGruposSorted.map((g) => (
                          <option key={`rep-gru-${g.Id}`} value={g.Id}>
                            {g.Apellido} {g.Nombre} (DNI {g.DNI})
                          </option>
                        ))}
                      </select>
                    </label>
                      <label className="reportesFilter">
                        <span>Referente</span>
                        <select
                          className="personasInput"
                          value={reportesReferenteId ?? ''}
                        disabled={reportesReferenteSelectDisabled}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Number(e.target.value)
                            setReportesReferenteId(val)
                            agentLog({
                              runId: 'pre-fix',
                              hypothesisId: 'H17',
                              location: 'src/pages/personas/index.tsx:reportes-select-ref',
                              message: 'Selected referente for reports',
                              data: { referenteId: val },
                            })
                          }}
                        >
                          <option value="">Seleccione referente</option>
                        {reportesReferentesOptions.map((r) => (
                            <option key={`rep-ref-${r.Id}`} value={r.Id}>
                              {r.Apellido} {r.Nombre} (DNI {r.DNI})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="reportesFilter">
                        <span>Puntero</span>
                        <select
                          className="personasInput"
                          value={reportesPunteroId ?? ''}
                        disabled={reportesPunteroSelectDisabled}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Number(e.target.value)
                            setReportesPunteroId(val)
                            agentLog({
                              runId: 'pre-fix',
                              hypothesisId: 'H18',
                              location: 'src/pages/personas/index.tsx:reportes-select-pun',
                              message: 'Selected puntero for reports',
                              data: { punteroId: val },
                            })
                          }}
                        >
                          <option value="">Seleccione puntero</option>
                          {reportesPunterosOptions.map((p) => (
                            <option key={`rep-pun-${p.Id}`} value={p.Id}>
                              {p.Apellido} {p.Nombre} (DNI {p.DNI})
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="reportesListadoCardActions">
                      <button
                        type="button"
                        className="personasButton personasButtonSecondary personasIconButton reportesActionButton"
                        onClick={viewReportesPorSeleccion}
                        disabled={reportesGrupos.length === 0}
                        title="Ver listado"
                        aria-label="Ver listado"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="personasButton personasIconButton reportesActionButton"
                        onClick={printReportesPorSeleccion}
                        disabled={reportesGrupos.length === 0}
                        title="Imprimir listado"
                        aria-label="Imprimir listado"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M6 9V3h12v6" />
                          <path d="M6 17v4h12v-4" />
                          <path d="M6 13h12a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v1a3 3 0 0 0 3 3z" />
                          <path d="M9 17h6" />
                        </svg>
                      </button>
                    </div>
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
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="personasInput"
                    style={{ flex: 1 }}
                    value={form.DNI}
                    onChange={(e) => setForm((s) => ({ ...s, DNI: sanitizeDNI(e.target.value) }))}
                    onBlur={() => { void handlePadronAutoFillByDni() }}
                    inputMode="numeric"
                    maxLength={8}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="personasButton personasButtonSecondary personasIconButton"
                    onClick={() => { void handlePadronAutoFillByDni() }}
                    disabled={dniAutoFillLoading || (form.DNI ?? '').trim().length !== 8}
                    title="Buscar en padrón por DNI"
                    aria-label="Buscar en padrón por DNI"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.3-4.3" />
                    </svg>
                  </button>
                </div>
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
                    {!leaderSelectVisible ? (
                      <>
                        <input
                          type="text"
                          className="personasInput personasLeaderInput"
                          placeholder={selectedLeaderDisplay || `Escribí nombre, apellido o DNI para buscar...`}
                          value={leaderIsTyping ? leaderFilterText : ''}
                          onChange={(e) => {
                            const value = e.target.value
                            setLeaderIsTyping(true)
                            setLeaderFilterText(value)
                            if (value.trim() === '') {
                              setLeaderDropdownOpen(false)
                              setForm((s) => ({ ...s, LiderId: null }))
                            } else {
                              // si el usuario escribe, dejamos el ID seleccionado en null hasta que elija una opción
                              setForm((s) => ({ ...s, LiderId: null }))
                              setLeaderDropdownOpen(true)
                            }
                          }}
                          onFocus={() => {
                            setLeaderIsTyping(true)
                            setLeaderDropdownOpen(leaderFilterText.trim().length > 0)
                          }}
                          onKeyDown={(e) => {
                            if (
                              (e.key === 'Backspace' || e.key === 'Delete') &&
                              !leaderDropdownOpen &&
                              (leaderFilterText ?? '').trim().length === 0 &&
                              form.LiderId != null
                            ) {
                              e.preventDefault()
                              setForm((s) => ({ ...s, LiderId: null }))
                              setLeaderIsTyping(true)
                              setLeaderFilterText('')
                              agentLog({
                                runId: 'post-fix',
                                hypothesisId: 'H13',
                                location: 'src/pages/personas/index.tsx:leader-clear-backspace',
                                message: 'Cleared selected leader via backspace/delete',
                                data: { prevLiderId: form.LiderId },
                              })
                              return
                            }
                            if (
                              (e.key === 'Tab' || e.key === 'Enter') &&
                              leaderDropdownOpen &&
                              filteredLeadersForAutocomplete.length > 0
                            ) {
                              e.preventDefault()
                              const first = filteredLeadersForAutocomplete[0]
                              setForm((s) => ({ ...s, LiderId: first.Id }))
                              setLeaderFilterText('')
                              setLeaderIsTyping(false)
                              setLeaderDropdownOpen(false)
                              setLeaderSelectVisible(false)
                              agentLog({
                                runId: 'post-fix',
                                hypothesisId: 'H8',
                                location: 'src/pages/personas/index.tsx:leader-autocomplete-enter',
                                message: 'Selected leader from autocomplete (enter/tab)',
                                data: { liderId: first.Id },
                              })
                              if (e.key === 'Tab') {
                                setTimeout(() => leaderSelectRef.current?.focus(), 0)
                              }
                            }
                          }}
                          onBlur={() => {
                            if (leaderBlurTimerRef.current) clearTimeout(leaderBlurTimerRef.current)
                            leaderBlurTimerRef.current = setTimeout(() => {
                              setLeaderDropdownOpen(false)
                              setLeaderIsTyping(false)
                              setLeaderFilterText('')
                            }, 180)
                          }}
                          disabled={leadersLoading}
                          autoComplete="off"
                          aria-autocomplete="list"
                          aria-expanded={leaderDropdownOpen}
                        />
                        <button
                          type="button"
                          className="personasLeaderHelpBtn personasLeaderHelpBtnPrimary"
                          title="Si no recordás el Nombre o Apellido, buscalo en la lista desplegable"
                          aria-label="Mostrar lista desplegable"
                          onClick={() => {
                            setLeaderSelectVisible(true)
                            setLeaderDropdownOpen(false)
                            setLeaderIsTyping(false)
                            setLeaderFilterText('')
                            agentLog({
                              runId: 'post-fix',
                              hypothesisId: 'H11',
                              location: 'src/pages/personas/index.tsx:leader-help-toggle',
                              message: 'Show leader select (hide input)',
                              data: { nextVisible: true },
                            })
                            setTimeout(() => leaderSelectRef.current?.focus(), 0)
                          }}
                        >
                          <span className="personasLeaderHelpIcon" aria-hidden="true">▾</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <select
                          ref={leaderSelectRef}
                          className="personasInput personasLeaderSelect personasLeaderSelectInline personasLeaderSelectOnly"
                          value={form.LiderId ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Number(e.target.value)
                            setForm((s) => ({ ...s, LiderId: val }))
                            setLeaderIsTyping(false)
                            setLeaderFilterText('')
                            setLeaderDropdownOpen(false)
                            agentLog({
                              runId: 'post-fix',
                              hypothesisId: 'H10',
                              location: 'src/pages/personas/index.tsx:leader-select-change',
                              message: 'Selected leader from select',
                              data: { liderId: val },
                            })
                          }}
                          disabled={leadersLoading}
                          title={`Lista desplegable de ${leaderLabel}`}
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
                        <button
                          type="button"
                          className="personasLeaderHelpBtn"
                          title="Volver a modo búsqueda (tipeando)"
                          aria-label="Volver a modo búsqueda"
                          onClick={() => {
                            setLeaderSelectVisible(false)
                            setLeaderDropdownOpen(false)
                            setLeaderIsTyping(false)
                            setLeaderFilterText('')
                            agentLog({
                              runId: 'post-fix',
                              hypothesisId: 'H12',
                              location: 'src/pages/personas/index.tsx:leader-help-toggle-back',
                              message: 'Hide leader select (show input)',
                              data: { nextVisible: false },
                            })
                          }}
                        >
                          Volver a búsqueda
                        </button>
                      </>
                    )}
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
                                setLeaderFilterText('')
                                setLeaderIsTyping(false)
                                setLeaderDropdownOpen(false)
                                setLeaderSelectVisible(false)
                                agentLog({
                                  runId: 'post-fix',
                                  hypothesisId: 'H9',
                                  location: 'src/pages/personas/index.tsx:leader-autocomplete-click',
                                  message: 'Selected leader from autocomplete (click)',
                                  data: { liderId: p.Id },
                                })
                              }}
                            >
                              {getLeaderDisplay(p, leaderDisplayOpts)}
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>
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
                  <th>Apellido y Nombre</th>
                  <th>DNI</th>
                  <th>Teléfono</th>
                  <th>Escuela</th>
                  <th>Mesa</th>
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
                    <td>{`${row.Apellido}, ${row.Nombre}`}</td>
                    <td>{row.DNI}</td>
                    <td>{row.Telefono ?? '—'}</td>
                    <td>{row.EscuelaNombre ?? '—'}</td>
                    <td>{row.NroMesa ?? '—'}</td>
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
