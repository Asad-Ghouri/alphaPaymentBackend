const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cors = require('cors');
const port = 5000;

dotenv.config({ path: './config.env' });
require('./DB/connection');

app.use(express.json());

// Enable CORS for all routes
app.use(cors());

app.use('/api', require('./Router/auth.js'));

app.listen(port, () => {
  console.log(`Server is running at localhost:${port}`);
});
