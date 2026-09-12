<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0f0c29,50:302b63,100:24243e&height=200&section=header&text=Aditya%20Uniyal&fontSize=60&fontColor=ffffff&fontAlignY=38&desc=Building%20the%20future%2C%20one%20commit%20at%20a%20time%20🚀&descAlignY=58&descSize=18&animation=fadeIn" width="100%"/>

</div>

<div align="center">

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&pause=1000&color=6C63FF&center=true&vCenter=true&random=false&width=600&lines=Hey+there!+I'm+Aditya+👋;B.Tech+CSE+%40+Graphic+Era+Hill+University;Full+Stack+%2B+AI%2FML+Explorer+🤖;Google+GEAR+Member+☁️;Building+cool+stuff+every+day+💻)](https://git.io/typing-svg)

</div>

---

# Aditya Uniyal — Developer Portfolio + AU_ Journal

This repository contains a premium, responsive portfolio website for Aditya Uniyal, deployed on **Netlify**, with:

- The original portfolio (HTML/CSS/vanilla JS, terminal-editorial aesthetic)
- Serverless email feedback via SendGrid (Netlify Function)
- **AU_ / JOURNAL** — a full blog/publication platform backed by **Supabase** (PostgreSQL + Auth + Storage)

---

## Part 1 — Portfolio (original site)

- Multi-page static site (HTML/CSS/JS)
- Responsive (mobile + desktop)
- Feedback form posts to a Netlify Function → SendGrid email
- Social handles + Connect page

### Security & spam protection
- Serverless function performs basic validation.
- Consider adding reCAPTCHA or additional spam filters for production.

---

## 🧑‍💻 About Me

```yaml
name: Aditya Uniyal
location: Dehradun, Uttarakhand 🏔️
university: Doon University
degree: B.Tech Computer Science Engineering (2026–2030)
```

---

## Part 2 — AU_ / JOURNAL

A complete publication platform that lives under the same domain:

| Route | Page |
|---|---|
| `/blog/` | Journal homepage — featured, trending, latest, from-the-builder, writers, newsletter |
| `/blog/post/[slug]/` | Article page — TOC, reading progress, like/bookmark/share, comments, related |
| `/blog/author/[username]/` | Author profile — articles, followers, socials, verification |
| `/blog/topic/[slug]/` | Topic page — trending + latest in a category, tag cloud |
| `/blog/series/[slug]/` | Series — ordered chapters + reading progress |
| `/blog/search/` | Search across articles/authors/tags with sort + filters |
| `/blog/login/` | Sign in / sign up (email+password, magic link) |
| `/blog/dashboard/` | Reader + contributor dashboard |
| `/blog/dashboard/editor/` | Markdown article editor with cover upload, tags, series, SEO |
| `/blog/admin/` | Admin console — review queue, users, comments, reports, categories, analytics |
| `/blog/sitemap.xml` | Generated server-side from published posts |
| `/blog/rss.xml` | RSS feed generated server-side |

### Backend: Supabase

The Journal is powered entirely by Supabase client-side APIs (no custom server):

- **PostgreSQL** — posts, profiles, comments, likes, bookmarks, follows, media, series, categories, tags, reports, newsletter, reading history, raw view log
- **Auth** — email/password + magic link; profiles auto-created on signup via DB trigger
- **Storage** — `journal-media` bucket for cover/inline images

Only the **public anon key** is used in frontend code. Service-role keys never belong in this repo.

### Setup — 15 minutes

