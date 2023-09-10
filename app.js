require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
require('./DB/connection');
app.use(express.json());


app.use(cors());
app.use('/api', require('./Router/auth.js'));
app.listen(process.env.PORT, () => {
  console.log(`Server is running at localhost:${process.env.PORT}`);
});
