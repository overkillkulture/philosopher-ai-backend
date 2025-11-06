# 📄 DEPLOYMENT PAPER 3: EMERGENCY PROCEDURES

**For:** When Things Go Wrong
**Purpose:** Quick fixes for common production issues
**Time:** 2-10 minutes per issue

---

## 🚨 EMERGENCY RESPONSE GUIDE

### **RED ALERT: Website is Down**

**Symptoms:** Users can't access site, 502/503 errors

**Quick Fix (2 minutes):**
1. Check Railway dashboard: https://railway.app/project/94d6e77f-f31f-49a1-837f-c1989b88bfa1
2. Look for service status
3. If "Crashed" - click "Redeploy"
4. Wait 2-3 minutes
5. Test: https://cloud-funnel-production.up.railway.app/api/v1/health

**If still down:**
- Check Railway logs for errors
- Check DATABASE_URL is set correctly
- Verify all environment variables present
- Contact AI: "Backend is down, help debug"

---

### **RED ALERT: Database Connection Lost**

**Symptoms:** "Database connection failed", can't login/register

**Quick Fix (3 minutes):**
1. Railway dashboard → Postgres service
2. Check if Postgres is running
3. If stopped → Click "Restart"
4. If running → Check DATABASE_URL in backend variables
5. Verify DATABASE_URL format: `postgresql://user:pass@host:port/db`

**If still failing:**
- Railway → Postgres → Connect
- Copy DATABASE_URL
- Paste into backend service variables
- Redeploy backend

---

### **ORANGE ALERT: Users Can't Register**

**Symptoms:** Registration form shows errors

**Quick Fix (5 minutes):**
1. Open browser console (F12)
2. Look for error messages
3. Common issues:
   - **CORS Error:** Add frontend URL to ALLOWED_ORIGINS
   - **"Email exists":** User already registered, try login
   - **"Password too short":** Must be 8+ characters
   - **"Invalid email":** Check email format

**Fix CORS:**
```
Railway → cloud-funnel → Variables
ALLOWED_ORIGINS=https://your-frontend.netlify.app,https://cloud-funnel-production.up.railway.app
Redeploy
```

---

### **ORANGE ALERT: Users Can't Login**

**Symptoms:** "Invalid credentials" even with correct password

**Diagnostic (2 minutes):**
1. Verify user exists: Check database
2. Try "Forgot Password" flow (if implemented)
3. Create new test account - does that work?
4. Check JWT_SECRET hasn't changed

**Common Causes:**
- User typing wrong password (most common!)
- User registered on different system (local vs production)
- Database was reset (user needs to re-register)
- Backend crashed and restarted (try again)

**Fix:**
- Have user try "Forgot Password"
- Or: Register new account
- Or: Reset database and notify all users

---

### **YELLOW ALERT: Slow Performance**

**Symptoms:** Pages load slowly, API takes >3 seconds

**Quick Diagnosis:**
1. Check Railway metrics: Dashboard → cloud-funnel → Metrics
2. Look for:
   - CPU usage >80%
   - Memory usage >80%
   - High database query time

**Quick Fixes:**
- **High CPU:** Upgrade Railway plan (currently free tier)
- **High Memory:** Check for memory leaks, restart service
- **Slow queries:** Add database indexes
- **Too many requests:** Add rate limiting

**Temporary Fix:**
```
Railway → cloud-funnel → Restart
# Clears memory, restarts fresh
```

---

### **YELLOW ALERT: Error Logs Filling Up**

**Symptoms:** Lots of errors in Railway logs

**Triage Process:**
1. Railway → cloud-funnel → Deployments → Latest → Logs
2. Look for patterns:
   - Same error repeating? Fix root cause
   - Different errors? May be user errors (wrong passwords, etc.)
   - Database errors? Check connection
   - API errors? Check ANTHROPIC_API_KEY

**Common Errors:**
```
"ECONNREFUSED" → Database not connected
"401 Unauthorized" → JWT issue or user not logged in
"CORS" → Frontend URL not in ALLOWED_ORIGINS
"Out of memory" → Need to restart or upgrade plan
```

---

### **GREEN STATUS: Everything Working But...**

**Symptoms:** Minor issues, not affecting most users

**Can Wait Until Tomorrow:**
- UI looks slightly off on one browser
- One user reports confusion (not a bug)
- Feature request from user
- Typo in text

**Handle These:**
- Create todo list
- Fix during normal hours
- Not emergencies

---

## 📞 WHO TO CONTACT

**Website Down (Critical):**
1. Check Railway status: https://status.railway.app
2. If Railway is up, contact AI: "RED ALERT: Website down"
3. AI will diagnose and fix

