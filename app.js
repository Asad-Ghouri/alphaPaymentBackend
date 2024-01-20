require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');

const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerDefinition = require('./swaggerDef');

require('./DB/connection');
app.use(express.json());
app.use(cors());

const swaggerOptions = {
  swaggerDefinition,
  apis: ['./Router/*.js'], // Path to the API docs
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));


app.use('/api', require('./Router/auth.js'));
app.listen(process.env.PORT, () => {
  console.log(`Server is running at localhost:${process.env.PORT}`);
});
