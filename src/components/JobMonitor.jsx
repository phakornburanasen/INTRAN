import { Fragment, useState, useEffect, useCallback } from 'react'
import Swal from 'sweetalert2'
import './JobMonitor.css'

const API_JOBS = 'http://10.0.32.70:60000/api/DTW_Service/jobs'
const API_RESEND = 'http://10.0.32.70:60000/api/DTW_Service/resend_job'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'RECEIVED', label: 'RECEIVED' },
  { value: 'PROCESSING', label: 'PROCESSING' },
  { value: 'COMPLETED', label: 'COMPLETED' },
  { value: 'FAILED', label: 'FAILED' },
]

const STATUS_NE_OPTIONS = [
  { value: '', label: 'None (no exclude)' },
  { value: 'RECEIVED', label: 'Not RECEIVED' },
  { value: 'PROCESSING', label: 'Not PROCESSING' },
  { value: 'COMPLETED', label: 'Not COMPLETED' },
  { value: 'FAILED', label: 'Not FAILED' },
]

const LIMIT_PRESETS = [10, 50, 100]

const valueMatchesSearch = (value, query) => {
  if (value == null) return false
  if (typeof value === 'object') {
    return Object.values(value).some((nestedValue) => valueMatchesSearch(nestedValue, query))
  }
  return String(value).toLowerCase().includes(query)
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function HighlightText({ value, query }) {
  const text = String(value ?? '')
  if (!query || !text) return text

  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'ig'))
  return parts.map((part, index) => (
    part.toLowerCase() === query.toLowerCase()
      ? <mark className="jm-search-highlight" key={`${part}-${index}`}>{part}</mark>
      : part
  ))
}

function JobMonitor() {
  const [reloadKey, setReloadKey] = useState(0)
  const [filterMode, setFilterMode] = useState('day')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [status, setStatus] = useState('')
  const [statusNe, setStatusNe] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSearchTerm, setActiveSearchTerm] = useState('')
  const [limit, setLimit] = useState(10)
  const [offset, setOffset] = useState(0)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedJob, setExpandedJob] = useState(null)
  const [itemLimit, setItemLimit] = useState(10)
  const [itemPage, setItemPage] = useState(1)

  const [resendMode, setResendMode] = useState('item_code')
  const [resendValue, setResendValue] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendResult, setResendResult] = useState(null)
  const [resendError, setResendError] = useState(null)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError(null)
    setExpandedJob(null)

    const params = new URLSearchParams()

    if (filterMode === 'day' && selectedDate) {
      params.set('created_at', selectedDate)
    } else if (filterMode === 'month' && selectedMonth) {
      params.set('created_at', selectedMonth)
    }

    if (status) params.set('status', status)
    if (statusNe) params.set('status_ne', statusNe)
    params.set('limit', activeSearchTerm ? '10000' : String(limit))
    params.set('offset', activeSearchTerm ? '0' : String(offset))

    try {
      const url = `${API_JOBS}?${params.toString()}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [filterMode, selectedDate, selectedMonth, status, statusNe, limit, offset, activeSearchTerm])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs, reloadKey])

  const handleSearch = (e) => {
    e.preventDefault()
    setActiveSearchTerm(searchTerm.trim())
    setOffset(0)
    setExpandedJob(null)
    setReloadKey((key) => key + 1)
  }

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0
  const currentPage = data ? Math.floor(data.offset / data.limit) + 1 : 1
  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const visibleJobs = data?.jobs?.filter((job) => {
    if (!normalizedSearchTerm) return true
    return valueMatchesSearch(job, normalizedSearchTerm)
  }) ?? []

  const goToPage = (page) => {
    const newOffset = (page - 1) * data.limit
    setOffset(newOffset)
  }

  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value))
    setOffset(0)
  }

  const handleItemLimitChange = (e) => {
    setItemLimit(Number(e.target.value))
    setItemPage(1)
  }

  const toggleExpandedJob = (jobId) => {
    setExpandedJob((current) => {
      const nextExpanded = current === jobId ? null : jobId
      setItemPage(1)
      return nextExpanded
    })
  }

  const statusClass = (s) => {
    switch (s) {
      case 'COMPLETED': return 'jm-badge jm-badge-success'
      case 'FAILED': return 'jm-badge jm-badge-danger'
      case 'PROCESSING': return 'jm-badge jm-badge-warning'
      case 'RECEIVED': return 'jm-badge jm-badge-info'
      default: return 'jm-badge'
    }
  }

  const formatDateThai = (dateStr) => {
    if (!dateStr) return dateStr
    const dateSegments = dateStr.split('-')
    if (dateSegments.length >= 2) {
      const year = dateSegments[0]
      const month = dateSegments[1]
      const day = dateSegments[2]
      if (day) return `${day}/${month}/${year}`
      return `${month}/${year}`
    }
    return dateStr
  }

  const formatDateTime = (dt) => {
    if (!dt) return '-'
    const parts = dt.split(' ')
    const datePart = parts[0]
    const timePart = parts.length > 1 ? ` ${parts.slice(1).join(' ')}` : ''
    const dateSegments = datePart.split('-')
    if (dateSegments.length === 3) {
      return `${dateSegments[2]}/${dateSegments[1]}/${dateSegments[0]}${timePart}`
    }
    return dt
  }

  const getJobNo = (job) => {
    const value = job?.job_no ?? job?.jobNo ?? job?.JOB_NO ?? job?.job_id
    return value != null ? String(value) : ''
  }

  const openDatePicker = () => {
    const el = document.getElementById('hidden-date-input')
    if (el) el.showPicker()
  }

  const openMonthPicker = () => {
    const el = document.getElementById('hidden-month-input')
    if (el) el.showPicker()
  }

  const getScrollParent = (el) => {
    let parent = el?.parentElement
    while (parent) {
      const { overflowY } = window.getComputedStyle(parent)
      if (['auto', 'scroll'].includes(overflowY) && parent.scrollHeight > parent.clientHeight) {
        return parent
      }
      parent = parent.parentElement
    }
    return document.scrollingElement || document.documentElement
  }

  const slowScrollToElement = (el, duration = 2400, offset = 18) => {
    const scroller = getScrollParent(el)
    const startTop = scroller.scrollTop
    const scrollerRect = scroller.getBoundingClientRect()
    const targetTop = el.getBoundingClientRect().top - scrollerRect.top + startTop - offset
    const maxTop = scroller.scrollHeight - scroller.clientHeight
    const target = Math.max(0, Math.min(targetTop, maxTop))
    const startTime = performance.now()

    return new Promise((resolve) => {
      const step = (now) => {
        const progress = Math.min((now - startTime) / duration, 1)
        const eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2

        scroller.scrollTop = startTop + (target - startTop) * eased

        if (progress < 1) {
          requestAnimationFrame(step)
        } else {
          resolve()
        }
      }

      requestAnimationFrame(step)
    })
  }

  const getResendEndpoint = () => {
    switch (resendMode) {
      case 'item_code':
        return `${API_RESEND}/item_code/${encodeURIComponent(resendValue.trim())}`
      case 'request_id':
        return `${API_RESEND}/request_id/${encodeURIComponent(resendValue.trim())}`
      case 'job':
        return `${API_RESEND}/job_no/${encodeURIComponent(resendValue.trim())}`
      default:
        return ''
    }
  }

  const getResendPlaceholder = () => {
    switch (resendMode) {
      case 'item_code': return 'Enter Item Code (e.g. HANGER-RTG300)'
      case 'request_id': return 'Enter Request ID (e.g. 5e832c55-1c56-42bf-8a14-18236b178925)'
      case 'job': return 'Enter Job No'
      default: return ''
    }
  }

  const getResendLabel = () => {
    switch (resendMode) {
      case 'item_code': return 'Item Code'
      case 'request_id': return 'Request ID'
      case 'job': return 'Job No'
      default: return ''
    }
  }

  const handleResendSubmit = async (e) => {
    e.preventDefault()
    if (!resendValue.trim()) return

    Swal.fire({
      title: '<span style="font-size:16px">Step 2/2: Processing Resend...</span>',
      html: `
        <div style="text-align:left;line-height:1.8;font-size:13px">
          <p><strong>Endpoint:</strong></p>
          <code style="background:#f1f5f9;padding:4px 8px;border-radius:4px;display:block;word-break:break-all;font-size:11px">${getResendEndpoint()}</code>
          <p style="margin-top:10px;color:#64748b">Sending POST request...</p>
        </div>
      `,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading()
      }
    })

    setResendLoading(true)
    setResendError(null)
    setResendResult(null)

    try {
      const url = getResendEndpoint()
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const contentType = res.headers.get('content-type')
      let responseData
      if (contentType && contentType.includes('application/json')) {
        responseData = await res.json()
      } else {
        responseData = await res.text()
      }

      const responseText = typeof responseData === 'object' ? JSON.stringify(responseData, null, 2) : responseData

      if (!res.ok) {
        throw new Error(responseText || `HTTP ${res.status}`)
      }

      setResendResult({ status: res.status, data: responseData })

      Swal.fire({
        title: '<span style="font-size:16px">Resend Successful!</span>',
        html: `
          <div style="text-align:left;line-height:1.8;font-size:13px">
            <p><strong>HTTP Status:</strong> <span style="color:#22c55e">${res.status}</span></p>
            <p><strong>Response:</strong></p>
            <pre style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;font-size:11px;max-height:200px;overflow-y:auto;text-align:left;white-space:pre-wrap;word-break:break-all">${responseText}</pre>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#22c55e',
      }).then(() => {
        setResendValue('')
        setResendResult(null)
        setResendError(null)
      })

      setData(null)
    } catch (err) {
      const errMsg = err.message

      setResendError(errMsg)

      Swal.fire({
        title: '<span style="font-size:16px">Resend Failed!</span>',
        html: `
          <div style="text-align:left;line-height:1.8;font-size:13px">
            <p><strong>Error:</strong></p>
            <pre style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:10px;font-size:11px;max-height:200px;overflow-y:auto;text-align:left;white-space:pre-wrap;word-break:break-all;color:#991b1b">${errMsg}</pre>
          </div>
        `,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#ef4444',
      })
    } finally {
      setResendLoading(false)
    }
  }

  const quickResend = (mode, value) => {
    setResendMode(mode)
    setResendValue(String(value))
    setResendResult(null)
    setResendError(null)

    const modeLabel = mode === 'job' ? 'Job No' : mode === 'request_id' ? 'Request ID' : 'Item Code'

    Swal.fire({
      title: '<span style="font-size:18px">Step 1/2: Resend Job</span>',
      html: `
        <div style="text-align:left;line-height:1.8;font-size:14px">
          <p><strong>Selected Mode:</strong> ${modeLabel}</p>
          <p><strong>Value:</strong> <code style="background:#f1f5f9;padding:2px 8px;border-radius:4px">${String(value)}</code></p>
          <hr style="margin:12px 0;border-color:#e2e8f0">
          <p>The value has been filled in the <strong>Resend Job</strong> section below.</p>
          <p>Click <strong>"Resend Job"</strong> button to continue.</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'OK, Go to Resend Job',
      confirmButtonColor: '#0f8582',
      customClass: {
        popup: 'jm-swal-popup',
        title: 'jm-swal-title',
      }
    }).then(() => {
      const el = document.getElementById('resend-section')
      if (!el) return

      slowScrollToElement(el).then(() => {
        const resendBtn = document.getElementById('resend-submit-btn')
        if (resendBtn) {
          resendBtn.classList.add('jm-resend-btn-highlight')

          const removeHighlight = () => {
            resendBtn.classList.remove('jm-resend-btn-highlight')
            resendBtn.removeEventListener('click', removeHighlight)
          }

          resendBtn.addEventListener('click', removeHighlight)
          setTimeout(removeHighlight, 6000)
        }
      })
    })
  }

  const resendModeOptions = [
    {
      id: 'item_code',
      label: 'By Item Code',
      desc: 'Resend jobs by item code',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
        </svg>
      ),
    },
    {
      id: 'request_id',
      label: 'By Request ID',
      desc: 'Resend jobs by request ID',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="12" y2="17" />
        </svg>
      ),
    },
    {
      id: 'job',
      label: 'By Job No',
      desc: 'Resend a specific job number',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
  ]

  return (
    <div className="jm-container">
      <div className="jm-page-header">
        <div>
          <h2 className="jm-page-title">Job Monitor</h2>
          <p className="jm-page-desc">Monitor, inspect, and resend DTW Service jobs</p>
        </div>
        <div className="jm-stats-row">
          {data && (
            <>
              <div className="jm-stat-card">
                <span className="jm-stat-value">{data.total}</span>
                <span className="jm-stat-label">Total Jobs</span>
              </div>
              <div className="jm-stat-card">
                <span className="jm-stat-value">{visibleJobs.length}</span>
                <span className="jm-stat-label">Showing</span>
              </div>
            </>
          )}
        </div>
      </div>

      <form className="jm-filter-panel" onSubmit={handleSearch}>
        <div className="jm-filter-row">
          <div className="jm-filter-group jm-search-group">
            <label className="jm-filter-label" htmlFor="job-search">Search data</label>
            <div className="jm-search-wrapper">
              <svg className="jm-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" /><line x1="20" y1="20" x2="16.1" y2="16.1" />
              </svg>
              <input id="job-search" type="text" className="jm-filter-input jm-search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search jobs or item code..." />
              {searchTerm && (
                <button type="button" className="jm-search-clear" onClick={() => { setSearchTerm(''); setActiveSearchTerm(''); setOffset(0); setReloadKey((key) => key + 1) }} aria-label="Clear search" title="Clear search">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="jm-filter-group">
            <label className="jm-filter-label">Filter Mode</label>
            <div className="jm-toggle-group">
              <button type="button" className={`jm-toggle-btn ${filterMode === 'day' ? 'active' : ''}`} onClick={() => setFilterMode('day')}>By Day</button>
              <button type="button" className={`jm-toggle-btn ${filterMode === 'month' ? 'active' : ''}`} onClick={() => setFilterMode('month')}>By Month</button>
            </div>
          </div>

          {filterMode === 'day' && (
            <div className="jm-filter-group">
              <label className="jm-filter-label">Select Date</label>
              <div className="jm-date-input-wrapper">
                <input type="text" className="jm-filter-input jm-date-display" value={selectedDate ? formatDateThai(selectedDate) : ''} placeholder="dd/mm/yyyy" readOnly onClick={openDatePicker} />
                <input id="hidden-date-input" type="date" className="jm-date-hidden" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                <button type="button" className="jm-date-icon-btn" onClick={openDatePicker} title="Open calendar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </button>
                {selectedDate && <button type="button" className="jm-date-clear-btn" onClick={() => setSelectedDate('')} title="Clear date">&times;</button>}
              </div>
            </div>
          )}

          {filterMode === 'month' && (
            <div className="jm-filter-group">
              <label className="jm-filter-label">Select Month</label>
              <div className="jm-date-input-wrapper">
                <input type="text" className="jm-filter-input jm-date-display" value={selectedMonth ? formatDateThai(selectedMonth) : ''} placeholder="mm/yyyy" readOnly onClick={openMonthPicker} />
                <input id="hidden-month-input" type="month" className="jm-date-hidden" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                <button type="button" className="jm-date-icon-btn" onClick={openMonthPicker} title="Open month picker">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </button>
                {selectedMonth && <button type="button" className="jm-date-clear-btn" onClick={() => setSelectedMonth('')} title="Clear month">&times;</button>}
              </div>
            </div>
          )}

          <div className="jm-filter-group">
            <label className="jm-filter-label">Status</label>
            <select className="jm-filter-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </div>

          <div className="jm-filter-group">
            <label className="jm-filter-label">Exclude Status</label>
            <select className="jm-filter-input" value={statusNe} onChange={(e) => setStatusNe(e.target.value)}>
              {STATUS_NE_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </div>

          <div className="jm-filter-group">
            <label className="jm-filter-label">Limit</label>
            <select className="jm-filter-input" value={limit} onChange={handleLimitChange}>
              {LIMIT_PRESETS.map((n) => (<option key={n} value={n}>{n}</option>))}
            </select>
          </div>

          <div className="jm-filter-group jm-filter-group-btn">
            <button type="submit" className="jm-btn jm-btn-primary" disabled={loading}>
              {loading ? <span className="jm-spinner-small"></span> : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" /><line x1="20" y1="20" x2="16.1" y2="16.1" />
                </svg>
              )}
              {loading ? 'Loading...' : 'Search'}
            </button>
          </div>
        </div>

        <div className="jm-active-filters">
          {filterMode === 'day' && selectedDate && (
            <span className="jm-chip">Date: {formatDateThai(selectedDate)}<button type="button" className="jm-chip-close" onClick={() => setSelectedDate('')}>&times;</button></span>
          )}
          {filterMode === 'month' && selectedMonth && (
            <span className="jm-chip">Month: {formatDateThai(selectedMonth)}<button type="button" className="jm-chip-close" onClick={() => setSelectedMonth('')}>&times;</button></span>
          )}
          {status && (
            <span className="jm-chip">Status: {status}<button type="button" className="jm-chip-close" onClick={() => setStatus('')}>&times;</button></span>
          )}
          {statusNe && (
            <span className="jm-chip">Not: {statusNe}<button type="button" className="jm-chip-close" onClick={() => setStatusNe('')}>&times;</button></span>
          )}
          {(selectedDate || selectedMonth || status || statusNe) && (
            <button type="button" className="jm-btn jm-btn-ghost" onClick={() => { setSelectedDate(''); setSelectedMonth(''); setStatus(''); setStatusNe(''); setOffset(0); setExpandedJob(null); setReloadKey((key) => key + 1) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7" /><polyline points="3 4 3 10 9 10" />
              </svg>
              Clear All
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="jm-error-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && (
        <div className="jm-info-bar">
          <span>Total Jobs: <strong>{data.total}</strong></span>
          {data.status_filter && <span>Status: <strong>{data.status_filter}</strong></span>}
          {data.status_not_filter && <span>Excluding: <strong>{data.status_not_filter}</strong></span>}
          {data.created_at_filter && <span>Created At: <strong>{formatDateThai(data.created_at_filter)}</strong></span>}
          <span>Showing {visibleJobs.length} of {data.total}</span>
        </div>
      )}

      {loading && !data && (
        <div className="jm-loading">
          <div className="jm-spinner"></div>
          <p>Loading jobs...</p>
        </div>
      )}

      {data && visibleJobs.length > 0 && (
        <>
          <div className="jm-table-wrapper">
            {loading && (
              <div className="jm-table-loading-overlay">
                <div className="jm-spinner jm-spinner-overlay"></div>
                <span>Loading jobs...</span>
              </div>
            )}
            <table className="jm-table">
              <thead>
                <tr>
                  <th className="jm-th-expand"></th>
                  <th>Job No</th>
                  <th>Request ID</th>
                  <th>Profile</th>
                  <th>Requested By</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Requested At</th>
                  <th>Created At</th>
                  <th>Updated At</th>
                  <th>Error</th>
                  <th className="jm-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleJobs.map((job) => {
                  const isExpanded = expandedJob === job.job_id
                  const items = Array.isArray(job.items) ? job.items : []
                  const itemTotalPages = Math.max(1, Math.ceil(items.length / itemLimit))
                  const safeItemPage = Math.min(itemPage, itemTotalPages)
                  const itemStartIndex = (safeItemPage - 1) * itemLimit
                  const pagedItems = items.slice(itemStartIndex, itemStartIndex + itemLimit)

                  return (
                    <Fragment key={job.job_id}>
                      <tr className={`jm-job-row ${isExpanded ? 'expanded' : ''}`}>
                        <td>
                          <button type="button" className="jm-expand-btn" onClick={() => toggleExpandedJob(job.job_id)}>
                            {isExpanded ? '▼' : '▶'}
                          </button>
                        </td>
                        <td className="jm-td-id"><HighlightText value={getJobNo(job) || '-'} query={normalizedSearchTerm} /></td>
                        <td className="jm-td-mono" title={job.request_id}><HighlightText value={job.request_id ? `${job.request_id.substring(0, 8)}...` : '-'} query={normalizedSearchTerm} /></td>
                        <td><HighlightText value={job.integration_profile || '-'} query={normalizedSearchTerm} /></td>
                        <td><HighlightText value={job.requested_by || '-'} query={normalizedSearchTerm} /></td>
                        <td><HighlightText value={job.source_system || '-'} query={normalizedSearchTerm} /></td>
                        <td><span className={statusClass(job.status)}><HighlightText value={job.status} query={normalizedSearchTerm} /></span></td>
                        <td className="jm-td-nowrap"><HighlightText value={formatDateTime(job.requested_at)} query={normalizedSearchTerm} /></td>
                        <td className="jm-td-nowrap"><HighlightText value={formatDateTime(job.created_at)} query={normalizedSearchTerm} /></td>
                        <td className="jm-td-nowrap"><HighlightText value={formatDateTime(job.updated_at)} query={normalizedSearchTerm} /></td>
                        <td className="jm-td-error" title={job.error_message}><HighlightText value={job.error_message || '-'} query={normalizedSearchTerm} /></td>
                        <td className="jm-td-actions">
                          {job.status !== 'COMPLETED' && (
                            <button type="button" className="jm-action-btn" onClick={() => quickResend('job', getJobNo(job))} title="Resend this job" disabled={!getJobNo(job)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                              Resend
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="jm-job-detail-row">
                          <td colSpan={12} className="jm-job-detail-cell">
                            <div className="jm-items-panel">
                              <div className="jm-items-header">
                                <h4>Items for Job #{getJobNo(job) || '-'} <span className="jm-items-count">({items.length} items)</span></h4>
                                <div className="jm-items-header-actions">
                                  <label className="jm-items-limit">
                                    <span>Show</span>
                                    <select className="jm-filter-input jm-items-limit-select" value={itemLimit} onChange={handleItemLimitChange}>
                                      {LIMIT_PRESETS.map((n) => (<option key={n} value={n}>{n}</option>))}
                                    </select>
                                  </label>
                                  <button type="button" className="jm-btn jm-btn-ghost" onClick={() => setExpandedJob(null)}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                    Close
                                  </button>
                                </div>
                              </div>
                              {items.length > 0 ? (
                                <>
                                  <table className="jm-items-table">
                                    <thead>
                                      <tr>
                                        <th>Item ID</th>
                                        <th>Line #</th>
                                        <th>Item Code</th>
                                        <th>Quantity</th>
                                        <th>Warehouse</th>
                                        <th>Status</th>
                                        <th>Transfer No</th>
                                        <th>Record Key</th>
                                        <th>Created At</th>
                                        <th className="jm-th-actions">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {pagedItems.map((item) => (
                                        <tr key={item.item_id}>
                                          <td className="jm-td-id"><HighlightText value={item.item_id} query={normalizedSearchTerm} /></td>
                                          <td><HighlightText value={item.line_num} query={normalizedSearchTerm} /></td>
                                          <td className="jm-td-mono"><HighlightText value={item.item_code} query={normalizedSearchTerm} /></td>
                                          <td><HighlightText value={item.quantity} query={normalizedSearchTerm} /></td>
                                          <td><HighlightText value={item.warehouse_code} query={normalizedSearchTerm} /></td>
                                          <td><span className={statusClass(job.status)}><HighlightText value={job.status} query={normalizedSearchTerm} /></span></td>
                                          <td><HighlightText value={item.transfer_no} query={normalizedSearchTerm} /></td>
                                          <td><HighlightText value={item.record_key} query={normalizedSearchTerm} /></td>
                                          <td className="jm-td-nowrap"><HighlightText value={formatDateTime(item.created_at)} query={normalizedSearchTerm} /></td>
                                          <td className="jm-td-actions">
                                            {job.status !== 'COMPLETED' && (
                                              <button type="button" className="jm-action-btn" onClick={() => quickResend('item_code', item.item_code)} title="Resend by this item code">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                                                Resend
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  <div className="jm-items-footer">
                                    <span className="jm-page-info">Showing {pagedItems.length} of {items.length} items</span>
                                    <div className="jm-pagination jm-items-pagination">
                                      <button type="button" disabled={safeItemPage <= 1} onClick={() => setItemPage((page) => Math.max(1, page - 1))}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
                                        Previous
                                      </button>
                                      <span className="jm-page-info">Page {safeItemPage} of {itemTotalPages}</span>
                                      <button type="button" disabled={safeItemPage >= itemTotalPages} onClick={() => setItemPage((page) => Math.min(itemTotalPages, page + 1))}>
                                        Next
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
                                      </button>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="jm-items-empty">No items found for this job.</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="jm-pagination">
            <button type="button" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
              Previous
            </button>
            <span className="jm-page-info">Page {currentPage} of {totalPages}</span>
            <button type="button" disabled={currentPage >= totalPages} onClick={() => goToPage(currentPage + 1)}>
              Next
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        </>
      )}

      {data && visibleJobs.length === 0 && !loading && (
        <div className="jm-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
          <p>{searchTerm ? 'No jobs found matching the search.' : 'No jobs found matching the current filters.'}</p>
        </div>
      )}

      <div id="resend-section" className="jm-section-divider">
        <div className="jm-section-header">
          <div>
            <h3 className="jm-section-title">Resend Job</h3>
            <p className="jm-section-desc">Resubmit DTW Service jobs by item code, request ID, or job no</p>
          </div>
        </div>

        <div className="jm-resend-cards">
          {resendModeOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`jm-resend-card ${resendMode === opt.id ? 'active' : ''}`}
              onClick={() => { setResendMode(opt.id); setResendResult(null); setResendError(null) }}
            >
              <span className="jm-resend-card-icon">{opt.icon}</span>
              <span className="jm-resend-card-label">{opt.label}</span>
              <span className="jm-resend-card-desc">{opt.desc}</span>
            </button>
          ))}
        </div>

        <form className="jm-resend-form" onSubmit={handleResendSubmit}>
          <div className="jm-resend-input-group">
            <label className="jm-resend-label">{getResendLabel()}</label>
            <div className="jm-resend-input-row">
              <input
                type="text"
                className="jm-resend-input"
                placeholder={getResendPlaceholder()}
                value={resendValue}
                onChange={(e) => setResendValue(e.target.value)}
                disabled={resendLoading}
              />
              <button id="resend-submit-btn" type="submit" className="jm-btn jm-btn-primary" disabled={resendLoading || !resendValue.trim()}>
                {resendLoading ? (
                  <><span className="jm-spinner-small"></span> Sending...</>
                ) : (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg> Resend Job</>
                )}
              </button>
            </div>
            <span className="jm-resend-hint">Endpoint: <code>{getResendEndpoint()}</code></span>
          </div>
        </form>

        {resendError && (
          <div className="jm-resend-result jm-resend-error">
            <div className="jm-resend-result-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              <span className="jm-resend-result-title">Request Failed</span>
            </div>
            <pre className="jm-resend-result-body">{resendError}</pre>
          </div>
        )}

        {resendResult && (
          <div className="jm-resend-result jm-resend-success">
            <div className="jm-resend-result-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              <span className="jm-resend-result-title">Request Successful</span>
              <span className="jm-resend-result-status">HTTP {resendResult.status}</span>
            </div>
            <pre className="jm-resend-result-body">{typeof resendResult.data === 'object' ? JSON.stringify(resendResult.data, null, 2) : resendResult.data}</pre>
          </div>
        )}

        <div className="jm-resend-api-info">
          <h4>Available Endpoints</h4>
          <div className="jm-resend-api-list">
            <div className="jm-resend-api-item"><span className="jm-resend-api-method">POST</span><code className="jm-resend-api-path">/resend_job/item_code/{'{item_code}'}</code><span className="jm-resend-api-label">By Item Code</span></div>
            <div className="jm-resend-api-item"><span className="jm-resend-api-method">POST</span><code className="jm-resend-api-path">/resend_job/request_id/{'{request_id}'}</code><span className="jm-resend-api-label">By Request ID</span></div>
            <div className="jm-resend-api-item"><span className="jm-resend-api-method">POST</span><code className="jm-resend-api-path">/resend_job/job_no/{'{job_no}'}</code><span className="jm-resend-api-label">By Job No</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JobMonitor