**Database Issues:**
1. Check Postgres status in Railway
2. Try restart
3. If persists: Contact AI: "Database connection failed"

**User Reports Bug:**
1. Ask user for: What they were doing, error message, screenshot
2. Try to reproduce the bug yourself
3. If can reproduce: Contact AI with details
4. If can't reproduce: Might be user error

**Not Sure:**
- Post in BULLETIN_BOARD.md
- Contact AI: "Need help with [issue]"
- AI will triage and respond

---

## 🔧 EMERGENCY COMMAND REFERENCE

**Restart Backend:**
```
Railway Dashboard → cloud-funnel → Settings → Restart
```

**Restart Database:**
```
Railway Dashboard → Postgres → Settings → Restart
```

**View Logs:**
```
Railway Dashboard → cloud-funnel → Deployments → Latest → Logs
```

**Rollback to Previous Version:**
```
Railway Dashboard → cloud-funnel → Deployments → Previous deployment → Redeploy
```

**Check Database Data:**
```
Railway Dashboard → Postgres → Data → Browse tables
```

---

## 🚦 SEVERITY LEVELS

**🔴 RED (Fix Immediately - Within 5 minutes):**
- Website completely down
- Database down
- No users can access anything
- Security breach detected

**🟠 ORANGE (Fix Within 1 Hour):**
- Some users can't register/login
- API errors affecting functionality
- Major feature broken
- Data loss possible

**🟡 YELLOW (Fix Within 24 Hours):**
- Slow performance
- Minor bugs
- Error logs building up
- Non-critical feature broken

**🟢 GREEN (Fix When Convenient):**
- UI tweaks
- Feature requests
- Minor improvements
- Nice-to-haves

---

## 📋 INCIDENT RESPONSE CHECKLIST

When emergency occurs:

**Step 1: Assess (1 minute)**
- [ ] What's broken?
- [ ] How many users affected?
- [ ] What's the error message?
- [ ] When did it start?

**Step 2: Triage (1 minute)**
- [ ] 🔴 RED - Drop everything, fix now
- [ ] 🟠 ORANGE - Fix within hour
- [ ] 🟡 YELLOW - Fix today
- [ ] 🟢 GREEN - Add to backlog

**Step 3: Quick Fix (5 minutes)**
- [ ] Try restart
- [ ] Check environment variables
- [ ] Review recent changes
- [ ] Check Railway status

**Step 4: Contact Help (if needed)**
- [ ] Post to BULLETIN_BOARD.md
- [ ] Contact AI with details
- [ ] Wait for diagnosis

**Step 5: Verify Fix (2 minutes)**
- [ ] Test the broken functionality
- [ ] Verify it works now
- [ ] Monitor for 10 minutes
- [ ] Document what happened

**Step 6: Prevent Recurrence**
- [ ] What caused it?
- [ ] How to prevent?
- [ ] Update procedures
- [ ] Add monitoring

---

## 🎯 PREVENTION IS BETTER THAN CURE

**Daily Checks (5 minutes):**
- [ ] Visit website - does it load?
- [ ] Try to login - does it work?
- [ ] Check Railway logs - any errors?
- [ ] Check Railway metrics - normal?

**Weekly Checks (10 minutes):**
- [ ] Review all error logs
- [ ] Check database size
- [ ] Verify backups exist
- [ ] Test emergency procedures

**Monthly Checks (30 minutes):**
- [ ] Security audit
- [ ] Performance review
- [ ] Update dependencies
- [ ] Review incident log

---

## 📊 INCIDENT LOG TEMPLATE

**When incident occurs, document:**

```
DATE: 2025-11-05
TIME: 6:00 PM
SEVERITY: 🔴 RED
ISSUE: Website returned 502 errors
AFFECTED USERS: All users (100%)
CAUSE: Railway deployment failed
FIX: Redeployed from dashboard
TIME TO FIX: 3 minutes
PREVENTION: Add deployment health checks
```

**Keep log in:** `C:\Users\Darrick\INCIDENT_LOG.md`

---

## 🆘 LAST RESORT

**If nothing works:**

1. **Rollback everything:**
   - Railway → Previous deployment
   - Netlify → Previous deployment
   - Revert to last known good state

2. **Maintenance mode:**
   - Replace frontend with simple "Under Maintenance" page
   - Fix issue without time pressure
   - Bring back online when ready

3. **Contact Commander:**
   - Explain situation
   - Get approval for drastic action
   - Execute plan

---

**EMERGENCY PREPAREDNESS:** ✅ READY

Remember: Most "emergencies" fix with a simple restart. Don't panic! 🚨⚡

**Next Read:** DEPLOYMENT_PAPER_4_BETA_USER_INVITATION.md
