// src/app.js
import express from 'express';
import authRoutes from './routes/auth.js';
import protectedRoutes from './routes/protected.js';
import errorHandler  from './middleware/errorHandler.js';
import logger from './utils/logger.js';
const app = express();

app.use(express.json());

app.use((req, res, next) => {
  logger.debug({
    message: 'Route',
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    query: req.query,
  });

  next();
})

app.use('/auth', authRoutes);
app.use('/protected', protectedRoutes);

app.get('/', (req, res) => res.json({ message: 'API OK' }));


app.get('/healthCheck',(req, res, next)=>{
    res.send({success:1})
});

app.use(errorHandler);

app.use((req, res)=>{
  res.status(400).send({message:"check end point."})
})

export default app;
