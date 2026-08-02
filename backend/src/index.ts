// External libraries
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRoutes } from './interfaces/api/ApiRoutes';
import { environmentRoutes } from './interfaces/environment/routes';

// Shared constants

// Shared types

// Hooks

// Services

// Components

// Styles

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);
app.use('/api', environmentRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
