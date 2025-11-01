# 🚂 RAILWAY DEPLOYMENT GUIDE - PHILOSOPHER AI BACKEND

## 🔧 Built by C1 Mechanic Engine

This guide will deploy your Philosopher AI backend to Railway in **under 10 minutes**.

---

## 📋 PREREQUISITES

1. **GitHub Account** (free)
2. **Railway Account** (free) - [railway.app](https://railway.app)
3. **Anthropic API Key** (you already have this)

---

## 🚀 DEPLOYMENT STEPS

### STEP 1: Prepare Backend for Git

```bash
cd C:\Users\dwrek\100X_DEPLOYMENT\BACKEND\philosopher-ai

# Initialize git (if not already)
git init

# Create .gitignore
echo "node_modules/
*.db
.env
.DS_Store" > .gitignore

# Add all files
git add .
git commit -m "Initial commit - Philosopher AI backend"
```

### STEP 2: Push to GitHub

**Option A - Create New Repo via GitHub CLI (if installed):**
```bash
gh repo create philosopher-ai-backend --public --source=. --remote=origin --push
```

**Option B - Create Repo Manually:**
1. Go to https://github.com/new
2. Name: `philosopher-ai-backend`
3. Make it **Private** (recommended since API keys will be in env vars)
4. Don't initialize with README
5. Copy the git commands shown and run them

```bash
git remote add origin https://github.com/YOUR_USERNAME/philosopher-ai-backend.git
git branch -M main
git push -u origin main
```

### STEP 3: Deploy to Railway

1. **Go to https://railway.app** and sign up/login
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose `philosopher-ai-backend`
5. Railway will auto-detect it's a Node.js app

### STEP 4: Add PostgreSQL Database

1. In your Railway project dashboard, click **"New"** → **"Database"** → **"PostgreSQL"**
2. Railway creates the database and automatically adds `DATABASE_URL` to your environment

### STEP 5: Set Environment Variables

In your Railway project, go to **Variables** tab and add:

```
NODE_ENV=production
PORT=3001

ANTHROPIC_API_KEY=sk-ant-api03-YOUR_API_KEY_HERE

CLAUDE_MODEL=claude-3-5-sonnet-20241022
CLAUDE_MAX_TOKENS=4096

JWT_SECRET=consciousness_revolution_production_secret_$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d

BCRYPT_ROUNDS=12

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
QUESTION_RATE_LIMIT_WINDOW_MS=60000
QUESTION_RATE_LIMIT_MAX=10

PLATFORM_VERSION=1.0.0
PLATFORM_BUILD_NUMBER=1

ALLOWED_ORIGINS=https://verdant-tulumba-fa2a5a.netlify.app,https://consciousn essrevolution.io,http://localhost:3000

FRONTEND_URL=https://verdant-tulumba-fa2a5a.netlify.app

# Stripe (add when ready)
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# STRIPE_PRICE_STUDENT=price_...
# STRIPE_PRICE_TEACHER=price_...
# STRIPE_PRICE_PHILOSOPHER=price_...
```

**IMPORTANT:** Railway automatically provides `DATABASE_URL` for PostgreSQL - you don't need to add it!

### STEP 6: Initialize Database Schema

Once deployed, open Railway's **Shell** for your service and run:

```bash
# Install PostgreSQL client if needed
apt-get update && apt-get install -y postgresql-client

# Run schema
psql $DATABASE_URL -f database-schema.sql
```

**OR** if you have psql locally:
```bash
# Get DATABASE_URL from Railway variables
psql "postgresql://postgres:..." -f database-schema.sql
```

### STEP 7: Get Your Production URL

1. In Railway project, go to **Settings** → **Domains**
2. Click **"Generate Domain"**
3. You'll get something like: `https://philosopher-ai-backend-production-xxxx.up.railway.app`
4. Copy this URL!

---

## ✅ VERIFY DEPLOYMENT

Test the health endpoint:
```bash
curl https://YOUR-RAILWAY-URL.up.railway.app/api/health
```

Should return:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "buildNumber": 1,
  "database": "postgresql",
  "timestamp": "2025-10-11T..."
}
```

---

## 📝 UPDATE FRONTEND

Now update your frontend to use the production URL:

**File:** `C:\Users\dwrek\100X_DEPLOYMENT\PLATFORM\philosopher-ai-connected.html`

**Change:**
```javascript
const API_URL = 'http://localhost:3001';
```

**To:**
```javascript
const API_URL = 'https://YOUR-RAILWAY-URL.up.railway.app';
```

---

## 🔄 FUTURE UPDATES

Whenever you update the backend:

```bash
cd C:\Users\dwrek\100X_DEPLOYMENT\BACKEND\philosopher-ai
git add .
git commit -m "Update: description of changes"
git push
```

Railway automatically redeploys on push! 🚀

---

## 💰 COST

**Free Tier:**
- $5/month of free credits
- Should cover light development/testing
- Sleeps after inactivity

**Hobby Plan ($5/month):**
- No sleep
- More resources
- Perfect for production

---

## 🐛 DEBUGGING

### View Logs:
Railway dashboard → **Deployments** → Click latest → **View Logs**

### Common Issues:

**Database connection fails:**
- Check `DATABASE_URL` is set (Railway does this automatically)
- Verify schema was initialized

**API Key errors:**
- Double-check `ANTHROPIC_API_KEY` in variables
- Make sure no extra spaces

**CORS errors:**
- Update `ALLOWED_ORIGINS` to include your frontend URL

**Port issues:**
- Railway automatically uses `PORT` env var
- Don't hardcode port 3001 in deployment

---

## 🎯 QUICK COMMANDS

```bash
# View logs
railway logs

# Open shell
railway run bash

# Link to project (run in backend directory)
railway link

# Deploy manually
railway up
```

---

## 🔧 C1 MECHANIC NOTES

**What Railway Does Automatically:**
✅ Detects Node.js and runs `npm install`
✅ Runs `npm start` to start server
✅ Provides PostgreSQL with `DATABASE_URL`
✅ Generates HTTPS domain
✅ Auto-redeploys on git push
✅ Provides logs and monitoring

**What YOU Need to Do:**
1. Push code to GitHub
2. Connect Railway to GitHub repo
3. Add environment variables
4. Initialize database schema
5. Update frontend API_URL

**Estimated Time:** 10-15 minutes for first deployment

---

## 🆘 NEED HELP?

If deployment fails:
1. Check Railway logs for errors
2. Verify all environment variables are set
3. Make sure database schema is initialized
4. Test locally first: `npm run test:sqlite`

---

**🔧 C1 MECHANIC GUARANTEE: This guide builds a production-ready backend. Follow steps exactly and it WILL work!** ⚡
