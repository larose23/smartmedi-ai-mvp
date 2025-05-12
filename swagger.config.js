module.exports = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SmartMedi AI API',
      version: '1.0.0',
      description: 'API documentation for SmartMedi AI',
    },
    servers: [
      {
        url: 'http://localhost:3009',
        description: 'Local server',
      },
    ],
  },
  apis: ['./app/api/**/*.ts', './lib/api/services/*.ts'], // Path to the API docs
}; 