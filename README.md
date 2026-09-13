# Guidance Marketplace — Phase 1 MVP

## Vision

Guidance Marketplace helps people in India move forward when an important
decision is not yet clear. We connect clients with independent Guides who
offer practical perspective, relevant experience, and thoughtful conversation
across career decisions and personal finance.

We are building for the space between searching the internet and hiring a
traditional consultant: a human, accessible, and transparent way to think
through what comes next. Clients keep ownership of their decisions. Guides
share context and experience without promising certainty. The marketplace
creates the structure, trust signals, and clear expectations that make those
conversations useful for real Indian lives, from a first salary and a job
switch to family responsibilities and long-term financial goals.

### Our principles

- **Human first:** meaningful decisions deserve more than generic answers.
- **Practical by design:** every conversation should help clarify a possible next step.
- **Transparent by default:** profiles, rates, boundaries, and expectations are visible.
- **Independent perspective:** Guides share their experience; clients make their own decisions.
- **Trust takes work:** privacy, safety, and honest limitations are part of the product.

This is the Phase 1 build from the PRD: user auth, Guide profiles, directory
browse/filter, and encrypted 1-on-1 text chat, for the **Personal Finance** and
**Career & Work** verticals only. No voice calls, payments, images, or groups yet —
those come in later phases once the corresponding trust/safety infrastructure
is built (see the PRD's phased roadmap).

Stack: **Node.js/Express + Socket.io** backend, **PostgreSQL** database,
**React (Vite)** frontend, all run via **Docker Compose**.

---

## 1. Prerequisites (on your Ubuntu machine)

Install Docker and Docker Compose if you don't already have them:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# log out and back in (or `newgrp docker`) for the group change to take effect
```

Verify:
```bash
docker --version
docker compose version
```

## 2. Run it locally

1. Unzip this project and `cd` into it.
2. Copy the environment template and fill in real secrets (any long random
   strings are fine for local dev — just don't reuse them if you ever deploy
   publicly):
   ```bash
   cp .env.example .env
   ```
   Then edit `docker-compose.yml`'s `JWT_SECRET` and `MESSAGE_ENCRYPTION_KEY`
   values (or wire `.env` into compose — see note below) to match.
3. Start everything with one command:
   ```bash
   docker compose up --build
   ```
4. Once it's up:
   - Frontend: http://localhost:5173
   - Backend health check: http://localhost:4000/health
   - Postgres: localhost:5432 (user `guidance`, password `guidance_dev_pw`, db `guidance_marketplace`)

5. Try it: sign up as two different users in two browser windows (or one
   normal + one incognito). Make one a Guide via "Become a Guide," then have
   the other browse the directory, open that Guide's profile, accept the
   disclaimer, and start a chat session.

To stop everything: `Ctrl+C`, then `docker compose down` (add `-v` to also
wipe the database volume and start fresh).

### Admin and portal setup

Every new account starts as a `client`. Clients can use the **My portal** page
to see their sessions, and Guides use the same portal to manage their active
conversations. Admins use the protected **Admin** console for marketplace
counts, account review, session monitoring, and Guide profile activation.

For a fresh database, the `admin` role is included in `backend/init.sql`. For
an existing database volume, apply the migration before creating an admin:

```bash
docker compose exec db psql -U guidance -d guidance_marketplace \
  -f /dev/stdin < backend/migrations/001_add_admin_role.sql
```

Promote a trusted account manually from the database:

```bash
docker compose exec db psql -U guidance -d guidance_marketplace \
  -c "UPDATE users SET role = 'admin' WHERE email = 'you@example.com';"
```

**Note on secrets:** `docker-compose.yml` currently has placeholder values
inlined for local convenience. Before you ever deploy this beyond your own
machine, move `JWT_SECRET` and `MESSAGE_ENCRYPTION_KEY` into `.env` (already
gitignored) and reference them with `${JWT_SECRET}` syntax in compose, so
real secrets never get committed to source control.

---

## 3. What's deliberately NOT in this Phase 1 build

- Voice calls (WebRTC) — Phase 1 extension, straightforward to add once the
  text/auth foundation is solid
- Payments/escrow — needs a payment processor (Stripe Connect is the natural
  fit for marketplace payouts) and its own PCI-scope discussion
- Images (view-once) — needs object storage (S3-compatible, e.g. MinIO
  locally) plus the retention-policy disclosure work from the PRD
- Emotional Support & Companionship verticals — intentionally gated until
  crisis-escalation tooling and background-check integration exist
- True end-to-end encryption (E2EE) — messages are currently encrypted
  **in transit** (TLS, once deployed) and **at rest** (AES-256-GCM,
  server-held key). The server can technically decrypt messages, same as
  most consumer chat apps that aren't E2EE by design. If you want true E2EE
  (server never sees plaintext), that's a bigger lift — signal-protocol-style
  client-side key exchange — worth a dedicated design pass before promising
  it to users.

---

## 4. Path to going live: domain + hosting (steps you'll need to do yourself)

I can't purchase these for you, but here's exactly what to do, in order:

### Step 1 — Buy a domain
1. Go to a registrar: Namecheap, Google Domains successor (Squarespace
   Domains), or Cloudflare Registrar (sells at cost, no markup).
2. Search your desired name, purchase (~$10–15/year for a `.com`).
3. Enable WHOIS privacy (usually free) and 2FA on the registrar account.

### Step 2 — Choose hosting
For an app at this stage, reasonable options ranked by simplicity:
- **Render.com** or **Railway.app** — easiest, git-push-to-deploy, built-in
  Postgres, good for getting an MVP live fast (~$7–25/month to start).
- **DigitalOcean App Platform** or a basic **Droplet** — more control, similar
  price, you manage more yourself.
- **AWS/GCP** — most powerful, most complex; overkill until you have real
  traffic and a reason to need their specific services.

For a first public launch, I'd recommend Render or Railway — you'll be live
in under an hour once the code is ready, and can migrate later if you outgrow
it.

### Step 3 — Point the domain at your host
1. In your hosting provider, deploy the app (they'll give you a generated URL
   like `yourapp.onrender.com`).
2. In your registrar's DNS settings, add:
   - A `CNAME` record pointing your domain (or a subdomain like `app.`) to
     the host's generated URL, **or**
   - An `A` record pointing to an IP address, if your host gives you one.
3. Enable HTTPS — most modern hosts (Render, Railway, DO App Platform)
   auto-provision a free TLS certificate (via Let's Encrypt) once your domain
   is connected. If you're on a raw Droplet, you'll set this up yourself with
   Certbot + Nginx.

### Step 4 — Production hardening before real users touch it
- Replace all placeholder secrets (`JWT_SECRET`, `MESSAGE_ENCRYPTION_KEY`)
  with real, randomly generated values stored in your host's secrets
  manager — never in code.
- Move Postgres to a managed instance (most hosts offer this) rather than a
  self-run container, for backups and reliability.
- Set up basic monitoring/alerting (host-provided, or a free tier of
  Sentry/Better Stack) so you know if the app goes down.
- Have the legal disclaimer language reviewed by actual counsel before
  onboarding real Guides and Clients — this is the step most likely to be
  skipped and most likely to matter.

---

## 5. Suggested next build steps (in order)

1. Voice calls via WebRTC for existing sessions
2. Stripe Connect integration for payments/escrow
3. Image upload with view-once UI behavior (MinIO locally, S3 in production)
4. Ratings/reviews UI (schema already supports it — see `reviews` table)
5. Deploy Phase 1 live, get real user feedback, *then* build toward Phase 3/4
   (Emotional Support, Companionship) with their required safety
   infrastructure
