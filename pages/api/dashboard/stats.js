import { connectToDatabase } from '../../../utils/mongodb'

export default async function handler(req, res) {
  try {
    // Check auth token from cookie
    const authToken = req.cookies['auth-token']
    if (!authToken) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { db } = await connectToDatabase()

    // Get stats from agency collections
    const totalClients = await db.collection('agency_clients').countDocuments()
    const activeProjects = await db.collection('agency_projects')
      .countDocuments({ status: 'in-progress' })
    const pendingTasks = await db.collection('agency_tasks')
      .countDocuments({ status: 'pending' })
    
    // Calculate monthly revenue from contracts
    const monthlyRevenue = await db.collection('agency_contracts')
      .aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$monthly_fee' } } }
      ]).toArray()

    res.status(200).json({
      totalClients,
      activeProjects,
      pendingTasks,
      monthlyRevenue: monthlyRevenue[0]?.total || 0
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
} 