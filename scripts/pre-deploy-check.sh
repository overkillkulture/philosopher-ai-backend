#!/bin/bash
# ================================================
# PRE-DEPLOYMENT CHECKLIST
# Run before deploying to production
# ================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

pass() { echo -e "${GREEN}✅ PASS:${NC} $1"; ((PASSED++)); }
fail() { echo -e "${RED}❌ FAIL:${NC} $1"; ((FAILED++)); }
warn() { echo -e "${YELLOW}⚠️  WARN:${NC} $1"; ((WARNINGS++)); }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 PRE-DEPLOYMENT CHECKLIST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Git status
echo "1. GIT STATUS"
if git diff --quiet 2>/dev/null; then
    pass "No uncommitted changes"
else
    fail "Uncommitted changes detected"
fi

if git diff --cached --quiet 2>/dev/null; then
    pass "No staged changes"
else
    fail "Staged changes not committed"
fi
echo ""

# 2. Dependencies
echo "2. DEPENDENCIES"
if [ -f "package-lock.json" ]; then
    pass "package-lock.json exists"
else
    fail "package-lock.json missing"
fi

if [ -d "node_modules" ]; then
    pass "node_modules installed"
else
    warn "node_modules not installed (run npm ci)"
fi
echo ""

# 3. Environment
echo "3. ENVIRONMENT FILES"
if [ -f ".env.production.example" ]; then
    pass ".env.production.example exists"
else
    warn ".env.production.example missing"
fi

if [ -f "railway.toml" ]; then
    pass "railway.toml exists"
else
    warn "railway.toml missing"
fi
echo ""

# 4. Security
echo "4. SECURITY"
if grep -q "JWT_SECRET" .env.production.example 2>/dev/null; then
    pass "JWT_SECRET documented"
else
    warn "JWT_SECRET not in example env"
fi

if [ -f ".gitignore" ] && grep -q "node_modules" .gitignore; then
    pass "node_modules in .gitignore"
else
    fail "node_modules not in .gitignore"
fi

if [ -f ".gitignore" ] && grep -q ".env" .gitignore; then
    pass ".env in .gitignore"
else
    fail ".env not in .gitignore"
fi
echo ""

# 5. Required files
echo "5. REQUIRED FILES"
for file in "server-production.js" "package.json" "Dockerfile"; do
    if [ -f "$file" ]; then
        pass "$file exists"
    else
        fail "$file missing"
    fi
done
echo ""

# 6. Console logs
echo "6. CODE QUALITY"
CONSOLE_COUNT=$(grep -r "console\.log" --include="*.js" --exclude-dir=node_modules --exclude-dir=test . 2>/dev/null | wc -l)
if [ "$CONSOLE_COUNT" -gt 20 ]; then
    warn "$CONSOLE_COUNT console.log statements (consider cleanup)"
elif [ "$CONSOLE_COUNT" -gt 0 ]; then
    pass "$CONSOLE_COUNT console.log statements (acceptable)"
else
    pass "No console.log statements"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC}   $FAILED"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ PRE-DEPLOY CHECK FAILED${NC}"
    echo "Fix all failures before deploying to production"
    exit 1
else
    echo -e "${GREEN}✅ PRE-DEPLOY CHECK PASSED${NC}"
    echo "Ready for deployment"
    exit 0
fi
