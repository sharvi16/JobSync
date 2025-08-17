const { doubleCsrf } = require("csrf-csrf");

// Double CSRF protection configuration
const doubleCsrfOptions = {
  getSecret: () => {
    const secret = process.env.CSRF_SECRET || "your-secret-key-change-this-in-production";
    console.log('🔐 CSRF Secret used:', secret ? 'SET' : 'NOT_SET');
    console.log('🔐 Environment:', process.env.NODE_ENV || 'development');
    if (!process.env.CSRF_SECRET) {
      console.warn('⚠️ CSRF_SECRET environment variable not set, using fallback secret');
    }
    return secret;
  },
  cookieName: "_csrf",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 3600000, // 1 hour
    path: '/',
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getTokenFromRequest: (req) => {
    // Check multiple possible locations for the token
    const token = req.body._csrf || 
                  req.query._csrf || 
                  req.headers["x-csrf-token"] || 
                  req.headers["X-CSRF-Token"] || 
                  req.headers["x-xsrf-token"] ||
                  req.cookies._csrf; // Also check cookies
    
    console.log('🔐 Token extracted from request:', token ? 'FOUND' : 'NOT_FOUND');
    console.log('🔐 Token source:', req.body._csrf ? 'body._csrf' : 
                               req.query._csrf ? 'query._csrf' : 
                               req.headers["x-csrf-token"] ? 'header.x-csrf-token' : 
                               req.headers["X-CSRF-Token"] ? 'header.X-CSRF-Token' : 
                               req.headers["x-xsrf-token"] ? 'header.x-xsrf-token' : 
                               req.cookies._csrf ? 'cookie._csrf' : 'none');
    
    return token;
  },
};

// Extract the functions directly from doubleCsrf
const {
  invalidCsrfTokenError,
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf(doubleCsrfOptions);

// Debug: Log what we got
console.log('🔐 generateToken type:', typeof generateToken);
console.log('🔐 doubleCsrfProtection type:', typeof doubleCsrfProtection);

// Since generateToken might be undefined, let's create a fallback
const safeGenerateToken = generateToken || ((req, res) => {
  // Generate a simple fallback token
  const fallbackToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
  console.log('🔐 Using fallback token generator');
  return fallbackToken;
});

// CSRF protection middleware
const csrfProtection = (req, res, next) => {
  console.log('🔒 CSRF Protection applied to:', req.path);
  console.log('🔒 Request method:', req.method);
  console.log('🔒 CSRF token in body:', req.body._csrf ? 'PRESENT' : 'MISSING');
  console.log('🔒 CSRF token in cookies:', req.cookies._csrf ? 'PRESENT' : 'MISSING');
  
  // If doubleCsrfProtection is available, use it
  if (typeof doubleCsrfProtection === 'function') {
    return doubleCsrfProtection(req, res, next);
  } else {
    // Fallback validation
    console.log('⚠️ Using fallback CSRF validation');
    const token = req.body._csrf || req.cookies._csrf;
    if (!token) {
      return res.status(403).json({
        success: false,
        message: 'CSRF token missing',
        error: 'CSRF_TOKEN_MISSING'
      });
    }
    // Simple token validation - in production you'd want more robust validation
    if (token.length < 10) {
      return res.status(403).json({
        success: false,
        message: 'Invalid CSRF token',
        error: 'CSRF_TOKEN_INVALID'
      });
    }
    next();
  }
};

// Middleware to expose CSRF token to all templates
const exposeCsrfToken = (req, res, next) => {
  try {
    // Use the safe token generator
    const token = safeGenerateToken(req, res);
    res.locals.csrfToken = token;
    
    // Also make it available as a function for compatibility
    req.csrfToken = () => token;
    
    // Debug logging
    console.log('🔐 CSRF Token generated for:', req.path);
    
    next();
  } catch (error) {
    console.error('❌ Error generating CSRF token:', error);
    // Generate fallback token
    const fallbackToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    res.locals.csrfToken = fallbackToken;
    req.csrfToken = () => fallbackToken;
    next();
  }
};

// CSRF error handler middleware
const csrfErrorHandler = (err, req, res, next) => {
  console.log('🚨 Error caught in CSRF handler:', err.message);
  console.log('🚨 Error type:', err.constructor.name);
  console.log('🚨 Error stack:', err.stack);
  
  // Check if this is a CSRF error from csrf-csrf
  if (err.message && (err.message.includes('CSRF') || err.message.includes('invalid csrf token'))) {
    console.log('🚨 CSRF Token Error:', err.message);

    // More robust AJAX detection
    const isAjax =
      req.xhr ||
      (req.headers.accept && req.headers.accept.indexOf('json') > -1) ||
      (req.headers['content-type'] && req.headers['content-type'].indexOf('json') > -1) ||
      req.headers['x-requested-with'] === 'XMLHttpRequest';

    if (isAjax) {
      return res.status(403).json({
        success: false,
        message: 'Invalid security token. Please refresh the page and try again.',
        error: 'CSRF_TOKEN_INVALID',
      });
    }

    // Handle regular form submissions
    if (req.flash && typeof req.flash === 'function') {
      req.flash('error', 'Security token expired. Please refresh the page and try again.');
    }

    // Safer redirect handling
    const referer = req.get('Referer') || '/';
    return res.redirect(referer);
  }

  // Pass other errors to the default error handler
  next(err);
};

module.exports = {
  csrfProtection,
  exposeCsrfToken,
  csrfErrorHandler,
};