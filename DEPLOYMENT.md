# Deployment Guide

## Backend on Render
1. Create a new Web Service in Render.
2. Connect this repository.
3. Use the following build/start settings:
   - Build Command: npm install
   - Start Command: node server/index.js
4. Add environment variables:
   - PORT=10000
   - PROVIDER_API_URL=https://5sim.net/v1
   - PROVIDER_API_KEY=your_key_here
   - USE_REAL_PROVIDER=true
   - FRONTEND_URL=https://your-vercel-app.vercel.app
5. Deploy.

## Frontend on Vercel
1. Create a new Vercel project from this repository.
2. Set the build command to npm run build.
3. Set the output directory to dist.
4. Add environment variable:
   - VITE_API_URL=https://your-render-app.onrender.com/api
5. Deploy.

## Notes
- In development, the frontend uses Vite proxying to the local backend.
- In production, the frontend calls the deployed Render backend via VITE_API_URL.
