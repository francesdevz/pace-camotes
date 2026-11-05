# PACE Camotes website

Club website with online court booking and a staff dashboard.

- **Website** (`/`): the club pages and a **court calendar laid out like the club's booking sheet**: dates across, hours down, colored Available / Open Play / Booked / Pencil booked. Guests tap an open hour and send a request; it shows as *pencil booked* until staff confirm. Their bookings stay visible on their device, and they can cancel.
- **Dashboard** (`/admin`): password protected. A week calendar with names in each slot, like the sheet. Tap an empty hour to add a booking or an **Open Play** block (one or several hours at once). Confirm or decline pencil bookings, keep staff notes, search, export CSV.

It runs on **Vercel** (website + serverless API) with a **Supabase** Postgres database (free tier is enough to start).

```
public/            the website (index.html), dashboard (admin.html), css, js, logo
api/               serverless API routes
  availability.js    GET  open and full hours (public, no personal data)
  bookings.js        POST guest booking request
  my-bookings.js     POST guest checks their own requests
  cancel.js          POST guest cancels their own booking
  admin/login.js     POST sign in · DELETE sign out
  admin/bookings.js  GET list · POST add · PATCH approve/decline/cancel/reopen/note · DELETE
  _lib/              settings, database access, sign-in, helpers
supabase/schema.sql  the database table
vercel.json          Vercel settings
.env.example         the settings Vercel needs
```

---

## Setup (about 15 minutes)

### 1. Create the database (Supabase)
1. Sign up at **supabase.com** → **New project**. Pick the Singapore region (closest to Cebu) and save the database password somewhere safe.
2. Open **SQL Editor** → **New query**, paste everything in `supabase/schema.sql`, click **Run**. You should see "Success".
3. Open **Project Settings → API** (on newer dashboards: **API Keys** / **Data API**) and copy:
   - the **Project URL** (looks like `https://abcd1234.supabase.co`)
   - the **service_role** key (secret; newer projects call it a *secret key*, starting `sb_secret_…`)

   The service key bypasses all security, so never put it in the website files or share it. It only goes into Vercel's settings.

### 2. Put the code on GitHub
Create a new repository and upload this folder (everything except `node_modules`).

### 3. Deploy on Vercel
1. **vercel.com → Add New → Project →** import the repository.
2. Framework preset: **Other**. Leave Build Command empty. (Output directory `public` is already set in `vercel.json`.)
3. Before clicking Deploy, open **Environment Variables** and add:

| Name | Value |
|---|---|
| `SUPABASE_URL` | your Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | your service_role / secret key |
| `ADMIN_PASSWORD` | the password staff will use at `/admin` (make it long) |
| `ADMIN_SESSION_SECRET` | any random text of 32+ characters (e.g. run `openssl rand -base64 48`, or use a password generator) |

4. **Deploy.** Then open `https://your-site.vercel.app/admin` and sign in.

Command-line alternative: `npm i -g vercel`, then `vercel` in this folder, add the four variables with `vercel env add`, and `vercel --prod`.

> Vercel's free **Hobby** plan is for non-commercial use. A business site should use **Pro**. Check Vercel's current terms.
> Supabase's free tier pauses projects that go unused for about a week. Once real bookings depend on it, consider a paid plan.

---

## Club settings
Optional environment variables (add in Vercel, then redeploy):

| Name | Default | What it does |
|---|---|---|
| `COURTS` | `1` | courts that can be booked at the same hour |
| `BOOKING_TIMES` | `09:00,10:00,12:00,…,23:00` | bookable start times, comma separated (60-min sessions). The default matches the club sheet: 9:00AM–12:00MN, no 11:00AM slot. Add `11:00` to open that hour. |
| `BOOKING_DAYS` | `14` | how many days ahead guests can book |
| `MAX_ACTIVE_PER_CONTACT` | `3` | upcoming requests one contact may hold (anti-spam) |

All dates and times follow the club's clock (Asia/Manila).

## Before going live
- **Placeholders:** the address, contact number and hours from the club sheet are already in. Search `public/index.html` for `[` to fill in prices, schedules, the menu and amenities. Membership tiers are suggestions; edit or remove them.
- **Facebook link:** replace the `facebook.com/search…` links with your page's address.
- **Photos:** the artwork is drawn in code. To use a photo, put it in `public/assets/` and replace a block like `<div class="art" data-art="pSport" …></div>` with
  `<div class="art"><img src="/assets/your-photo.jpg" alt="Describe the photo" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></div>`.

## How bookings work
- Same colors as the club sheet: **Available** (white), **Open Play** (purple), **Booked** (red), **Pencil booked** (yellow).
- A guest request is **Pencil booked** and holds the hour so nobody else can request it. Staff **Confirm** it (→ Booked) or **Decline** it (→ the hour opens again).
- **Open Play** hours are added by staff. Guests see them in purple and are told to just drop in; they can't be booked privately.
- The database itself refuses a second confirmed booking for the same court and hour, so double booking cannot happen even if two staff click at once.
- Guests see status changes when they reopen the page on the same device and browser. They are not notified by SMS or email. Confirming on Messenger is still a good habit.
- A guest who cancels frees the court immediately. Website requests can't be deleted (they're your records), but staff-entered bookings can.
- **Signing out everyone:** sessions last 12 hours. To end all sessions at once (for example after changing the password), change `ADMIN_SESSION_SECRET` and redeploy.

## Run locally (optional)
`npm i -g vercel`, `npm install`, create `.env.local` from `.env.example`, then `vercel dev` and open http://localhost:3000.
