import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'

export default function TimeReports() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [timeEntries, setTimeEntries] = useState([])
  const [projects, setProjects] = useState([])
  const [employees, setEmployees] = useState([])
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of current month
    endDate: new Date().toISOString().split('T')[0],
    projectId: '',
    employeeId: ''
  })

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/')
      return
    }
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch time entries
      const timeResponse = await fetch('/api/time')
      const timeData = await timeResponse.json()
      setTimeEntries(timeData)

      // Fetch projects
      const projectsResponse = await fetch('/api/projects')
      const projectsData = await projectsResponse.json()
      setProjects(projectsData)

      // Fetch employees
      const employeesResponse = await fetch('/api/employees')
      const employeesData = await employeesResponse.json()
      setEmployees(employeesData)
    } catch (error) {
      console.error('Failed to fetch report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.date)
    const startDate = new Date(filters.startDate)
    const endDate = new Date(filters.endDate)
    
    return (
      entryDate >= startDate &&
      entryDate <= endDate &&
      (!filters.projectId || entry.project_id === filters.projectId) &&
      (!filters.employeeId || entry.employee_id === filters.employeeId)
    )
  })

  const calculateSummary = () => {
    return filteredEntries.reduce((summary, entry) => {
      summary.totalHours += entry.hours
      if (entry.billable) {
        summary.billableHours += entry.hours
      }
      return summary
    }, { totalHours: 0, billableHours: 0 })
  }

  const summary = calculateSummary()

  return (
    <DashboardLayout>
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Time Reports</h1>
        </div>

        {/* Filters */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Start Date</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">End Date</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Project</span>
                </label>
                <select
                  className="select select-bordered"
                  value={filters.projectId}
                  onChange={(e) => setFilters({...filters, projectId: e.target.value})}
                >
                  <option value="">All Projects</option>
                  {projects.map((project) => (
                    <option key={project.project_id} value={project.project_id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Employee</span>
                </label>
                <select
                  className="select select-bordered"
                  value={filters.employeeId}
                  onChange={(e) => setFilters({...filters, employeeId: e.target.value})}
                >
                  <option value="">All Employees</option>
                  {employees.map((employee) => (
                    <option key={employee.employee_id} value={employee.employee_id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="stat bg-base-100 shadow">
            <div className="stat-title">Total Hours</div>
            <div className="stat-value">{summary.totalHours.toFixed(2)}</div>
          </div>
          <div className="stat bg-base-100 shadow">
            <div className="stat-title">Billable Hours</div>
            <div className="stat-value">{summary.billableHours.toFixed(2)}</div>
          </div>
          <div className="stat bg-base-100 shadow">
            <div className="stat-title">Billable Percentage</div>
            <div className="stat-value">
              {summary.totalHours ? ((summary.billableHours / summary.totalHours) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>

        {/* Detailed Report */}
        {loading ? (
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Project</th>
                  <th>Description</th>
                  <th>Hours</th>
                  <th>Billable</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.time_entry_id}>
                    <td>{new Date(entry.date).toLocaleDateString()}</td>
                    <td>
                      {employees.find(e => e.employee_id === entry.employee_id)?.name || entry.employee_id}
                    </td>
                    <td>
                      {projects.find(p => p.project_id === entry.project_id)?.name || entry.project_id}
                    </td>
                    <td>{entry.description}</td>
                    <td>{entry.hours}</td>
                    <td>
                      <span className={`badge ${entry.billable ? 'badge-success' : 'badge-ghost'}`}>
                        {entry.billable ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 