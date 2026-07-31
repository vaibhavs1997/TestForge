// External libraries
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
