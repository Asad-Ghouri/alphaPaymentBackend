// swaggerDef.js
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
      title: 'Express API',
      version: '1.0.0',
      description: 'API Documentation',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local server',
      },
      {
        url: 'https://alpha-payment-backend.vercel.app',
        description: 'Production Server',
      },
    ],
  };
  
  module.exports = swaggerDefinition;
  