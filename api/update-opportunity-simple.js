import jsforce from 'jsforce';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // For now, just return a success response to test if the endpoint is accessible
    res.status(200).json({ 
      success: true, 
      message: 'Update opportunity endpoint is working',
      method: req.method,
      timestamp: new Date().toISOString(),
      body: req.body
    });

  } catch (error) {
    console.error('Error in update-opportunity-simple:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
} 