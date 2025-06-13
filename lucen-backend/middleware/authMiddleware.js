// lucen-backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!SUPABASE_JWT_SECRET) {
  throw new Error(
    "SUPABASE_JWT_SECRET is not defined. Please check your .env file in the backend."
  );
}

const authenticateToken = (req, res, next) => {
  // Get the token from the Authorization header, which is expected to be "Bearer TOKEN"
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    // If there's no token, send a 401 Unauthorized error
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  // Verify the token using your Supabase JWT secret
  jwt.verify(token, SUPABASE_JWT_SECRET, (err, decodedToken) => {
    if (err) {
      // If the token is invalid or expired, send a 403 Forbidden error
      console.error("JWT Verification Error:", err.message);
      return res
        .status(403)
        .json({ message: "Forbidden: Invalid or expired token" });
    }

    // If the token is valid, the decoded payload (user info) is attached to the request object
    req.user = decodedToken;

    // Move on to the next function in the chain (the actual route handler)
    next();
  });
};

module.exports = authenticateToken;
