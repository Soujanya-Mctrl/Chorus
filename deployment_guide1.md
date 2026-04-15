# Chorus — 100% Free Deployment Guide

> [!NOTE]
> **Free Stack Used**
> | Service | Provider | Cost |
> |---|---|---|
> | Docker Server (API + Worker) | **AWS EC2** | ✅ Covered by your $100 AWS credit |
> | PostgreSQL + pgvector | Supabase | ✅ Free tier |
> | Redis | Upstash | ✅ Free tier |
> | Next.js Frontend | Vercel | ✅ Free tier |
> | CI/CD + Docker Images | GitHub Actions + ghcr.io | ✅ Free for public repos |

---

## Phase 1 — Managed Services Setup

### Step 1 — PostgreSQL + pgvector → Supabase

1. Go to [supabase.com](https://supabase.com) → **Start your project** → Sign in with GitHub
2. Click **New project**
   - Name: `chorus`
   - Database password: create a strong one (save it!)
   - Region: pick closest to you
3. Wait ~2 minutes for provisioning
4. Go to **Project Settings** → **Database** → scroll down to **Connection string**
5. Select the **URI** tab and copy the string — looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```
6. Enable pgvector: go to **SQL Editor** → **New query** → paste and run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
7. **Run your migration** from your Mac:
   ```bash
   cd /Users/vanshdeo/dev/Chorus/apps/api
   DATABASE_URL="postgresql://postgres:YOUR_PASS@db.xxxx.supabase.co:5432/postgres" \
   npx tsx src/db/migrate.ts
   ```
   You should see: `🎉 Migration complete!`

---

### Step 2 — Redis → Upstash

1. Go to [upstash.com](https://upstash.com) → **Create account** → Login
2. Click **Create Database**
   - Name: `chorus-redis`
   - Type: **Regional**
   - Region: pick closest to you
   - **Enable Eviction**: OFF
3. Once created, click on the database → go to **Details** tab
4. Copy the **Redis URL** — looks like:
   ```
   redis://default:xxxxxxxxxxxxxxxx@eu1-xxx-12345.upstash.io:12345
   ```
   Save this — you'll need it in Step 5.

---

### Step 3 — Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → Sign in with GitHub
2. Click **Add New → Project**
3. Import your `Chorus` repository
4. Configure the project:
   - **Framework Preset**: Next.js ✅ (auto-detected)
   - **Root Directory**: click Edit → type `apps/web`
5. Under **Environment Variables**, add:
   ```
   NEXT_PUBLIC_API_URL = (leave empty for now — you'll get this in Phase 2)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk_live_...
   CLERK_SECRET_KEY = sk_live_...
   ```
6. Click **Deploy**
7. After deployment, copy your **Vercel URL** (e.g. `https://chorus-xyz.vercel.app`) — save it.

> [!NOTE]
> The frontend will deploy but will show a connection error until the API server is running. That's fine — you'll come back and add `NEXT_PUBLIC_API_URL` after Phase 2.

---

## Phase 2 — Server for API + Worker (AWS EC2)

### Step 4 — Use Your AWS Credit

1. Ensure you have activated your $100 AWS Credit on your AWS account.
2. Sign in to your AWS Management Console.

---

### Step 5 — Launch an EC2 Instance (VPS)

1. In the AWS console → Search for **EC2** → click **Launch Instance**

2. Configure:
   - **Name**: `chorus-server`
   - **OS Image (AMI)**: `Ubuntu Server 24.04 LTS` (or 22.04 LTS) ✅
   - **Instance Type**: **`t3.small`** or **`t3.medium`** (easily covered by your $100 credit)
     > The `t2.micro` (free tier) may struggle with Docker + Node.js — `t3.small` is safer.
   - **Key Pair**: Create a new key pair, name it `macbook-aws.pem`, and download it to your Mac.
   - **Network Settings**:
     - Check **Allow SSH traffic**
     - Check **Allow HTTP traffic**
     - Check **Allow HTTPS traffic**
   - **Storage**: Increase root volume size to **20GB** or **30GB**.

3. Click **Launch Instance** — takes ~1 minute.

4. Go to **Elastic IPs** in the left menu → **Allocate Elastic IP Address** → **Associate** it with your running `chorus-server` instance. Copy the Elastic IP address shown (e.g. `3.80.xxx.xxx`) — save this.

---

### Step 6 — Open Additional Firewall Ports

AWS allows SSH, HTTP, and HTTPS by default if selected above, but we need ports 3000 and 3001 too.

1. Go to your **EC2 Dashboard** → click your instance → go to the **Security** tab → click the Security Group link (e.g. `sg-0abcd...`).
2. Click **Edit inbound rules**.
3. Click **Add rule**:
   - Type: `Custom TCP`
   - Port range: `3000`
   - Source: `Anywhere-IPv4` (`0.0.0.0/0`)
4. Click **Add rule**:
   - Type: `Custom TCP`
   - Port range: `3001`
   - Source: `Anywhere-IPv4` (`0.0.0.0/0`)
5. Click **Save rules**.

---

### Step 7 — Set Up the Server

On your Mac, change the permissions of the downloaded key and SSH into your EC2 instance:
```bash
chmod 400 ~/Downloads/macbook-aws.pem
ssh -i ~/Downloads/macbook-aws.pem ubuntu@3.80.xxx.xxx
```

#### 7a — Install Docker
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker using the official one-liner
curl -fsSL https://get.docker.com | sudo sh

# Verify
docker --version
docker compose version

# Allow running docker without sudo
sudo usermod -aG docker ubuntu
newgrp docker
```

#### 7b — Clone your repo
```bash
git clone https://github.com/VanshDeo/Chorus.git ~/chorus
cd ~/chorus
```

#### 7c — Create the production environment file
```bash
nano ~/chorus/.env.prod
```

Paste this and fill in your actual values:
```env
# ── PostgreSQL (Supabase) ─────────────────────────
DATABASE_URL=postgresql://postgres:YOUR_SUPABASE_PASS@db.xxxx.supabase.co:5432/postgres

# ── Redis (Upstash) ───────────────────────────────
REDIS_URL=redis://default:xxxx@eu1-xxx-12345.upstash.io:12345

# ── GitHub ────────────────────────────────────────
GITHUB_TOKEN=github_pat_11BKA64TI0...
GITHUB_CLIENT_ID=Ov23liDJA21Y...
GITHUB_CLIENT_SECRET=ed49bd6f2b...
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# ── AI ────────────────────────────────────────────
GEMINI_API_KEY=AIzaSyBcdXc7...

# ── Auth ──────────────────────────────────────────
JWT_SECRET=run_openssl_rand_base64_32_and_paste_here

# ── URLs (use your AWS Elastic IP) ───────────────
CALLBACK_URL=http://3.80.xxx.xxx:3001/api/auth/github/callback
FRONTEND_URL=https://chorus-xyz.vercel.app
CORS_ORIGINS=https://chorus-xyz.vercel.app

# ── Misc ──────────────────────────────────────────
NODE_ENV=production
LOG_LEVEL=info
```

Generate a JWT secret:
```bash
openssl rand -base64 32
# Copy the output into JWT_SECRET above
```

Save the file: `Ctrl+X` → `Y` → `Enter`

---

## Phase 3 — CI/CD with GitHub Actions

### Step 8 — Add GitHub Secrets

In your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these 3 secrets:

| Name | Value |
|---|---|
| `SERVER_HOST` | `3.80.xxx.xxx` (your AWS Elastic IP) |
| `SERVER_USER` | `ubuntu` |
| `SERVER_SSH_KEY` | Contents of `~/Downloads/macbook-aws.pem` on your Mac |

Get your private key:
```bash
# Run on your Mac
cat ~/Downloads/macbook-aws.pem
# Copy everything including -----BEGIN and -----END lines
```

### Step 9 — Allow GitHub Actions to Push Docker Images

In your GitHub repo → **Settings** → **Actions** → **General**:
- Under **Workflow permissions** → select **Read and write permissions** ✅
- Click **Save**

---

## Phase 4 — Deploy!

### Step 10 — Push to Trigger Deployment

On your **Mac**:
```bash
cd /Users/vanshdeo/dev/Chorus
git add .
git commit -m "feat: production deployment setup"
git push origin main
```

Watch the CI/CD pipeline run at:
```
https://github.com/YOUR_USERNAME/Chorus/actions
```

It will:
1. ✅ Build all 3 Docker images (~5 min)
2. ✅ Push them to `ghcr.io/your-username/`
3. ✅ SSH into your AWS EC2 Instance
4. ✅ Pull new images and start services

---

### Step 11 — First Launch (Bootstrap Only)

The very first time, you need to pull and start manually on the server because the CI/CD needs the images to exist first:

```bash
ssh -i ~/Downloads/macbook-aws.pem ubuntu@3.80.xxx.xxx
cd ~/chorus

# Login to GitHub Container Registry
echo "YOUR_GITHUB_PERSONAL_ACCESS_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Generate a PAT at: github.com → Settings → Developer Settings → Personal Access Tokens
# Scopes needed: read:packages

# Start everything (replace YOUR_GITHUB_USERNAME)
GITHUB_REPO=YOUR_GITHUB_USERNAME/Chorus \
IMAGE_TAG=latest \
docker compose \
  -f infra/docker/docker-compose.prod.yml \
  --env-file .env.prod \
  up -d

# Note: The first run rebuilds images locally since we haven't pushed to ghcr yet
# Alternative: build locally on the server
docker compose -f infra/docker/docker-compose.yml --env-file .env.prod up --build -d
```

---

### Step 12 — Verify Everything Works

```bash
# Check all containers are running
docker ps

# Should show: postgres, redis, migrate(exited 0), api, worker, web

# Test API health
curl http://localhost:3001/health
# → {"status":"ok","timestamp":"2026-..."}

# Check migration ran successfully
docker compose -f infra/docker/docker-compose.yml logs migrate
# → 🎉 Migration complete!

# View live logs
docker compose -f infra/docker/docker-compose.yml logs -f api
```

Your app is now live at:
- **Frontend**: `http://3.80.xxx.xxx:3000`
- **API**: `http://3.80.xxx.xxx:3001`
- **Health**: `http://3.80.xxx.xxx:3001/health`

---

### Step 13 — Connect Vercel Frontend to the API

Go back to [vercel.com](https://vercel.com) → Your `chorus` project → **Settings** → **Environment Variables**:

Update / add:
```
NEXT_PUBLIC_API_URL = http://3.80.xxx.xxx:3001
NEXT_PUBLIC_WS_URL = ws://3.80.xxx.xxx:3001
```

Then **redeploy**: Deployments tab → click the **⋯** menu on the latest deployment → **Redeploy**.

---

## After Setup — Every Future Deploy

```bash
# On your Mac — that's it!
git push origin main
```

GitHub Actions handles everything else automatically. ✅

---

## Useful Commands (On the Server)

```bash
# See all running containers
docker ps

# Restart the API
docker compose -f infra/docker/docker-compose.yml restart api

# View API logs (live)
docker compose -f infra/docker/docker-compose.yml logs -f api

# View all logs
docker compose -f infra/docker/docker-compose.yml logs -f

# Open PostgreSQL shell
docker compose -f infra/docker/docker-compose.yml exec postgres \
  psql -U chorus

# Stop everything
docker compose -f infra/docker/docker-compose.yml down

# Free up disk space from old images
docker system prune -f
```

---

## Summary of Free Tier Limits

| Service | Free Limit | Will you hit it? |
|---|---|---|
| AWS EC2 Instance | $100 credit (covers t3.small usage) | No |
| Supabase Postgres | 500MB storage, 2 projects | Only if you store huge repos |
| Upstash Redis | 10,000 commands/day | Only under heavy load |
| Vercel | 100GB bandwidth/month | Very unlikely |
| GitHub Actions | 2,000 min/month (public repo: unlimited) | Make repo public = unlimited |
| ghcr.io | Unlimited for public repos | Make repo public = unlimited |
