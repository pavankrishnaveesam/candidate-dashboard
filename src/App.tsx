import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, Bell, BriefcaseBusiness, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Grid2X2, LayoutDashboard, List, MapPin, MoreHorizontal, Pencil, Plus, Search, Settings, SlidersHorizontal, Sparkles, Users, X } from 'lucide-react'
import { createCandidate, deleteCandidate, getCandidate, getCandidates, updateCandidate, type CandidateFilters } from './api'
import type { Candidate, CandidatePayload, CandidateStatus } from './types'
import { statuses } from './types'

const emptyFilters: CandidateFilters = { q: '', skills: [], statuses: [], minExperience: '', maxExperience: '' }
const skillChoices = ['UI/UX', 'Figma', 'Product Strategy', 'React', 'Java', 'Spring Boot', 'User Research', 'TypeScript']
const statusLabels: Record<CandidateStatus, string> = { APPLIED: 'Applied', SCREENING: 'Screening', INTERVIEW: 'Interviewing', OFFERED: 'Offered', HIRED: 'Hired', REJECTED: 'Rejected' }
const fallbackPortraits = ['photo-1534528741775-53994a69daeb', 'photo-1500648767791-00dcc994a43e', 'photo-1531123897727-8f129e1688ce', 'photo-1506794778202-cad84cf45f1d', 'photo-1544005313-94ddf0286df2', 'photo-1507003211169-0a1dd7228f2d', 'photo-1534751516642-a1af1ef26a56', 'photo-1501196354995-cbb51c65aaea']

function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() }
function avatarUrl(candidate: Candidate) { return `https://images.unsplash.com/${fallbackPortraits[candidate.id % fallbackPortraits.length]}?auto=format&fit=crop&w=160&h=160&q=80` }
function CandidateAvatar({ candidate, large = false }: { candidate: Candidate; large?: boolean }) {
  const [broken, setBroken] = useState(false)
  return broken ? <div className={`avatar avatar-fallback${large ? ' avatar-large' : ''}`}>{initials(candidate.fullName)}</div> : <img className={`avatar${large ? ' avatar-large' : ''}`} src={avatarUrl(candidate)} alt="" onError={() => setBroken(true)} />
}

