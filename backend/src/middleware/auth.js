const jwt = require('jsonwebtoken');
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!SUPABASE_JWT_SECRET) {
  throw new Error('Missing SUPABASE_JWT_SECRET in env');
}

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
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
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Try HS256 first (most common for Supabase)
    const payload = jwt.verify(token, SUPABASE_JWT_SECRET, { algorithms: ['HS256'] });

    // Ensure we have the required fields
    if (!payload.sub) {
      console.error('Token missing sub (user ID) field');
      return res.status(401).json({ error: 'Invalid token structure - missing user ID' });
    }

    req.user = {
      id: payload.sub,
      email: payload.email || payload.user_metadata?.email
    };
    next();
  } catch (error) {
    console.error('JWT verification failed:', error.message);

    // Try to decode the token without verification to see its structure
    try {
      const decoded = jwt.decode(token);
      console.log('Token decoded without verification:', {
        header: decoded ? 'present' : 'null',
        payload: decoded ? Object.keys(decoded) : 'null',
        sub: decoded?.sub,
        email: decoded?.email
      });
    } catch (decodeError) {
      console.error('Could not even decode token:', decodeError.message);
    }

    return res.status(401).json({ error: 'Invalid or expired token', details: error.message });
  }
};
