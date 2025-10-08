// middleware/cors.js
const cors = require('cors');

const corsOptions = {
  origin: ['http://localhost:8080', 'http://localhost:8081'],
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = cors(corsOptions);