function App() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<CandidateFilters>(emptyFilters)
  const [draft, setDraft] = useState<CandidateFilters>(emptyFilters)
  const [filterOpen, setFilterOpen] = useState(false)
  const [listView, setListView] = useState(false)
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [formCandidate, setFormCandidate] = useState<Candidate | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const result = await getCandidates({ ...filters, q: query }, page, 12)
      setCandidates(result.content)
      setTotalPages(result.totalPages)
      setTotalElements(result.totalElements)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load candidates.')
    } finally { setBusy(false) }
  }, [filters, page, query])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3400)
    return () => window.clearTimeout(timer)
  }, [notice])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setFilterOpen(false); setSelected(null); setFormCandidate(undefined); setDeleteTarget(null) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const activeCount = filters.statuses.length + filters.skills.length + Number(Boolean(filters.minExperience)) + Number(Boolean(filters.maxExperience))
  const filteredStatus = filters.statuses
  const selectedSkills = filters.skills
  const clearFilters = () => { setFilters(emptyFilters); setDraft(emptyFilters); setPage(0) }
  const applyFilters = () => { setFilters(draft); setPage(0); setFilterOpen(false) }
  const removeStatus = (status: CandidateStatus) => { setFilters((current) => ({ ...current, statuses: current.statuses.filter((value) => value !== status) })); setDraft((current) => ({ ...current, statuses: current.statuses.filter((value) => value !== status) })); setPage(0) }
  const removeSkill = (skill: string) => { setFilters((current) => ({ ...current, skills: current.skills.filter((value) => value !== skill) })); setDraft((current) => ({ ...current, skills: current.skills.filter((value) => value !== skill) })); setPage(0) }
  const toggleValue = <T extends string,>(items: T[], value: T): T[] => items.includes(value) ? items.filter((item) => item !== value) : [...items, value]

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const payload: CandidatePayload = {
      fullName: String(data.get('fullName')).trim(), currentRole: String(data.get('currentRole')).trim(), email: String(data.get('email')).trim(),
      phone: String(data.get('phone')).trim() || null, skills: String(data.get('skills')).trim(), experienceYears: Number(data.get('experienceYears')),
      location: String(data.get('location')).trim(), status: (String(data.get('status')) || null) as CandidateStatus | null,
    }
    setBusy(true); setFormError('')
    try {
      if (formCandidate) await updateCandidate(formCandidate.id, payload)
      else await createCandidate(payload)
      setFormCandidate(undefined); setNotice(formCandidate ? 'Candidate details updated' : 'Candidate added to your workspace')
      await load()
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Could not save candidate.') }
    finally { setBusy(false) }
  }

  const onDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await deleteCandidate(deleteTarget.id)
      setDeleteTarget(null); setSelected(null); setNotice(`${deleteTarget.fullName} was removed`); await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete candidate.') }
    finally { setBusy(false) }
  }

  const filteredChips = useMemo(() => [
    ...filteredStatus.map((status) => ({ key: status, label: `Status: ${statusLabels[status]}`, tone: 'mint' as const, remove: () => removeStatus(status) })),
    ...selectedSkills.map((skill) => ({ key: skill, label: `Skill: ${skill}`, tone: 'sky' as const, remove: () => removeSkill(skill) })),
    ...(filters.minExperience ? [{ key: 'min', label: `Experience: ${filters.minExperience}+ yrs`, tone: 'butter' as const, remove: () => { setFilters((current) => ({ ...current, minExperience: '' })); setDraft((current) => ({ ...current, minExperience: '' })) } }] : []),
    ...(filters.maxExperience ? [{ key: 'max', label: `Up to ${filters.maxExperience} yrs`, tone: 'lavender' as const, remove: () => { setFilters((current) => ({ ...current, maxExperience: '' })); setDraft((current) => ({ ...current, maxExperience: '' })) } }] : []),
  ], [filteredStatus, selectedSkills, filters.minExperience, filters.maxExperience])

  const submitDelete = (candidate: Candidate) => { setDeleteTarget(candidate); setSelected(null) }
  const openEdit = (candidate: Candidate) => { setFormCandidate(candidate); setSelected(null); setFormError('') }

  return <div className="app-shell">
    <aside className="sidebar">
      <div>
        <a className="brand" href="#home"><span className="brand-mark"><i /><i /><i /><i /></span><span>CandiBoard</span><ChevronDown size={16} className="brand-chevron" /></a>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-item active" href="#candidates"><LayoutDashboard size={18} /><span>Candidates</span></a>
          <a className="nav-item" href="#events" onClick={(event) => event.preventDefault()}><CalendarDays size={18} /><span>Events</span><span className="nav-soon">Soon</span></a>
          <a className="nav-item" href="#teams" onClick={(event) => event.preventDefault()}><Users size={18} /><span>Dashboards</span></a>
          <a className="nav-item" href="#activity" onClick={(event) => event.preventDefault()}><Activity size={18} /><span>Activity</span></a>
        </nav>
      </div>
      <div className="sidebar-bottom">
        <div className="sidebar-tip"><div className="tip-icon"><Sparkles size={15} /></div><strong>A little more organized.</strong><span>Your next great hire starts here.</span></div>
        <a className="nav-item" href="#settings" onClick={(event) => event.preventDefault()}><Settings size={18} /><span>Settings</span></a>
        <div className="profile-row"><div className="profile-avatar">P</div><div className="profile-info"><strong>Pavan</strong><span>Workspace admin</span></div><MoreHorizontal size={18} /></div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <label className="search-box"><Search size={17} /><input aria-label="Search candidates" placeholder="Search candidates..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} /><kbd>⌘ K</kbd></label>
        <div className="top-actions"><button className="icon-button" aria-label="Help"><CircleHelp size={18} /></button><button className="icon-button" aria-label="Notifications"><Bell size={18} /><span className="notification-dot" /></button><span className="top-divider" /><div className="mini-profile">P</div></div>
      </header>

      <section className="dashboard-content" id="candidates">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> PEOPLE & TALENT</div><h1>Your candidates<span className="heading-period">.</span></h1><p>A thoughtful place for every promising conversation.</p></div><div className="heading-note"><span className="note-sparkle"><Sparkles size={17} /></span><span>Good people.<br /><strong>Great possibilities.</strong></span></div></div>

        <div className="stats-row">
          <div className="stat-card"><div className="stat-top"><span>Total candidates</span><span className="stat-icon icon-lilac"><Users size={17} /></span></div><strong>{totalElements}</strong><small>in your workspace</small></div>
          <div className="stat-card"><div className="stat-top"><span>In conversation</span><span className="stat-icon icon-mint"><Activity size={17} /></span></div><strong>{candidates.filter((candidate) => ['SCREENING', 'INTERVIEW', 'OFFERED'].includes(candidate.status)).length}</strong><small>moving things forward</small></div>
          <div className="stat-card"><div className="stat-top"><span>Recently added</span><span className="stat-icon icon-sky"><Sparkles size={17} /></span></div><strong>{candidates.filter((candidate) => Date.now() - new Date(candidate.createdAt).getTime() < 7 * 86400000).length}</strong><small>in the past 7 days</small></div>
          <div className="stat-card stat-card-note"><div className="note-decoration">✳</div><span>Little steps add up</span><p>Every connection is a chance<br />to find someone wonderful.</p></div>
        </div>

        <div className="section-toolbar"><div className="section-title"><div><h2>Candidate directory</h2><p>{totalElements} {totalElements === 1 ? 'person' : 'people'} worth knowing</p></div></div><div className="toolbar-actions"><div className="view-toggle" aria-label="Layout"><button className={!listView ? 'selected' : ''} onClick={() => setListView(false)} aria-label="Grid view"><Grid2X2 size={16} /></button><button className={listView ? 'selected' : ''} onClick={() => setListView(true)} aria-label="List view"><List size={17} /></button></div><div className="filter-wrap"><button className={`filter-button${filterOpen ? ' open' : ''}`} onClick={() => { setDraft(filters); setFilterOpen((open) => !open) }}><SlidersHorizontal size={16} /> Filters{activeCount > 0 && <span className="filter-count">{activeCount}</span>}</button>{filterOpen && <><button className="popover-dismiss" aria-label="Close filter panel" onClick={() => setFilterOpen(false)} /><div className="filter-popover"><div className="popover-header"><div><span className="popover-kicker">REFINE YOUR SEARCH</span><h3>Find your people</h3></div><button className="close-button" onClick={() => setFilterOpen(false)} aria-label="Close"><X size={18} /></button></div><div className="filter-section"><div className="filter-label">Hiring stage</div><div className="filter-pills">{statuses.map((status) => <button key={status} className={`filter-pill status-option ${draft.statuses.includes(status) ? `is-selected status-${status.toLowerCase()}` : ''}`} onClick={() => setDraft((current) => ({ ...current, statuses: toggleValue(current.statuses, status) }))}>{statusLabels[status]}</button>)}</div></div><div className="filter-section"><div className="filter-label">Skills & strengths</div><div className="skill-options">{skillChoices.map((skill) => <label key={skill} className="check-option"><input type="checkbox" checked={draft.skills.includes(skill)} onChange={() => setDraft((current) => ({ ...current, skills: toggleValue(current.skills, skill) }))} /><span className="custom-check"><Check size={12} /></span>{skill}</label>)}</div></div><div className="filter-section"><div className="filter-label">Years of experience</div><div className="experience-inputs"><label><span>At least</span><div><input type="number" min="0" max="80" value={draft.minExperience} onChange={(event) => setDraft((current) => ({ ...current, minExperience: event.target.value }))} placeholder="0" /><span>yrs</span></div></label><span className="range-dash">—</span><label><span>Up to</span><div><input type="number" min="0" max="80" value={draft.maxExperience} onChange={(event) => setDraft((current) => ({ ...current, maxExperience: event.target.value }))} placeholder="Any" /><span>yrs</span></div></label></div></div><div className="popover-footer"><button className="button-quiet" onClick={() => setDraft(emptyFilters)}>Reset</button><button className="button-primary apply-button" onClick={applyFilters}>Show candidates <ChevronRight size={15} /></button></div></div></>}</div><button className="sort-button" onClick={() => setListView((value) => !value)}><span>Newest first</span><ChevronDown size={15} /></button></div></div>

        {filteredChips.length > 0 && <div className="chips-row">{filteredChips.map((chip) => <span className={`chip chip--${chip.tone}`} key={chip.key}>{chip.label}<button aria-label={`Remove ${chip.label}`} onClick={chip.remove}><X size={13} /></button></span>)}<button className="clear-link" onClick={clearFilters}>Clear all</button></div>}

        {error && <div className="error-banner"><span>{error}</span><button onClick={() => void load()}>Try again</button></div>}
        {busy && candidates.length === 0 && !error && <div className={`candidate-grid${listView ? ' candidate-list' : ''}`}>{Array.from({ length: 6 }, (_, index) => <div className="skeleton-card" key={index}><div className="skeleton-card-header"><div className="skeleton-block skeleton-avatar" /><div className="skeleton-lines"><div className="skeleton-block skeleton-title" /><div className="skeleton-block skeleton-subtitle" /></div></div><div className="skeleton-block skeleton-pill" /><div className="skeleton-card-footer"><div className="skeleton-block skeleton-btn" /><div className="skeleton-block skeleton-btn" /></div></div>)}</div>}
        {!busy && candidates.length > 0 && <div className={`candidate-grid${listView ? ' candidate-list' : ''}`}>{candidates.map((candidate, index) => <CandidateCard key={candidate.id} candidate={candidate} index={index} listView={listView} onOpen={() => setSelected(candidate)} onDelete={() => submitDelete(candidate)} />)}</div>}
        {!busy && !error && candidates.length === 0 && <div className="empty-state-card"><div className="empty-state-emblem"><div className="empty-state-emblem-front"><Users size={27} /></div></div><h3 className="empty-state-title">No candidates found just yet</h3><p className="empty-state-desc">Try a different search or clear your filters. Your next great conversation might be one click away.</p><div className="empty-state-actions"><button className="button-quiet" onClick={clearFilters}>Clear filters</button><button className="button-primary" onClick={() => setFormCandidate(null)}><Plus size={16} /> Add a candidate</button></div></div>}

        <div className="pagination"><span>Showing <strong>{totalElements ? page * 12 + 1 : 0}–{Math.min((page + 1) * 12, totalElements)}</strong> of <strong>{totalElements}</strong> candidates</span><div className="page-controls"><button disabled={page === 0 || busy} onClick={() => setPage((current) => Math.max(0, current - 1))} aria-label="Previous page"><ChevronLeft size={17} /></button><span>Page <strong>{totalPages ? page + 1 : 0}</strong> of {totalPages}</span><button disabled={page >= totalPages - 1 || busy} onClick={() => setPage((current) => current + 1)} aria-label="Next page"><ChevronRight size={17} /></button></div></div>
      </section>
    </main>

    <button className="fab-add-candidate" onClick={() => { setFormCandidate(null); setFormError('') }}><Plus size={19} strokeWidth={2.4} /><span>Add candidate</span></button>
    {notice && <div className="toast-viewport"><div className="pastel-toast pastel-toast--created"><span className="toast-icon-badge"><Check size={14} /></span><div className="toast-body"><span className="toast-title">All taken care of</span><span className="toast-desc">{notice}</span></div><button className="toast-close" onClick={() => setNotice('')} aria-label="Dismiss">×</button></div></div>}

    {selected && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}><section className="hero-modal" role="dialog" aria-modal="true" aria-label={`${selected.fullName} candidate details`}><button className="modal-edit" aria-label="Edit candidate" onClick={() => openEdit(selected)}><Pencil size={17} /></button><div className="hero-avatar-wrap"><CandidateAvatar candidate={selected} large /></div><h2>{selected.fullName}</h2><p className="hero-role">{selected.currentRole}</p><span className={`status-pill status-pill--${selected.status.toLowerCase()}`}>{statusLabels[selected.status]}</span><div className="hero-stats"><div><span>Experience</span><strong>{selected.experienceYears} years</strong></div><div><span>Location</span><strong>{selected.location || 'Not specified'}</strong></div></div><div className="hero-skills"><span className="detail-label">Skills</span><div className="skills-highlight">{selected.skills || 'No skills listed yet'}</div></div><button className="button-primary detail-button" onClick={async () => { try { setSelected(await getCandidate(selected.id)) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load candidate details.') } }}><BriefcaseBusiness size={16} /> View complete details</button><div className="hero-contact"><span>{selected.email}</span>{selected.phone && <span>{selected.phone}</span>}</div><div className="modal-footer"><button className="button-quiet" onClick={() => setSelected(null)}>Close</button><button className="button-danger" onClick={() => submitDelete(selected)}>Delete candidate</button></div></section></div>}

    {formCandidate !== undefined && <div className="modal-backdrop modal-backdrop-top" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormCandidate(undefined) }}><section className="form-modal" role="dialog" aria-modal="true" aria-label={formCandidate ? 'Edit candidate' : 'Add candidate'}><div className="form-modal-head"><div><span className="popover-kicker">A NEW CONNECTION</span><h2>{formCandidate ? 'Edit candidate' : 'Add a candidate'}</h2><p>Good conversations start with the details.</p></div><button className="close-button" onClick={() => setFormCandidate(undefined)} aria-label="Close"><X size={19} /></button></div><form onSubmit={onSave}><div className="form-grid"><label className="form-field"><span className="form-label">Full name <b>*</b></span><input className="pastel-input" name="fullName" required maxLength={255} defaultValue={formCandidate?.fullName} placeholder="e.g. Sophia Chen" /></label><label className="form-field"><span className="form-label">Current role <b>*</b></span><input className="pastel-input" name="currentRole" required maxLength={255} defaultValue={formCandidate?.currentRole} placeholder="e.g. Product Designer" /></label><label className="form-field"><span className="form-label">Email address <b>*</b></span><input className="pastel-input" name="email" type="email" required maxLength={255} defaultValue={formCandidate?.email} placeholder="name@example.com" /></label><label className="form-field"><span className="form-label">Phone <small>OPTIONAL</small></span><input className="pastel-input" name="phone" defaultValue={formCandidate?.phone ?? ''} placeholder="+1 415 555 0101" /></label><label className="form-field"><span className="form-label">Experience <b>*</b></span><div className="input-suffix"><input className="pastel-input" name="experienceYears" type="number" min="0" max="80" required defaultValue={formCandidate?.experienceYears ?? 0} /><span>years</span></div></label><label className="form-field"><span className="form-label">Location <small>OPTIONAL</small></span><input className="pastel-input" name="location" maxLength={255} defaultValue={formCandidate?.location ?? ''} placeholder="City or remote" /></label><label className="form-field form-field--full"><span className="form-label">Skills & strengths <small>OPTIONAL · SEPARATE WITH COMMAS</small></span><textarea className="pastel-textarea" name="skills" rows={2} maxLength={1000} defaultValue={formCandidate?.skills ?? ''} placeholder="Figma, user research, product strategy" /></label><label className="form-field"><span className="form-label">Hiring stage</span><select className="pastel-select" name="status" defaultValue={formCandidate?.status ?? 'APPLIED'}>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label></div>{formError && <div className="form-error-msg"><X size={14} /> {formError}</div>}<div className="form-actions"><button type="button" className="button-quiet" onClick={() => setFormCandidate(undefined)}>Cancel</button><button className="button-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : formCandidate ? 'Save changes' : <><Plus size={16} /> Add candidate</>}</button></div></form></section></div>}

    {deleteTarget && <div className="modal-backdrop modal-backdrop-top" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null) }}><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><div className="confirm-warning-badge"><X size={23} /></div><h2 className="confirm-title" id="delete-title">Remove this candidate?</h2><p className="confirm-desc">You’re about to remove <strong>{deleteTarget.fullName}</strong> from your directory. This can’t be undone.</p><div className="confirm-actions"><button className="btn-dialog-cancel" onClick={() => setDeleteTarget(null)}>Keep candidate</button><button className="btn-dialog-delete" onClick={() => void onDelete()} disabled={busy}>{busy ? 'Removing…' : 'Yes, remove'}</button></div></section></div>}
  </div>
}

