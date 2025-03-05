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
        const tasks = await db.collection('agency_tasks')
          .find({})
          .sort({ deadline: 1 })
          .toArray()
        return res.status(200).json(tasks)

      case 'POST':
        const { name, contract_id, project_id, service_id, assigned_to, deadline } = req.body
        const newTask = {
          task_id: `TSK${Date.now()}`,
          name,
          contract_id,
          project_id,
          service_id,
          assigned_to,
          status: 'pending',
          deadline: new Date(deadline),
          active: true,
          created_at: new Date()
        }
        await db.collection('agency_tasks').insertOne(newTask)
        return res.status(201).json(newTask)

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` })
    }
  } catch (error) {
    console.error('Tasks API error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
} 