import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import ContentContainer from '../../components/ContentContainer'

export default function NewClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    industry: '',
    contactInfo: {
      email: '',
      phone: ''
    }
  })

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/')
      return
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        router.push('/clients')
      } else {
        const error = await response.json()
        console.error('Failed to create client:', error)
      }
    } catch (error) {
      console.error('Failed to create client:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <PageHeader 
        title="New Client"
        actions={
          <button
            onClick={() => router.back()}
            className="btn btn-ghost"
          >
            Cancel
          </button>
        }
      />
      <ContentContainer>
        <div className="card bg-base-100 shadow-xl">
          <form onSubmit={handleSubmit} className="card-body">
            <div className="divider text-lg font-semibold">Basic Information</div>
            
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Contact Name</span>
              </label>
              <input
                type="text"
                placeholder="Enter contact name"
                className="input input-bordered w-full"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Company Name</span>
              </label>
              <input
                type="text"
                placeholder="Enter company name"
                className="input input-bordered w-full"
                value={formData.company}
                onChange={(e) => setFormData({...formData, company: e.target.value})}
                required
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Industry</span>
              </label>
              <input
                type="text"
                placeholder="Enter industry"
                className="input input-bordered w-full"
                value={formData.industry}
                onChange={(e) => setFormData({...formData, industry: e.target.value})}
                required
              />
            </div>

            <div className="divider text-lg font-semibold">Contact Information</div>
            
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <input
                type="email"
                placeholder="Enter email address"
                className="input input-bordered w-full"
                value={formData.contactInfo.email}
                onChange={(e) => setFormData({
                  ...formData,
                  contactInfo: {
                    ...formData.contactInfo,
                    email: e.target.value
                  }
                })}
                required
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Phone</span>
              </label>
              <input
                type="tel"
                placeholder="Enter phone number"
                className="input input-bordered w-full"
                value={formData.contactInfo.phone}
                onChange={(e) => setFormData({
                  ...formData,
                  contactInfo: {
                    ...formData.contactInfo,
                    phone: e.target.value
                  }
                })}
                required
              />
            </div>

            <div className="card-actions justify-end mt-6">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  'Create Client'
                )}
              </button>
            </div>
          </form>
        </div>
      </ContentContainer>
    </DashboardLayout>
  )
} 