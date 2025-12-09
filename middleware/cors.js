// middleware/cors.js
const cors = require('cors');

const corsOptions = {
  origin: ['http://localhost:8080',"https://juris-lpo-home-next.vercel.app", 'http://localhost:8081','http://localhost:3000', 'https://juris-dash-v2.vercel.app', 'https://juris-panel-suite.vercel.app' ],
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: ['Content-Type', 'Authorization'], // 👈 Important line
};

module.exports = cors(corsOptions);
