const jwt = require('jsonwebtoken');
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!SUPABASE_JWT_SECRET) {
  throw new Error('Missing SUPABASE_JWT_SECRET in env');
}

module.exports = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] Auth middleware called for ${req.method} ${req.path}`);

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log(`[${new Date().toISOString()}] Auth failed: Authorization header missing`);
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  let token;
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else {
    // Assume the entire header is the token (for clients that send token directly)
    token = authHeader;
  }

  if (!token) {
    console.log(`[${new Date().toISOString()}] Auth failed: No token provided`);
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    console.log(`[${new Date().toISOString()}] Verifying JWT token...`);

    // Try HS256 first (most common for Supabase)
    const payload = jwt.verify(token, SUPABASE_JWT_SECRET, { algorithms: ['HS256'] });

    // Ensure we have the required fields
    if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.trim() === '' || payload.sub === 'null') {
      console.error(`[${new Date().toISOString()}] Auth failed: Token missing or invalid sub (user ID) field: ${payload.sub}`);
      return res.status(401).json({ error: 'Invalid token structure - missing or invalid user ID' });
    }

    req.user = {
      id: payload.sub,
      email: payload.email || payload.user_metadata?.email
    };

    console.log(`[${new Date().toISOString()}] Auth success: User ${req.user.id} authenticated for ${req.method} ${req.path}`);
    next();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] JWT verification failed:`, error.message);

    // Try to decode the token without verification to see its structure
    try {
      const decoded = jwt.decode(token);
      console.log(`[${new Date().toISOString()}] Token decoded without verification:`, {
        header: decoded ? 'present' : 'null',
        payload: decoded ? Object.keys(decoded) : 'null',
        sub: decoded?.sub,
        email: decoded?.email,
        exp: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : 'no exp'
      });
    } catch (decodeError) {
      console.error(`[${new Date().toISOString()}] Could not even decode token:`, decodeError.message);
    }

    return res.status(401).json({ error: 'Invalid or expired token', details: error.message });
  }
};
