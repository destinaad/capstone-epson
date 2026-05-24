import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || 'capstone-epson-production.up.railway.app';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});
