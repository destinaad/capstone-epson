import axios from 'axios';

export const API_BASE_URL =
  'https://capstone-epson-production.up.railway.app';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
