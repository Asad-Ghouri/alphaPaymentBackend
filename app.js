const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cors = require('cors');
const port = 5000;

dotenv.config({ path: './config.env' });
require('./DB/connection');

app.use(express.json());

// Define CORS options
const corsOptions = {
  origin: 'https://alpha-payment-frontend.vercel.app',
  methods: 'GET,PUT,POST,DELETE',
  credentials: true, // Enable credentials (cookies, HTTP authentication) if needed
  optionsSuccessStatus: 204, // Respond to preflight requests with a 204 status code
};

// Enable CORS for all routes using the defined options
app.use(cors(corsOptions));

app.use('/api', require('./Router/auth.js'));

app.listen(port, () => {
  console.log(`Server is running at localhost:${port}`);
});
