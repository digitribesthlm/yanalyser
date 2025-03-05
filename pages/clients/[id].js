import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'

export default function ClientDetails() {
  const router = useRouter()
  const { id } = router.query
  const [client, setClient] = useState(null)
  const [projects, setProjects] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/')
      return
    }
    if (id) {
      fetchClientData()
    }
  }, [id])

  const fetchClientData = async () => {
    try {
      // Fetch client details
      const clientRes = await fetch(`/api/clients/${id}`)
      const clientData = await clientRes.json()
      setClient(clientData)

      // Fetch client's projects
      const projectsRes = await fetch(`/api/projects?client_id=${id}`)
      const projectsData = await projectsRes.json()
      setProjects(projectsData)

      // Fetch client's contracts
      const contractsRes = await fetch(`/api/contracts?client_id=${id}`)
      const contractsData = await contractsRes.json()
      setContracts(contractsData)
    } catch (error) {
      console.error('Failed to fetch client data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-screen">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </DashboardLayout>
    )
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="p-4">
          <div className="alert alert-error">Client not found</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-4">
        {/* Client Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">{client.name}</h1>
            <p className="text-gray-600">{client.company}</p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => router.push(`/clients/${id}/edit`)}
              className="btn btn-outline"
            >
              Edit Client
            </button>
            <button 
              onClick={() => router.push('/contracts/new?client_id=' + id)}
              className="btn btn-primary"
            >
              New Contract
            </button>
          </div>
        </div>

        {/* Client Info Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Client Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Industry</label>
                  <p>{client.industry}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Contact Email</label>
                  <p>{client.contactInfo?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Contact Phone</label>
                  <p>{client.contactInfo?.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <span className={`badge ml-2 ${
                    client.status === 'active' ? 'badge-success' : 
                    client.status === 'inactive' ? 'badge-error' : 
                    'badge-warning'
                  }`}>
                    {client.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Contracts */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Active Contracts</h2>
              {contracts.filter(c => c.status === 'active').map((contract) => (
                <div 
                  key={contract.contract_id} 
                  className="p-4 border rounded-lg hover:bg-base-200 cursor-pointer"
                  onClick={() => router.push(`/contracts/${contract.contract_id}`)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">${contract.monthly_fee}/month</p>
                      <p className="text-sm text-gray-600">
                        Next billing: {new Date(contract.billing.next_billing_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="badge badge-success">Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title">Projects</h2>
              <button 
                onClick={() => router.push('/projects/new?client_id=' + id)}
                className="btn btn-sm btn-outline"
              >
                New Project
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Timeline</th>
                    <th>Budget</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.project_id}>
                      <td>{project.name}</td>
                      <td>{project.project_type}</td>
                      <td>
                        <span className={`badge ${
                          project.status === 'completed' ? 'badge-success' : 
                          project.status === 'in-progress' ? 'badge-warning' : 
                          'badge-info'
                        }`}>
                          {project.status}
                        </span>
                      </td>
                      <td>
                        {new Date(project.start_date).toLocaleDateString()} - 
                        {new Date(project.end_date).toLocaleDateString()}
                      </td>
                      <td>${project.total_budget}</td>
                      <td>
                        <button
                          onClick={() => router.push(`/projects/${project.project_id}`)}
                          className="btn btn-sm btn-ghost"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Communication History */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Communication History</h2>
            <div className="space-y-4">
              {client.communications?.map((comm) => (
                <div key={comm.date} className="border-l-4 border-primary pl-4">
                  <p className="text-sm text-gray-600">
                    {new Date(comm.date).toLocaleDateString()}
                  </p>
                  <p className="font-medium">{comm.subject}</p>
                  <p className="text-gray-600">{comm.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 