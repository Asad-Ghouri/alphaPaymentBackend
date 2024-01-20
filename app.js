require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

require('./DB/connection');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {explorer: true}));
app.use(express.json());
app.use(cors());

// Swagger setup


app.use('/api', require('./Router/auth.js'));
app.listen(process.env.PORT, () => {
  console.log(`Server is running at localhost:${process.env.PORT}`);
});
