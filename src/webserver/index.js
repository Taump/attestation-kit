const fastify = require('fastify');
const CORS = require('@fastify/cors');
const fastifySensible = require('@fastify/sensible');

// Controllers
const notFoundController = require('./controllers/notFoundController');

// Create instance
const fastifyInstance = fastify({ logger: false });

// CORS
fastifyInstance.register(CORS);

// Register error generator
fastifyInstance.register(fastifySensible);

// Register routes
fastifyInstance.setNotFoundHandler(notFoundController);

// Run the server
module.exports = fastifyInstance;