function CandidateCard({ candidate, index, listView, onOpen, onDelete }: { candidate: Candidate; index: number; listView: boolean; onOpen: () => void; onDelete: () => void }) {
  const skills = (candidate.skills ?? '').split(',').map((skill) => skill.trim()).filter(Boolean)
  return <article className={`candidate-card${listView ? ' candidate-card-list' : ''}`} style={{ animationDelay: `${index * 45}ms` }} onClick={onOpen} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpen() }}><div className="candidate-card-main"><CandidateAvatar candidate={candidate} /><div className="candidate-identity"><h3>{candidate.fullName}</h3><span>{candidate.currentRole}</span><small><MapPin size={12} />{candidate.location || 'Location not added'}</small></div></div><div className="candidate-card-middle"><span className={`status-pill status-pill--${candidate.status.toLowerCase()}`}>{statusLabels[candidate.status]}</span><div className="card-skills">{skills.length ? skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>) : <span className="no-skills">Add skills</span>}{skills.length > 3 && <span className="more-skills">+{skills.length - 3}</span>}</div></div><div className="candidate-card-end"><span className="experience-value"><strong>{candidate.experienceYears}</strong> yrs</span><button className="card-open-button" aria-label={`View ${candidate.fullName}`}><ChevronRight size={17} /></button><button className="card-delete-button" aria-label={`Delete ${candidate.fullName}`} onClick={(event) => { event.stopPropagation(); onDelete() }}>Delete</button></div></article>
}

export default App
