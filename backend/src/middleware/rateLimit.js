const rateLimitMap = new Map();

const rateLimit = (maxRequests = 10, windowMs = 60000) => {
  return (req, res, next) => {
    const key = req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, []);
    }

    const requests = rateLimitMap.get(key);
    // Remove old requests outside the window
    const validRequests = requests.filter(time => time > windowStart);

    console.log(`[${new Date().toISOString()}] Rate limit check for ${key}: ${validRequests.length}/${maxRequests} requests in window`);

    if (validRequests.length >= maxRequests) {
      console.log(`[${new Date().toISOString()}] Rate limit exceeded for ${key}`);
      return res.status(429).json({
        error: 'Too many requests. Please try again later.'
      });
    }

    validRequests.push(now);
    rateLimitMap.set(key, validRequests);

    next();
  };
};

module.exports = rateLimit;
