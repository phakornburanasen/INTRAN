import './Sidebar.css'

function Sidebar({ collapsed }) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <nav className="sidebar-nav">
        <div className="sidebar-section">
          {!collapsed && <span className="sidebar-section-title">Monitoring</span>}
          <div className="sidebar-item active" title={collapsed ? 'Job Monitor' : ''}>
            <span className="sidebar-item-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </span>
            {!collapsed && <span className="sidebar-item-label">Job Monitor</span>}
          </div>
        </div>
      </nav>

      {!collapsed && (
        <div className="sidebar-footer-info">
          <div className="sidebar-status">
            <span className="sidebar-status-dot"></span>
            <span className="sidebar-status-text">API Connected</span>
          </div>
          <span className="sidebar-version">v1.0.0</span>
        </div>
      )}
    </aside>
  )
}

export default Sidebar