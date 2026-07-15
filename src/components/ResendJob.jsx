import { useState } from 'react'
import './ResendJob.css'

const API_BASE = 'http://10.0.32.70:60000/api/DTW_Service/resend_job'

function ResendJob() {
  const [mode, setMode] = useState('item_code') // 'item_code' | 'request_id' | 'job'
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const getEndpoint = () => {
    switch (mode) {
      case 'item_code':
        return `${API_BASE}/item_code/${encodeURIComponent(inputValue.trim())}`
      case 'request_id':
        return `${API_BASE}/request_id/${encodeURIComponent(inputValue.trim())}`
      case 'job':
        return `${API_BASE}/job_no/${encodeURIComponent(inputValue.trim())}`
      default:
        return ''
    }
  }

  const getPlaceholder = () => {
    switch (mode) {
      case 'item_code':
        return 'Enter Item Code (e.g. HANGER-RTG300)'
      case 'request_id':
        return 'Enter Request ID (e.g. 5e832c55-1c56-42bf-8a14-18236b178925)'
      case 'job':
        return 'Enter Job No'
      default:
        return ''
    }
  }

  const getLabel = () => {
    switch (mode) {
      case 'item_code':
        return 'Item Code'
      case 'request_id':
        return 'Request ID'
      case 'job':
        return 'Job No'
      default:
        return ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const url = getEndpoint()
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const contentType = res.headers.get('content-type')
      let data
      if (contentType && contentType.includes('application/json')) {
        data = await res.json()
      } else {
        data = await res.text()
      }

      if (!res.ok) {
        throw new Error(typeof data === 'object' ? JSON.stringify(data) : data || `HTTP ${res.status}`)
      }

      setResult({ status: res.status, data })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const modeOptions = [
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
    <div className="rj-container">
      {/* Page Header */}
      <div className="rj-page-header">
        <div>
          <h2 className="rj-page-title">Resend Job</h2>
          <p className="rj-page-desc">Resubmit DTW Service jobs by specifying item code, request ID, or job no</p>
        </div>
      </div>

      {/* Mode Selection Cards */}
      <div className="rj-mode-cards">
        {modeOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`rj-mode-card ${mode === opt.id ? 'active' : ''}`}
            onClick={() => { setMode(opt.id); setResult(null); setError(null) }}
          >
            <span className="rj-mode-icon">{opt.icon}</span>
            <span className="rj-mode-label">{opt.label}</span>
            <span className="rj-mode-desc">{opt.desc}</span>
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form className="rj-form" onSubmit={handleSubmit}>
        <div className="rj-input-group">
          <label className="rj-input-label" htmlFor="rj-input">{getLabel()}</label>
          <div className="rj-input-row">
            <input
              id="rj-input"
              type="text"
              className="rj-input"
              placeholder={getPlaceholder()}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button type="submit" className="rj-btn rj-btn-submit" disabled={loading || !inputValue.trim()}>
              {loading ? (
                <>
                  <span className="rj-spinner-small"></span>
                  Sending...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  Resend Job
                </>
              )}
            </button>
          </div>
          <span className="rj-input-hint">
            Endpoint: <code>{getEndpoint()}</code>
          </span>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="rj-result rj-result-error">
          <div className="rj-result-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span className="rj-result-title">Request Failed</span>
          </div>
          <pre className="rj-result-body">{error}</pre>
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="rj-result rj-result-success">
          <div className="rj-result-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span className="rj-result-title">Request Successful</span>
            <span className="rj-result-status">HTTP {result.status}</span>
          </div>
          <pre className="rj-result-body">{typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : result.data}</pre>
        </div>
      )}

      {/* API Info */}
      <div className="rj-api-info">
        <h4>Available Endpoints</h4>
        <div className="rj-api-list">
          <div className="rj-api-item">
            <span className="rj-api-method">POST</span>
            <code className="rj-api-path">/resend_job/item_code/{'{item_code}'}</code>
            <span className="rj-api-label">By Item Code</span>
          </div>
          <div className="rj-api-item">
            <span className="rj-api-method">POST</span>
            <code className="rj-api-path">/resend_job/request_id/{'{request_id}'}</code>
            <span className="rj-api-label">By Request ID</span>
          </div>
          <div className="rj-api-item">
            <span className="rj-api-method">POST</span>
            <code className="rj-api-path">/resend_job/job_no/{'{job_no}'}</code>
            <span className="rj-api-label">By Job No</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResendJob
