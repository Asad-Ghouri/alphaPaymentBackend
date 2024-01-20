const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'My API',
      version: '1.0.0',
      description: 'My API Documentation',
    },
    servers: [
      {
        url: 'http://localhost:5000', // Adjust the port if your local server differs
        description: 'Local server',
      },
      {
        url: 'https://alpha-payment-backend.vercel.app', // Replace with your live server URL
        description: 'Live server',
      },
    ],
  },
  apis: ['./Router/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;