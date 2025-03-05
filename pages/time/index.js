import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'

export default function TimeTracking() {
  const router = useRouter()
  const [timeEntries, setTimeEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [newEntry, setNewEntry] = useState({
    project_id: '',
    task_id: '',
    hours: '',
    description: '',
    billable: true
  })
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/')
      return
    }
    fetchTimeEntries()
    fetchProjects()
    fetchTasks()
  }, [])

  const fetchTimeEntries = async () => {
    try {
      const response = await fetch('/api/time')
      const data = await response.json()
      setTimeEntries(data)
    } catch (error) {
      console.error('Failed to fetch time entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      setProjects(data)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks')
      const data = await response.json()
      setTasks(data)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEntry),
      })

      if (response.ok) {
        setNewEntry({
          project_id: '',
          task_id: '',
          hours: '',
          description: '',
          billable: true
        })
        fetchTimeEntries()
      }
    } catch (error) {
      console.error('Failed to create time entry:', error)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Time Tracking</h1>
          <button 
            onClick={() => router.push('/time/reports')}
            className="btn btn-outline"
          >
            View Reports
          </button>
        </div>

        {/* New Time Entry Form */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">Log Time</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Project</span>
                  </label>
                  <select 
                    className="select select-bordered w-full"
                    value={newEntry.project_id}
                    onChange={(e) => setNewEntry({...newEntry, project_id: e.target.value})}
                    required
                  >
                    <option value="">Select Project</option>
                    {projects.map((project) => (
                      <option key={project.project_id} value={project.project_id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Task</span>
                  </label>
                  <select 
                    className="select select-bordered w-full"
                    value={newEntry.task_id}
                    onChange={(e) => setNewEntry({...newEntry, task_id: e.target.value})}
                    required
                  >
                    <option value="">Select Task</option>
                    {tasks.filter(task => task.project_id === newEntry.project_id).map((task) => (
                      <option key={task.task_id} value={task.task_id}>
                        {task.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Hours</span>
                  </label>
                  <input 
                    type="number"
                    step="0.25"
                    className="input input-bordered"
                    value={newEntry.hours}
                    onChange={(e) => setNewEntry({...newEntry, hours: e.target.value})}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Description</span>
                  </label>
                  <input 
                    type="text"
                    className="input input-bordered"
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Billable</span>
                  <input 
                    type="checkbox"
                    className="checkbox"
                    checked={newEntry.billable}
                    onChange={(e) => setNewEntry({...newEntry, billable: e.target.checked})}
                  />
                </label>
              </div>

              <div className="card-actions justify-end">
                <button type="submit" className="btn btn-primary">
                  Log Time
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Time Entries List */}
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
                  <th>Project</th>
                  <th>Task</th>
                  <th>Hours</th>
                  <th>Description</th>
                  <th>Billable</th>
                </tr>
              </thead>
              <tbody>
                {timeEntries.map((entry) => (
                  <tr key={entry.time_entry_id}>
                    <td>{new Date(entry.date).toLocaleDateString()}</td>
                    <td>{projects.find(p => p.project_id === entry.project_id)?.name || entry.project_id}</td>
                    <td>{tasks.find(t => t.task_id === entry.task_id)?.name || entry.task_id}</td>
                    <td>{entry.hours}</td>
                    <td>{entry.description}</td>
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