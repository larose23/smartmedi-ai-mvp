import { NextApiRequest, NextApiResponse } from 'next';
import { resourceOptimizationService } from '../../../services/resourceOptimizationService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleResourceOptimization(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleResourceOptimization(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { type } = req.query;

    let data;
    switch (type) {
      case 'flow-metrics':
        data = await resourceOptimizationService.getFlowMetrics();
        break;
      case 'surge-predictions':
        data = await resourceOptimizationService.predictSurges();
        break;
      case 'resource-recommendations':
        data = await resourceOptimizationService.getResourceRecommendations();
        break;
      default:
        return res.status(400).json({ error: 'Invalid optimization type' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in resource optimization:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 