#### 1. Create the Supabase project
1. Go to [supabase.com](https://supabase.com) → **New project** (any region close to your users).
2. Note the **Project URL** and **anon public key** (Settings → API).

#### 2. Run the SQL migrations
Open **SQL Editor** in Supabase and run these four files **in order** (each is idempotent):

1. `supabase/01-schema.sql` — tables, enums, indexes, triggers, seed categories
2. `supabase/02-rls.sql` — Row Level Security policies + the `journal-media` storage bucket + storage policies
3. `supabase/03-rpc.sql` — RPC functions: search, trending, admin analytics, moderation actions
4. `supabase/04-applications.sql` — contributor applications table + RLS + review RPC

#### 3. Configure the frontend keys
Copy `.env.example` to **`.env.local`** and fill it in:

```ini
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...
```

> ⚠️ Only the **anon** key goes here. It is safe to expose because RLS (step 2) restricts what it can do.
> Never place the service-role key, SendGrid key, or any server secret in frontend JavaScript.
> `.env.local` is git-ignored; Vite only exposes variables prefixed with `VITE_`.

#### 4. Claim the owner account
1. Visit `/blog/login/` → **Create account** using your admin email (or use a magic link).
2. In Supabase → SQL Editor, run:

```sql
update public.profiles
set role = 'owner', verified = true, username = 'adityauniyal'
where id = (select id from auth.users where email = 'YOUR_ADMIN_EMAIL');
```

3. Sign in at `/blog/admin/` — the control room is now live.

#### 5. (Optional) Netlify environment variables
For the server-generated **sitemap** and **RSS**, set in Netlify → Site settings → Environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

(The existing `SENDGRID_API_KEY`, `TO_EMAIL`, `FROM_EMAIL` for the feedback function are unchanged.)

Also add your Supabase auth redirect: Supabase → Authentication → URL Configuration → add `https://adityauniyal.is-a.dev/blog/login/` to **Redirect URLs** (use `http://localhost:8888/blog/login/` for `netlify dev`).

### Contributor publishing flow

```
New contributor:  DRAFT → SUBMITTED → REVIEW → APPROVED → PUBLISHED
Verified authors: may publish directly (bypass review)
Admin:            approve · reject · request changes (reject) · hide · archive · feature
```

To promote someone: `/blog/admin/` → **Users** → change role / verify.

### Roles

| Role | Powers |
|---|---|
| `reader` | read published posts, comment, like, bookmark, follow |
| `contributor` | + own drafts, submit for review, own media library, own analytics |
| `verified_author` | + direct publishing |
| `admin` | + all moderation, users, categories, feature posts, site-wide analytics |
| `owner` | full control |

Role is enforced by **Row Level Security** on the server — the client cannot escalate.

### Content format

Articles are stored as **structured Markdown** (never raw HTML) and rendered through a
sanitizing renderer (`js/journal-md.js`): every string is HTML-escaped before formatting
is applied, so `<script>` injection is impossible. Supported: headings, bold/italic,
links, lists, blockquotes (with `— attribution`), fenced code blocks with language label,
inline code, images with captions, tables, horizontal rules, and auto-embeds for
**YouTube** (`youtube.com/watch`, `youtu.be`, ` Shorts`) and **GitHub repo** links.

### Security summary

- RLS is **mandatory** on every table; policies live in `supabase/02-rls.sql`
- Storage uploads restricted to the owner's own `journal-media/<uid>/` folder, image MIME types only, 5 MB cap (enforced client-side and by bucket policy)
- Profile role changes blocked client-side; only `admin_set_user_role` RPC (server-checked) can change roles
- Newsletter + view-log inserts are the only anon-writable tables
- Search/trending/moderation run through SQL functions that re-check role server-side

### Local development

```bash
npm install
npx netlify-cli dev     # serves site + functions on http://localhost:8888
```

Or any static server for the site alone (functions will be stubs):

```bash
npx serve .
```

---

currently_learning:
  - Google Cloud & AI Agents (GEAR Program)
  - Full Stack Web Development
  - Data Structures & Algorithms
  - AI/ML Fundamentals

interests:
  - Building AI-powered web apps
  - Open Source Contribution
  - Cloud Computing
  - Problem Solving

fun_fact: "Earned 2 Google Cloud badges on Day 1 of learning! ⚡"

---

## 🏅 Certifications & Badges

<div align="center">

| 🏆 Badge | 🏢 Issuer | 📅 Date |
|----------|-----------|---------|
| ⚙️ **Gemini Enterprise Agent Ready (GEAR)** | Google | May 2026 |
| 🤖 **Introduction to AI Agents** | Google Cloud | May 2026 |
| 🧠 **Agent Fundamentals** | Google Cloud | May 2026 |
| 🟦 **AI Skills Yatra Participant** | Microsoft | 2026 |

</div>

---

## 🛠️ Tech Stack

<div align="center">

**Languages**

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![C](https://img.shields.io/badge/C-00599C?style=for-the-badge&logo=c&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

**Cloud & AI**

![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)
![Microsoft Azure](https://img.shields.io/badge/Microsoft_Azure-0089D6?style=for-the-badge&logo=microsoft-azure&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=google-gemini&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

**Tools & Platforms**

![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)
![VS Code](https://img.shields.io/badge/VS_Code-007ACC?style=for-the-badge&logo=visual-studio-code&logoColor=white)
![Kaggle](https://img.shields.io/badge/Kaggle-20BEFF?style=for-the-badge&logo=kaggle&logoColor=white)

</div>

---

## 📈 DSA Progress

<div align="center">

```
🧩 DSA Journey — Just Getting Started!

Arrays & Strings     ████████░░░░   Learning
Loops & Functions    ████████████   ✅ Done
Basic Math & Logic   ██████████░░   Strong
Sorting Algorithms   ████░░░░░░░░   In Progress
Recursion            ███░░░░░░░░░   Next Up
```

🎯 **Goal:** Solve 150+ problems on LeetCode by end of 2026

</div>

---

## 🌐 Active Programs & Communities

<div align="center">

| Program | Status |
|---------|--------|
| ⚙️ Google GEAR (Gemini Enterprise Agent Ready) | 🟢 Active Member |
| ☁️ Google Cloud Arcade Season 1 2026 | 🟢 Participating |
| 🟦 Microsoft AI Skills Yatra | 🟢 In Progress |
| 🎓 Microsoft Student Ambassador | 🟡 Joining Soon |

</div>

---

## 📊 GitHub Stats

<div align="center">

<img height="180em" src="https://github-readme-stats.vercel.app/api?username=AdityaUniyal&show_icons=true&theme=tokyonight&include_all_commits=true&count_private=true&hide_border=true&bg_color=0d1117"/>
<img height="180em" src="https://github-readme-stats.vercel.app/api/top-langs/?username=AdityaUniyal&layout=compact&langs_count=8&theme=tokyonight&hide_border=true&bg_color=0d1117"/>

</div>

<div align="center">

![GitHub Streak](https://github-readme-streak-stats.herokuapp.com/?user=AdityaUniyal&theme=tokyonight&hide_border=true&background=0d1117)

</div>

---

## 🎯 2026 Goals

- [ ] 🌐 Build and deploy my first Full Stack web app
- [ ] 🤖 Build an AI-powered project using Gemini API
- [ ] ☁️ Reach Trooper tier on Google Cloud Arcade (45 pts)
- [ ] 📜 Earn Azure AI Fundamentals (AI-900) certification
- [ ] 💼 Land my first tech internship
- [ ] 🧩 Solve 150+ DSA problems
- [ ] 🏅 Reach Beta milestone on Microsoft Student Ambassador

---

## 🤝 Connect With Me

<div align="center">

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/aditya-uniyal)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AdityaUniyal)
[![Google Cloud](https://img.shields.io/badge/Skills_Boost-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://cloudskillsboost.google)
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:your@email.com)

</div>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:24243e,50:302b63,100:0f0c29&height=120&section=footer&animation=fadeIn" width="100%"/>

**⭐ If you like my work, consider starring my repos!**

![Profile Views](https://komarev.com/ghpvc/?username=AdityaUniyal&color=6C63FF&style=for-the-badge&label=Profile+Views)

</div>

---

## License

Personal portfolio use only.
