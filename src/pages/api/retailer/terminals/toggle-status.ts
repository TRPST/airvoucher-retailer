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
    const { terminalId, status } = req.body;

    if (!terminalId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate status value
    if (status !== 'active' && status !== 'inactive') {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // First get the terminal to get the retailer ID
    const { data: terminal, error: terminalError } = await supabase
      .from('terminals')
      .select('id, retailer_id')
      .eq('id', terminalId)
      .single();

    if (terminalError || !terminal) {
      return res.status(404).json({ error: 'Terminal not found' });
    }

    // Now check if the user has access to this retailer
    const { data: retailer, error: retailerError } = await supabase
      .from('retailers')
      .select('id, user_profile_id')
      .eq('id', terminal.retailer_id)
      .eq('user_profile_id', session.user.id)
      .single();

    if (retailerError || !retailer) {
      return res.status(403).json({ error: 'Not authorized to manage this terminal' });
    }

    // Update the terminal status
    const { data: updatedTerminal, error: updateError } = await supabase
      .from('terminals')
      .update({ status })
      .eq('id', terminalId)
      .select('id, name, status, last_active')
      .single();

    if (updateError) {
      console.error('Error updating terminal status:', updateError);
      return res.status(500).json({ error: 'Failed to update terminal status' });
    }

    // Return the updated terminal data
    return res.status(200).json({
      terminal: {
        id: updatedTerminal.id,
        name: updatedTerminal.name,
        status: updatedTerminal.status,
        last_active: updatedTerminal.last_active,
      },
    });
  } catch (error) {
    console.error('Unexpected error in toggle terminal status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
