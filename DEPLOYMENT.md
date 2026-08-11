# TooPrep — Production Deployment Guide

Deploying **TooPrep** requires two steps:
1. Deploy the Node.js/Express Backend to **Render**
2. Deploy the React/Vite Frontend to **Vercel**

---

## Step 1: Deploy Backend to Render

1. Push your project repository to GitHub.
2. Sign in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Web Service**.
4. Select your `tooprep` GitHub repository.
5. Configure the service settings:
   - **Name**: `tooprep-backend` (or your choice)
   - **Region**: Oregon (or closest to your users)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`

6. Add **Environment Variables** in Render:
   - `SUPABASE_URL`: `https://uzdyhdbjncwuatgqjpsi.supabase.co`
   - `SUPABASE_ANON_KEY`: `<your-anon-key>`
   - `SUPABASE_SERVICE_ROLE_KEY`: `<your-service-role-key>`
   - `CLIENT_URL`: `https://your-app-name.vercel.app` *(update after Step 2)*
   - `PORT`: `3001`

7. Click **Create Web Service**.
8. Once deployed, copy your backend URL (e.g. `https://tooprep-backend.onrender.com`).

---

## Step 2: Deploy Frontend to Vercel

1. Sign in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your `tooprep` GitHub repository.
4. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `client`

5. Expand **Environment Variables** and add:
   - `VITE_SUPABASE_URL`: `https://uzdyhdbjncwuatgqjpsi.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `<your-anon-key>`
   - `VITE_API_URL`: `https://tooprep-backend.onrender.com` *(your Render backend URL)*

6. Click **Deploy**.
7. Vercel will build and assign your production URL (e.g. `https://tooprep.vercel.app`).

---

## Step 3: Final Configuration

1. **Update Render CORS**:
   - Go back to Render → `tooprep-backend` → **Environment**.
   - Set `CLIENT_URL` = `https://tooprep.vercel.app` (your actual Vercel domain).
   - Save changes (Render will auto-redeploy).

2. **Update Supabase Auth Redirect URL**:
   - Open [Supabase Dashboard](https://supabase.com/dashboard).
   - Navigate to **Authentication** → **URL Configuration**.
   - Add `https://tooprep.vercel.app` under **Redirect URLs**.
   - Set **Site URL** to `https://tooprep.vercel.app`.

---

## Verification Checklist

- [ ] Backend health check responds at `https://tooprep-backend.onrender.com/api/health`
- [ ] Vercel frontend loads smoothly without CORS errors
- [ ] User sign up / sign in works with Supabase Auth
- [ ] Practice sessions and Timed Evaluations record attempts correctly
