# 📊 Expenditure Statement Generator - SaaS

**KPK Government Schools** ke liye Monthly Reconciliation Statement generator.
Full SaaS - online, multi-user, ready to scale.

## 🌟 Features

- 🔐 **User Authentication** - Email/password signup & login
- 🏫 **School Profiles** - Multi-tenant (har user ka apna school)
- 📋 **Pre-loaded Standard Heads** - 16 KPK Education department heads
- ➕ **Custom Heads** - Apne heads add karein
- 📄 **Monthly Statement Generation** - Auto-calculate previous, total, saving, excess
- 🔄 **Multi-month Chaining** - Previous auto-fills from last month
- 📥 **PDF Generation** - Exact government format
- 🖨️ **Print Support** - Direct print
- 🔒 **Row-Level Security** - Tumhara data sirf tumhara hai

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (React, App Router)
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **PDF:** html2pdf.js (client-side)
- **Hosting:** Vercel
- **Deployment:** GitHub → Vercel auto-deploy

## 📦 Project Structure

```
expenditure-saas/
├── app/                          # Next.js pages
│   ├── page.js                  # Landing page
│   ├── login/                   # Login page
│   ├── signup/                  # Signup page
│   ├── dashboard/               # Dashboard
│   ├── setup/                   # School profile setup
│   ├── heads/                   # Budget heads management
│   ├── new-statement/           # Create statement
│   └── statement/[id]/          # View statement + PDF
├── components/                   # Shared components
│   └── Navigation.js
├── lib/                          # Helpers
│   ├── supabase/                # Supabase clients
│   └── utils.js                 # Calculation logic
├── supabase/
│   └── schema.sql               # Database schema
├── middleware.js                 # Auth protection
├── package.json
├── DEPLOY.md                     # Deployment guide
└── README.md
```

## 🚀 Quick Start

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your Supabase keys

# 3. Run dev server
npm run dev
```

Open http://localhost:3000

### Production Deployment

**See `DEPLOY.md` for complete step-by-step guide.**

Quick summary:
1. Push code to GitHub
2. Create Supabase project, run `supabase/schema.sql`
3. Deploy to Vercel with environment variables
4. Live URL in 5 minutes! 🎉

## 🎯 Roadmap

### ✅ v1 (Current) - MVP
- User authentication
- Single school per user
- Monthly statements
- PDF generation
- Multi-month chaining

### 🔜 v2 - Multi-User & Roles
- Multiple users per school
- Roles: Admin (HM), Editor (Clerk), Viewer
- Invitation system
- EMIS code validation

### 🔜 v3 - Premium Features
- Subscription billing (JazzCash, Stripe)
- Annual reports
- Bulk PDF generation
- Email statement directly to SDEO

### 🔜 v4 - Advanced
- Input PDF auto-extraction (Gazetted/Non-Gazetted)
- Multi-school for district offices
- API for integrations
- Mobile app (PWA)

## 💰 Pricing (Future)

- **Free Trial:** 3 months
- **Basic:** Rs. 800/month per school
- **Pro:** Rs. 1500/month (multi-user)
- **District:** Rs. 8000/month (10+ schools)

## 📝 License

MIT

## 👨‍💻 Author

Built by a clerk who got tired of doing this manually every month.

Yeh tool meri 10 saal ki frustration ka jawab hai. Aaj tumhari bhi ho.

**Contact:** [Your contact info]

---

**🚀 Ready to deploy? Check `DEPLOY.md` for the complete guide.**
