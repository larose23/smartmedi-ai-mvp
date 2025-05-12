import { NextApiRequest, NextApiResponse } from 'next';
import { secondOpinionService } from '../../../services/secondOpinionService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGetRequest(req, res);
  } else if (req.method === 'POST') {
    return handlePostRequest(req, res);
  } else if (req.method === 'PUT') {
    return handlePutRequest(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetRequest(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { type, caseId, specialistId, date, page = '1', limit = '5' } = req.query;

    switch (type) {
      case 'specialists':
        if (!req.query.specialty) {
          return res.status(400).json({ error: 'Specialty is required' });
        }
        const specialists = await secondOpinionService.getAvailableSpecialists(
          req.query.specialty as string
        );
        return res.status(200).json(specialists);

      case 'case-requests':
        if (!caseId) {
          return res.status(400).json({ error: 'Case ID is required' });
        }
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        
        if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
          return res.status(400).json({ error: 'Invalid pagination parameters' });
        }

        const { requests, total } = await secondOpinionService.getCaseRequests(
          caseId as string,
          pageNum,
          limitNum
        );
        return res.status(200).json({ requests, total });

      case 'availability':
        if (!specialistId || !date) {
          return res.status(400).json({ error: 'Specialist ID and date are required' });
        }
        const availability = await secondOpinionService.getSpecialistAvailability(
          specialistId as string,
          date as string
        );
        return res.status(200).json(availability);

      default:
        return res.status(400).json({ error: 'Invalid request type' });
    }
  } catch (error) {
    console.error('Error in GET request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePostRequest(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { type } = req.query;

    switch (type) {
      case 'request':
        const { caseId, staffId, priority, reason, notes } = req.body;
        if (!caseId || !staffId || !priority || !reason) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        const request = await secondOpinionService.createRequest(
          caseId,
          staffId,
          priority,
          reason,
          notes
        );
        return res.status(201).json(request);

      case 'consultation':
        const {
          requestId,
          specialistId,
          scheduledTime,
          durationMinutes,
          notes: consultationNotes,
        } = req.body;
        if (!requestId || !specialistId || !scheduledTime) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        const consultation = await secondOpinionService.scheduleConsultation(
          requestId,
          specialistId,
          scheduledTime,
          durationMinutes,
          consultationNotes
        );
        return res.status(201).json(consultation);

      case 'feedback':
        const {
          consultationId,
          specialistId: feedbackSpecialistId,
          feedbackType,
          feedback,
          recommendations,
        } = req.body;
        if (!consultationId || !feedbackSpecialistId || !feedbackType || !feedback) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        const feedbackData = await secondOpinionService.submitFeedback(
          consultationId,
          feedbackSpecialistId,
          feedbackType,
          feedback,
          recommendations
        );
        return res.status(201).json(feedbackData);

      default:
        return res.status(400).json({ error: 'Invalid request type' });
    }
  } catch (error) {
    console.error('Error in POST request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePutRequest(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { type, id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    switch (type) {
      case 'consultation':
        const { status, notes } = req.body;
        if (!status) {
          return res.status(400).json({ error: 'Status is required' });
        }
        const consultation = await secondOpinionService.getConsultation(id as string);
        // Update consultation status
        const { error } = await supabase
          .from('consultations')
          .update({ status, notes })
          .eq('id', id);
        if (error) throw error;
        return res.status(200).json({ message: 'Consultation updated successfully' });

      default:
        return res.status(400).json({ error: 'Invalid request type' });
    }
  } catch (error) {
    console.error('Error in PUT request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 