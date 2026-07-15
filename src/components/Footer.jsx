import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <span className="footer-copyright">&copy; {new Date().getFullYear()} DTW Service. All rights reserved.</span>
        </div>
        <div className="footer-right">
          <span className="footer-meta">API: http://10.0.32.70:60000/api/DTW_Service</span>
          <span className="footer-separator">|</span>
          <span className="footer-meta">Environment: Production</span>
          <span className="footer-separator">|</span>
          <span className="footer-meta">Last updated: {new Date().toLocaleDateString('th-TH')}</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer