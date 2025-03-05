import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'

export default function Dashboard() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalClients: 0,
    activeProjects: 0,
    pendingTasks: 0,
    monthlyRevenue: 0
  })

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/')
      return
    }
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">Agency Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="stat bg-base-100 shadow">
            <div className="stat-title">Total Clients</div>
            <div className="stat-value">{stats.totalClients}</div>
          </div>
          <div className="stat bg-base-100 shadow">
            <div className="stat-title">Active Projects</div>
            <div className="stat-value">{stats.activeProjects}</div>
          </div>
          <div className="stat bg-base-100 shadow">
            <div className="stat-title">Pending Tasks</div>
            <div className="stat-value">{stats.pendingTasks}</div>
          </div>
          <div className="stat bg-base-100 shadow">
            <div className="stat-title">Monthly Revenue</div>
            <div className="stat-value">${stats.monthlyRevenue}</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 