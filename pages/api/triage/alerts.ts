import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AlertConfig {
  id: string;
  type: 'email' | 'sms' | 'slack';
  recipient: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    return handleAlertRegistration(req, res);
  } else if (req.method === 'GET') {
    return handleAlertList(req, res);
  } else if (req.method === 'PUT') {
    return handleAlertUpdate(req, res);
  } else if (req.method === 'DELETE') {
    return handleAlertDeletion(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleAlertRegistration(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { type, recipient } = req.body;

    if (!type || !recipient) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate alert type
    if (!['email', 'sms', 'slack'].includes(type)) {
      return res.status(400).json({ error: 'Invalid alert type' });
    }

    // Validate recipient based on type
    if (type === 'email' && !isValidEmail(recipient)) {
      return res.status(400).json({ error: 'Invalid email address' });
    } else if (type === 'sms' && !isValidPhoneNumber(recipient)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Create alert configuration
    const { data, error } = await supabase
      .from('alert_configs')
      .insert({
        type,
        recipient,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating alert config:', error);
      return res.status(500).json({ error: 'Failed to create alert config' });
    }

    return res.status(201).json(data);
  } catch (error) {
    console.error('Error in alert registration:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleAlertList(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data, error } = await supabase
      .from('alert_configs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alert configs:', error);
      return res.status(500).json({ error: 'Failed to fetch alert configs' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in alert list:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleAlertUpdate(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    const { is_active } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Alert config ID is required' });
    }

    const { data, error } = await supabase
      .from('alert_configs')
      .update({
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating alert config:', error);
      return res.status(500).json({ error: 'Failed to update alert config' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in alert update:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleAlertDeletion(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Alert config ID is required' });
    }

    const { error } = await supabase
      .from('alert_configs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting alert config:', error);
      return res.status(500).json({ error: 'Failed to delete alert config' });
    }

    return res.status(200).json({ message: 'Alert config deleted successfully' });
  } catch (error) {
    console.error('Error in alert deletion:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper functions for validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-]{10,}$/;
  return phoneRegex.test(phone);
} 