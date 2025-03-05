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
        const timeEntries = await db.collection('agency_time_tracking')
          .find({})
          .sort({ date: -1 })
          .toArray()
        return res.status(200).json(timeEntries)

      case 'POST':
        const { project_id, task_id, hours, description, billable } = req.body
        
        // Get user info from token
        const userData = JSON.parse(Buffer.from(authToken, 'base64').toString())
        
        const newTimeEntry = {
          time_entry_id: `TIME${Date.now()}`,
          employee_id: userData.userId,
          project_id,
          task_id,
          date: new Date(),
          hours: parseFloat(hours),
          description,
          billable,
          created_at: new Date()
        }
        await db.collection('agency_time_tracking').insertOne(newTimeEntry)
        return res.status(201).json(newTimeEntry)

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` })
    }
  } catch (error) {
    console.error('Time tracking API error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
} 