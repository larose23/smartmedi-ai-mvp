const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerConfig = require('./swagger.config');

const app = express();
const swaggerSpec = swaggerJSDoc(swaggerConfig);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => {
  res.send('<h2>SmartMedi AI API Docs</h2><p>Visit <a href="/api-docs">/api-docs</a> for Swagger UI.</p>');
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
}); 