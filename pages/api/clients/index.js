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
        const clients = await db.collection('agency_clients')
          .find({})
          .sort({ created_at: -1 })
          .toArray()
        return res.status(200).json(clients)

      case 'POST':
        const { name, company, industry, contactInfo } = req.body
        const newClient = {
          client_id: `CLT${Date.now()}`,
          name,
          company,
          industry,
          contactInfo,
          status: 'active',
          active: true,
          created_at: new Date()
        }
        await db.collection('agency_clients').insertOne(newClient)
        return res.status(201).json(newClient)

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` })
    }
  } catch (error) {
    console.error('Clients API error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
} 