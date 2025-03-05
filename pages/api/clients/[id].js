import { connectToDatabase } from '../../../utils/mongodb'

export default async function handler(req, res) {
  try {
    // Check auth token from cookie
    const authToken = req.cookies['auth-token']
    if (!authToken) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { db } = await connectToDatabase()
    const { id } = req.query

    switch (req.method) {
      case 'GET':
        const client = await db.collection('agency_clients').findOne({ client_id: id })
        if (!client) {
          return res.status(404).json({ message: 'Client not found' })
        }
        return res.status(200).json(client)

      case 'PUT':
        const { name, company, industry, contactInfo, status } = req.body
        const result = await db.collection('agency_clients').updateOne(
          { client_id: id },
          {
            $set: {
              name,
              company,
              industry,
              contactInfo,
              status,
              updated_at: new Date()
            }
          }
        )
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Client not found' })
        }
        return res.status(200).json({ message: 'Client updated successfully' })

      case 'DELETE':
        const deleteResult = await db.collection('agency_clients').updateOne(
          { client_id: id },
          {
            $set: {
              active: false,
              updated_at: new Date()
            }
          }
        )
        if (deleteResult.matchedCount === 0) {
          return res.status(404).json({ message: 'Client not found' })
        }
        return res.status(200).json({ message: 'Client deleted successfully' })

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` })
    }
  } catch (error) {
    console.error('Client API error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
} 