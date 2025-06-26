// Test endpoint to verify API routing is working
export default async function handler(req, res) {
  res.status(200).json({ 
    success: true, 
    message: 'Test endpoint is working - updated',
    method: req.method,
    timestamp: new Date().toISOString()
  });
} 