# 🚀 Deployment Guide - Attendance Analyzer

## Quick Deploy to Vercel

### Step 1: Commit Your Code

```bash
cd C:\Users\gener\Downloads\attendance\attendance-analyzer
git add .
git commit -m "Ready for deployment"
```

### Step 2: Push to GitHub

```bash
# Create a new repository on GitHub first, then:
git remote add origin https://github.com/visheshsanghvi112/attendance-analyzer.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your `attendance-analyzer` repository
4. Vercel will auto-detect Next.js - no configuration needed!
5. Click **Deploy**

### Step 4: Done! 🎉

Your app will be live at `https://attendance-analyzer-xxxxx.vercel.app`

---

## Why It Works on Vercel

✅ **CSV files are in `public/data/`** - Static files are automatically served  
✅ **API route at `/api/company-data`** - Serves CSV files on-demand  
✅ **No environment variables needed** - Everything is self-contained  
✅ **Automatic HTTPS** - Secure by default  
✅ **Global CDN** - Fast worldwide access  

---

## Troubleshooting

### Issue: CSV dropdown doesn't load data

**Solution:** Make sure all CSV files are in `public/data/` and the API route exists at `app/api/company-data/route.ts`

### Issue: Build fails on Vercel

**Solution:** Check that:
- All dependencies are in `package.json`
- TypeScript has no errors: `npm run build` locally first
- Node.js version matches (18+)

### Issue: File upload works locally but not on Vercel

**Solution:** The dropdown presets use the API route - manually uploaded files always work! This is expected behavior for the company dropdown.

---

## Local Testing

Before deploying, test locally:

```bash
# Build production version
npm run build

# Start production server
npm start

# Visit http://localhost:3000
```

If it works locally, it will work on Vercel! ✨

---

## Updating Company Data

To add new companies:

1. Add CSV file to `public/data/`
2. Update the mapping in `app/api/company-data/route.ts`:

```typescript
const COMPANY_FILES: Record<string, string> = {
  'Your Company': 'Monthly Raw Timesheet - Your Company - 2025.11.01 to 2025.11.30.csv',
  // ... existing companies
};
```

3. Update the dropdown in `app/page.tsx`:

```tsx
<option value="Your Company">Your Company</option>
```

4. Commit and push - Vercel auto-deploys! 🚀
