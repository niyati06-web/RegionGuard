# RegionGuard Deployment Guide
## PS No. 23: Multi-Region Active-Passive Failover Controller

---

## 1. Deployment Architecture

RegionGuard is decoupled into a frontend static application and a backend Node.js WebSocket/REST server:

- **Frontend:** Deployed to **Vercel**, **Netlify**, or **Cloudflare Pages**.
- **Backend:** Deployed to **Render**, **Railway**, **Fly.io**, or **AWS ECS** (requires persistent Node.js process and WebSocket support).
- **Communication:** Frontend connects to the deployed backend URL via HTTPS/WSS.

---

## 2. Backend Deployment (Render / Railway)

### Step 1: Create a Web Service on Render
1. Push your repository to GitHub.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** &rarr; **Web Service**.
4. Connect your GitHub repository.
5. Configure settings:
   - **Name:** `regionguard-backend`
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
6. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `4000` (or leave default, Render sets `PORT` automatically)
   - `CORS_ORIGIN`: `https://your-frontend.vercel.app` (or `*` during initial testing)
   - `SIMULATION_TICK_MS`: `1000`
7. Click **Create Web Service**.
8. Note your public backend URL: `https://regionguard-backend.onrender.com`.
9. Verify health check: `https://regionguard-backend.onrender.com/api/health`.

---

## 3. Frontend Deployment (Vercel)

### Step 1: Import Project on Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** &rarr; **Project**.
3. Select your repository.
4. Set **Root Directory** to `client`.
5. Build settings will auto-detect Vite:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
6. Add Environment Variables:
   - `VITE_API_URL`: `https://regionguard-backend.onrender.com`
   - `VITE_SOCKET_URL`: `https://regionguard-backend.onrender.com`
7. Click **Deploy**.
8. Your frontend will be live at `https://your-project.vercel.app`.

---

## 4. Local Production Preview

To test the production build locally before deploying:

```powershell
# 1. Build both client and server
npm run build

# 2. Start backend server
npm run start --prefix server

# 3. In another terminal, preview the client
npm run preview --prefix client
```

Navigate to `http://localhost:4173` to test the production bundle!
