# 🚀 Deployment Guide

**Ab koi login, database ya fee nahi.** Site kholo → PDF upload karo → printout lo.
Sara data (school profile, heads, pichle statements) user ke apne **browser** mein save hota hai.

Is liye sirf **Vercel** chahiye — Supabase ki zaroorat nahi, koi environment variable nahi.

---

## STEP 1: Code GitHub pe push karein

```bash
git add .
git commit -m "Open access: no login, browser storage"
git push
```

## STEP 2: Vercel

- Agar project pehle se Vercel pe hai: push karte hi auto-deploy ho jayega.
- **Purane environment variables** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
  ab use nahi hote — Vercel → Settings → Environment Variables se hata sakte hain.
- Naya project: Vercel → Add New → Project → repo import → Deploy (Framework: Next.js).

## STEP 3: Domain

Vercel → Project → Settings → Domains → `expenditure.edudesk.pk` add karein,
phir apne DNS mein Vercel ka diya hua CNAME record lagayein.

---

## STEP 4: Test

1. `expenditure.edudesk.pk` kholo — seedha **Dashboard** aayega (koi login nahi)
2. **New Monthly Statement** → Payroll Summary PDF upload karo (ya amounts haath se bharo)
3. **Generate Statement** → pehli dafa School Profile form aayega (ek dafa bharna hai)
4. Statement page pe **Print** → printer ya "Save as PDF"

---

## ⚠️ Yaad rakhein

- Data **sirf usi browser** mein hai. Browser history/data clear karne, incognito,
  ya doosre computer pe pichle statements nazar nahi aayenge.
- Pichla data na ho to **Previous Data** page pe pichle mahino ka kharcha bhar ke
  statement theek ban jata hai.

## ❓ Common Issues

- **Print window nahi khulti:** browser popup blocker mein site allow karein.
- **Build fail:** local mein `npm install` aur `npm run build` chala ke error dekhein.
