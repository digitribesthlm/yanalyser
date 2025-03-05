import { connectToDatabase } from '../../../utils/mongodb'

export default async function handler(req, res) {
  try {
    // Check auth token from cookie
    const authToken = req.cookies['auth-token']
    if (!authToken) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { db } = await connectToDatabase()

    switch (req.method) {
      case 'GET':
        const projects = await db.collection('agency_projects')
          .find({})
          .sort({ created_at: -1 })
          .toArray()
        return res.status(200).json(projects)

      case 'POST':
        const { name, client_id, service_id, project_type, start_date, end_date, total_budget } = req.body
        const newProject = {
          project_id: `PRJ${Date.now()}`,
          name,
          client_id,
          service_id,
          project_type,
          status: 'planning',
          start_date: new Date(start_date),
          end_date: new Date(end_date),
          total_budget: parseFloat(total_budget),
          phases: [],
          active: true,
          created_at: new Date()
        }
        await db.collection('agency_projects').insertOne(newProject)
        return res.status(201).json(newProject)

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` })
    }
  } catch (error) {
    console.error('Projects API error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
} 