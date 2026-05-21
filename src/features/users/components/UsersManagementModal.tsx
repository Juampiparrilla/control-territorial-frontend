import React from 'react'
import { getPersonasByRoleCached } from '../../personas/services/personasApi'
import type { PersonaResponseDTO } from '../../personas/types'
import { sanitizePassword } from '../../personas/utils/sanitizers'
import { sanitizeUsername } from '../../../shared/utils/username'
import {
  createUser,
  deleteUser,
  getUsers,
  resetUserPassword,
  toggleUserActive,
  updateUser,
} from '../services/usersApi'
import {
  SYSTEM_ROLE_OPTIONS,
  personaDisplayName,
  systemRoleLabel,
  type CreateUserDTO,
  type SystemRole,
  type UpdateUserDTO,
  type UserResponseDTO,
} from '../types'

type UsersManagementModalProps = {
  open: boolean
  onClose: () => void
}

type FormMode = 'create' | 'edit' | 'reset-password' | null

export default function UsersManagementModal({ open, onClose }: UsersManagementModalProps): React.JSX.Element | null {
  const [list, setList] = React.useState<UserResponseDTO[]>([])
  const [listLoading, setListLoading] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [formMode, setFormMode] = React.useState<FormMode>(null)
  const [editing, setEditing] = React.useState<UserResponseDTO | null>(null)

  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [role, setRole] = React.useState<SystemRole>(2)
  const [isActive, setIsActive] = React.useState(true)
  const [personaId, setPersonaId] = React.useState<number | null>(null)
  const [personas, setPersonas] = React.useState<PersonaResponseDTO[]>([])
  const [personasLoading, setPersonasLoading] = React.useState(false)

  const fetchUsers = React.useCallback(async () => {
    setListLoading(true)
    setError(null)
    try {
      const users = await getUsers()
      setList(users)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar usuarios.')
      if (err instanceof Error && err.message.includes('403')) {
        setError('No tenés permisos para gestionar usuarios (se requiere Admin Sistema).')
      }
      setList([])
    } finally {
      setListLoading(false)
    }
  }, [])

  const loadPersonas = React.useCallback(async () => {
    setPersonasLoading(true)
    try {
      const [g, r, p, v] = await Promise.all([
        getPersonasByRoleCached(1),
        getPersonasByRoleCached(2),
        getPersonasByRoleCached(3),
        getPersonasByRoleCached(4),
      ])
      const merged = [...g, ...r, ...p, ...v].sort((a, b) =>
        `${a.Apellido} ${a.Nombre}`.localeCompare(`${b.Apellido} ${b.Nombre}`, 'es'),
      )
      setPersonas(merged)
    } catch {
      setPersonas([])
    } finally {
      setPersonasLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!open) return
    void fetchUsers()
    void loadPersonas()
  }, [open, fetchUsers, loadPersonas])

  function resetForm() {
    setFormMode(null)
    setEditing(null)
    setUsername('')
    setPassword('')
    setConfirmPassword('')
    setRole(2)
    setIsActive(true)
    setPersonaId(null)
    setError(null)
    setSuccess(null)
  }

  function openCreate() {
    resetForm()
    setFormMode('create')
  }

  function openEdit(user: UserResponseDTO) {
    resetForm()
    setEditing(user)
    setFormMode('edit')
    setUsername(user.Username)
    setRole(user.SystemRole)
    setIsActive(user.IsActive)
    setPersonaId(user.PersonaId ?? null)
  }

  function openResetPassword(user: UserResponseDTO) {
    resetForm()
    setEditing(user)
    setFormMode('reset-password')
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim()) {
      setError('El usuario es obligatorio.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    const payload: CreateUserDTO = {
      Username: username.trim(),
      Password: password,
      SystemRole: role,
      PersonaId: personaId,
      IsActive: isActive,
    }

    setSubmitting(true)
    setError(null)
    try {
      await createUser(payload)
      setSuccess('Usuario creado.')
      resetForm()
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    if (!username.trim()) {
      setError('El usuario es obligatorio.')
      return
    }

    const payload: UpdateUserDTO = {
      Username: username.trim(),
      SystemRole: role,
      PersonaId: personaId,
      IsActive: isActive,
    }

    setSubmitting(true)
    setError(null)
    try {
      await updateUser(editing.Id, payload)
      setSuccess('Usuario actualizado.')
      resetForm()
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar usuario.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetPasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await resetUserPassword(editing.Id, password)
      setSuccess('Contraseña restablecida.')
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restablecer contraseña.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(user: UserResponseDTO) {
    if (!window.confirm(`¿Eliminar al usuario "${user.Username}"?`)) return
    setError(null)
    try {
      await deleteUser(user.Id)
      setSuccess('Usuario eliminado.')
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar.')
    }
  }

  async function handleToggleActive(user: UserResponseDTO) {
    setError(null)
    try {
      await toggleUserActive(user.Id)
      setSuccess(user.IsActive ? 'Usuario desactivado.' : 'Usuario activado.')
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar estado.')
    }
  }

  if (!open) return null

  const q = search.trim().toLowerCase()
  const filtered = q
    ? list.filter(
        (u) =>
          u.Username.toLowerCase().includes(q) ||
          personaDisplayName(u).toLowerCase().includes(q) ||
          systemRoleLabel(u.SystemRole).toLowerCase().includes(q),
      )
    : list

  return (
    <div
      className="personasAdminOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="usersModalTitle"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="personasAdminModal">
        <div className="personasAdminModalHeader">
          <div>
            <h3 id="usersModalTitle" className="personasAdminModalTitle">
              Gestión de Usuarios
            </h3>
            <p className="personasAdminModalSubtitle">Accesos al sistema (JWT). No modifica personas territoriales.</p>
          </div>
          <button type="button" className="personasPadronClose" onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="personasAdminModalBody">
          <div className="personasAdminTopBar">
            <div className="personasSearchWrap personasAdminSearchWrap">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por usuario, persona o rol"
                disabled={submitting || formMode !== null}
              />
            </div>
            <button
              type="button"
              className="personasButton personasButtonPrimary personasAdminNewBtn"
              onClick={openCreate}
              disabled={submitting || formMode !== null}
            >
              + Nuevo usuario
            </button>
          </div>

          {formMode === 'create' ? (
            <form className="personasCard" style={{ marginTop: 12 }} onSubmit={(e) => void handleCreateSubmit(e)}>
              <h4 className="personasFormTitle">Crear usuario</h4>
              {renderUserFormFields()}
              <label className="personasField">
                <span className="personasFieldLabel">Contraseña *</span>
                <input
                  className="personasInput"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(sanitizePassword(e.target.value))}
                />
              </label>
              <label className="personasField">
                <span className="personasFieldLabel">Confirmar contraseña *</span>
                <input
                  className="personasInput"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(sanitizePassword(e.target.value))}
                />
              </label>
              {renderFormActions('Crear usuario')}
            </form>
          ) : null}

          {formMode === 'edit' && editing ? (
            <form className="personasCard" style={{ marginTop: 12 }} onSubmit={(e) => void handleEditSubmit(e)}>
              <h4 className="personasFormTitle">Editar usuario: {editing.Username}</h4>
              {renderUserFormFields()}
              {renderFormActions('Guardar cambios')}
            </form>
          ) : null}

          {formMode === 'reset-password' && editing ? (
            <form className="personasCard" style={{ marginTop: 12 }} onSubmit={(e) => void handleResetPasswordSubmit(e)}>
              <h4 className="personasFormTitle">Restablecer contraseña: {editing.Username}</h4>
              <label className="personasField">
                <span className="personasFieldLabel">Nueva contraseña *</span>
                <input
                  className="personasInput"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(sanitizePassword(e.target.value))}
                />
              </label>
              <label className="personasField">
                <span className="personasFieldLabel">Confirmar contraseña *</span>
                <input
                  className="personasInput"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(sanitizePassword(e.target.value))}
                />
              </label>
              {renderFormActions('Restablecer')}
            </form>
          ) : null}

          <div className="personasStatus" role="status" style={{ marginTop: 8 }}>
            {error ? <span className="personasError">{error}</span> : null}
            {success ? <span className="personasSuccess">{success}</span> : null}
          </div>

          <div className="personasTableCard" style={{ marginTop: 12 }}>
            <div className="personasTableWrap">
              {listLoading ? (
                <p className="personasLoading">Cargando usuarios...</p>
              ) : filtered.length === 0 ? (
                <p className="personasEmpty">No hay usuarios.</p>
              ) : (
                <table className="personasTable">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Persona vinculada</th>
                      <th>Rol sistema</th>
                      <th>Estado</th>
                      <th>Creado</th>
                      <th className="personasTableActions">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((user) => (
                      <tr key={user.Id}>
                        <td>{user.Username}</td>
                        <td>{personaDisplayName(user)}</td>
                        <td>
                          <span className={`usersRoleBadge usersRoleBadge--${user.SystemRole}`}>
                            {systemRoleLabel(user.SystemRole)}
                          </span>
                        </td>
                        <td>
                          <span className={user.IsActive ? 'usersBadgeActive' : 'usersBadgeInactive'}>
                            {user.IsActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>{user.CreatedAt ? new Date(user.CreatedAt).toLocaleDateString('es-AR') : '-'}</td>
                        <td className="personasTableActions">
                          <button type="button" className="personasTableLink" onClick={() => openEdit(user)} title="Editar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Editar
                          </button>
                          <button type="button" className="personasTableLink" onClick={() => openResetPassword(user)} title="Resetear contraseña">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                            </svg>
                            Resetear contraseña
                          </button>
                          <button type="button" className="personasTableLink" onClick={() => void handleToggleActive(user)} title={user.IsActive ? 'Desactivar usuario' : 'Activar usuario'}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              {user.IsActive ? (
                                <>
                                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                  <circle cx="9" cy="7" r="4" />
                                  <line x1="17" y1="11" x2="23" y2="11" />
                                </>
                              ) : (
                                <>
                                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                  <circle cx="8.5" cy="7" r="4" />
                                  <line x1="18" y1="8" x2="23" y2="13" />
                                  <line x1="23" y1="8" x2="18" y2="13" />
                                </>
                              )}
                            </svg>
                            {user.IsActive ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            type="button"
                            className="personasTableLink personasTableLinkDelete"
                            onClick={() => void handleDelete(user)}
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
          </div>
        </div>
      </div>
    </div>
  )

  function renderUserFormFields(): React.JSX.Element {
    return (
      <>
        <label className="personasField">
          <span className="personasFieldLabel">Usuario *</span>
          <input
            className="personasInput"
            value={username}
            onChange={(e) => setUsername(sanitizeUsername(e.target.value))}
            autoComplete="off"
          />
        </label>
        <label className="personasField">
          <span className="personasFieldLabel">Rol del sistema *</span>
          <select className="personasInput" value={role} onChange={(e) => setRole(Number(e.target.value) as SystemRole)}>
            {SYSTEM_ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="personasField">
          <span className="personasFieldLabel">Persona vinculada (opcional)</span>
          <select
            className="personasInput"
            value={personaId ?? ''}
            onChange={(e) => setPersonaId(e.target.value ? Number(e.target.value) : null)}
            disabled={personasLoading}
          >
            <option value="">Sin vincular</option>
            {personas.map((p) => (
              <option key={p.Id} value={p.Id}>
                {p.Apellido}, {p.Nombre} — DNI {p.DNI}
              </option>
            ))}
          </select>
        </label>

      </>
    )
  }

  function renderFormActions(submitLabel: string): React.JSX.Element {
    return (
      <div className="personasActions">
        <button className="personasButton" type="submit" disabled={submitting}>
          {submitting ? 'Guardando...' : submitLabel}
        </button>
        <button type="button" className="personasButton personasButtonSecondary" disabled={submitting} onClick={resetForm}>
          Cancelar
        </button>
      </div>
    )
  }
}
