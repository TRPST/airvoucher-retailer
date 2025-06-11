import { createClient } from '@/utils/supabase/server';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the supabase server client
    const supabase = createClient(req, res);

    // Get the current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Check if user is authenticated
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extract request body
    const { retailerId, name } = req.body;

    if (!retailerId || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify that the user is associated with this retailer
    const { data: retailerData, error: retailerError } = await supabase
      .from('retailers')
      .select('id')
      .eq('id', retailerId)
      .eq('user_profile_id', session.user.id)
      .single();

    if (retailerError || !retailerData) {
      return res.status(403).json({ error: 'Not authorized to manage this retailer' });
    }

    // Create the terminal
    const { data: terminal, error: terminalError } = await supabase
      .from('terminals')
      .insert({
        retailer_id: retailerId,
        name: name,
        status: 'active',
      })
      .select('id, name, status, last_active')
      .single();

    if (terminalError) {
      console.error('Error creating terminal:', terminalError);
      return res.status(500).json({ error: 'Failed to create terminal' });
    }

    // Return the new terminal data
    return res.status(201).json({
      terminal: {
        id: terminal.id,
        name: terminal.name,
        status: terminal.status,
        last_active: terminal.last_active,
      },
    });
  } catch (error) {
    console.error('Unexpected error in terminal creation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
