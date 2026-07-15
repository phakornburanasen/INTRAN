import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Footer from './components/Footer'
import JobMonitor from './components/JobMonitor'
import './App.css'

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved !== null ? JSON.parse(saved) : false
  })

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev)
  }

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  return (
    <div className="app-layout">
      <Navbar onToggleSidebar={toggleSidebar} />
      <div className="app-body">
        <Sidebar collapsed={sidebarCollapsed} />
        <main className="app-main">
          <JobMonitor />
        </main>
      </div>
      <Footer />
    </div>
  )
}

export default App