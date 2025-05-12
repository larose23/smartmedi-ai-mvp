import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    return handleWebhookRegistration(req, res);
  } else if (req.method === 'GET') {
    return handleWebhookList(req, res);
  } else if (req.method === 'DELETE') {
    return handleWebhookDeletion(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleWebhookRegistration(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { url, events, secret } = req.body;

    if (!url || !events || !secret) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Validate events
    const validEvents = [
      'case.created',
      'case.updated',
      'case.deleted',
      'case.escalated',
      'case.overridden',
      'analytics.updated'
    ];

    const invalidEvents = events.filter(event => !validEvents.includes(event));
    if (invalidEvents.length > 0) {
      return res.status(400).json({ error: `Invalid events: ${invalidEvents.join(', ')}` });
    }

    // Create webhook configuration
    const { data, error } = await supabase
      .from('webhook_configs')
      .insert({
        url,
        events,
        secret,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating webhook:', error);
      return res.status(500).json({ error: 'Failed to create webhook' });
    }

    return res.status(201).json(data);
  } catch (error) {
    console.error('Error in webhook registration:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleWebhookList(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data, error } = await supabase
      .from('webhook_configs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching webhooks:', error);
      return res.status(500).json({ error: 'Failed to fetch webhooks' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in webhook list:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleWebhookDeletion(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Webhook ID is required' });
    }

    const { error } = await supabase
      .from('webhook_configs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting webhook:', error);
      return res.status(500).json({ error: 'Failed to delete webhook' });
    }

    return res.status(200).json({ message: 'Webhook deleted successfully' });
  } catch (error) {
    console.error('Error in webhook deletion:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Function to send webhook notifications
export async function sendWebhookNotification(event: string, data: any) {
  try {
    // Get all active webhooks for this event
    const { data: webhooks, error } = await supabase
      .from('webhook_configs')
      .select('*')
      .eq('is_active', true)
      .contains('events', [event]);

    if (error) {
      console.error('Error fetching webhooks:', error);
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Send notifications to all matching webhooks
    await Promise.all(
      webhooks.map(async (webhook) => {
        try {
          const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': generateSignature(payload, webhook.secret),
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            console.error(`Webhook delivery failed for ${webhook.url}: ${response.statusText}`);
          }
        } catch (error) {
          console.error(`Error sending webhook to ${webhook.url}:`, error);
        }
      })
    );
  } catch (error) {
    console.error('Error in sendWebhookNotification:', error);
  }
}

// Helper function to generate webhook signature
function generateSignature(payload: WebhookPayload, secret: string): string {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
} 