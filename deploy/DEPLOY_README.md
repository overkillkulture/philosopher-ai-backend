# Deployment Guide

## Quick Deploy to Railway

**Prerequisites:**
- Railway account created
- Railway CLI installed (`npm install -g @railway/cli`)
- Logged in (`railway login`)

### Option 1: Automated Script (Recommended)

**On Windows (PowerShell):**
```powershell
cd C:\Users\Darrick\100X_BACKUP\100X_DEPLOYMENT\BACKEND\philosopher-ai
bash deploy/railway-deploy.sh
```

**On Linux/Mac:**
```bash
cd /path/to/philosopher-ai
chmod +x deploy/railway-deploy.sh
./deploy/railway-deploy.sh
```

### Option 2: Manual Deployment

```bash
# 1. Link project (first time only)
railway link

# 2. Set environment variables
railway variables set ANTHROPIC_API_KEY=your-key-here
railway variables set JWT_SECRET=your-secret-here
railway variables set NODE_ENV=production

# 3. Deploy
railway up
```

### Option 3: GitHub Integration

1. Push code to GitHub
2. In Railway dashboard:
   - New Project → Deploy from GitHub
   - Select repository
   - Railway auto-deploys on every push

---

## Environment Variables

**Required:**
- `ANTHROPIC_API_KEY` - Your Claude API key
- `JWT_SECRET` - Secret for JWT signing (generate random string)
- `NODE_ENV` - Set to `production`

**Optional:**
- `PORT` - Railway sets this automatically
- `DATABASE_URL` - Railway sets this if you add PostgreSQL
- `STRIPE_SECRET_KEY` - If using payments
- `STRIPE_WEBHOOK_SECRET` - If using Stripe webhooks

---

## Post-Deployment Checklist

- [ ] Test health endpoint: `curl https://your-app.railway.app/api/health`
- [ ] Test registration: Create a test user
- [ ] Test login: Login with test credentials
- [ ] Check logs: `railway logs`
- [ ] Setup monitoring: Use health-check.js
- [ ] Configure domain (optional): Railway dashboard → Settings → Domains

---

## Troubleshooting

**Deployment fails:**
```bash
railway logs
```

**Database not connected:**
- Add PostgreSQL service in Railway
- Check DATABASE_URL is set
- Verify schema is created

**API key not working:**
```bash
railway variables
# Verify ANTHROPIC_API_KEY is set correctly
```

**Port issues:**
- Railway sets PORT automatically
- Don't hardcode port 3001 in production

---

## Rollback

If something goes wrong:

```bash
# View deployments
railway deployments

# Rollback to previous
railway rollback <deployment-id>
```

---

## Monitoring

**View logs:**
```bash
railway logs
railway logs --follow  # Live stream
```

**Run health monitor:**
```bash
API_URL=https://your-app.railway.app node monitoring/health-check.js
```

---

## Scaling

Railway auto-scales based on traffic.

**Manual scaling (if needed):**
- Railway dashboard → Settings → Resources
- Increase replicas, memory, CPU

---

Built during Autonomous Work Session #2 (2025-11-01)
