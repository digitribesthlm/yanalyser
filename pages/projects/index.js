import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'

export default function Projects() {
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/')
      return
    }
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      setProjects(data)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Projects</h1>
          <button 
            onClick={() => router.push('/projects/new')}
            className="btn btn-primary"
          >
            New Project
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div key={project.project_id} className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">{project.name}</h2>
                  <p className="text-sm text-gray-500">Client: {project.client_id}</p>
                  <div className="flex justify-between items-center mt-4">
                    <span className={`badge ${
                      project.status === 'completed' ? 'badge-success' : 
                      project.status === 'in-progress' ? 'badge-warning' : 
                      'badge-info'
                    }`}>
                      {project.status}
                    </span>
                    <button 
                      onClick={() => router.push(`/projects/${project.project_id}`)}
                      className="btn btn-sm btn-outline"
                    >
                      View Details
                    </button>
                  </div>
                  <div className="mt-4">
                    <div className="text-sm">Budget: ${project.total_budget}</div>
                    <div className="text-sm">
                      Timeline: {new Date(project.start_date).toLocaleDateString()} - {new Date(project.end_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 