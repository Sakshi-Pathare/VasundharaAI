# Vasundhara AI — Production Deployment Guide

**Target Environment:** Linux (Ubuntu 22.04 LTS / Debian 12 / RHEL 9)  
**Deployment Model:** Containerized Micro-services via Docker & Docker Compose  
**Security Profile:** Hardened, Least-Privilege Non-Root, HTTPS Enforcement  
**Last Updated:** November 2026  

---

## 1. Hosting Architecture & Cost-Conscious Evaluation

To achieve reliable high availability while minimizing infrastructure costs:

| Component | Recommended Production Option | Cost-Conscious Alternative | Monthly Cost Estimate |
| :--- | :--- | :--- | :--- |
| **React Frontend SPA** | Cloudflare Pages / AWS CloudFront + S3 | Nginx Docker container (included in Compose) | **$0.00 – $5.00** |
| **FastAPI Backend** | 2-Core / 4GB RAM VPS (Hetzner / DO / Linode) | AWS ECS Fargate or Fly.io | **$8.00 – $24.00** |
| **PostgreSQL Database** | Managed RDS / Supabase Pro | Self-hosted PostgreSQL 16 on Docker Volume | **$0.00 (Self) – $25.00 (RDS)** |
| **Uploaded Media Storage** | S3 / Cloudflare R2 Object Store | Docker Persistent Volume Mount (`/app/uploads`) | **$0.00 (Volume) – $2.00 (R2)** |
| **AI Model Weights** | Pre-cached Docker volume (`/app/models`) | Mounted shared read-only NFS | **$0.00** |
| **SSL / TLS Certificate** | Let's Encrypt Certbot via Nginx | Cloudflare Managed Edge SSL | **$0.00** |
| **Total Stack Cost** | — | — | **~$15.00 – $35.00 / month** |

> **Critical Operational Rule:** Never deploy the backend on ephemeral serverless platforms without persistent disk mounts (such as raw Heroku or ephemeral Lambdas) unless an S3-compatible remote object store (e.g. AWS S3 or Cloudflare R2) is configured for `UPLOAD_DIR`. Docker named volumes or mounted block storage ensure zero evidence loss across container restarts.

---

## 2. Server Provisioning & Prerequisites

On a clean Ubuntu 22.04 LTS host:

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install Docker Engine and Docker Compose Plugin
sudo apt install -y curl git ufw fail2ban
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 3. Configure Firewall (UFW)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

---

## 3. Deployment Procedure

### Step 1: Clone Repository
```bash
git clone https://github.com/vasundhara-ai/vasundhara-ai.git /opt/vasundhara-ai
cd /opt/vasundhara-ai
```

### Step 2: Environment Configuration
Generate secure random passwords and create `.env.production`:

```bash
# Generate high-entropy database password
DB_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-24)
ADMIN_PASS=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-18)

cat <<EOF > .env.production
ENVIRONMENT=production
POSTGRES_DB=vasundhara_prod
POSTGRES_USER=vasundhara_user
POSTGRES_PASSWORD=${DB_PASS}
DATABASE_URL=postgresql+psycopg://vasundhara_user:${DB_PASS}@db:5432/vasundhara_prod
CORS_ORIGINS=https://vasundhara.yourdomain.org
VASUNDHARA_SUPERADMIN_EMAIL=superadmin@yourdomain.org
VASUNDHARA_SUPERADMIN_PASSWORD=${ADMIN_PASS}
UPLOAD_DIR=/app/uploads
MAX_IMAGE_BYTES=8388608
LOG_LEVEL=INFO
JURISDICTION_BOUNDARY_MARGIN_METERS=25.0
EOF

# Restrict file permissions
chmod 600 .env.production
```

### Step 3: Launch Production Containers
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### Step 4: Verify Service Health & Readiness
```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Query live readiness probe
curl -f http://localhost/ready
# Output should return HTTP 200 with checks: database=true, storage=true
```

---

## 4. SSL / TLS Setup with Let's Encrypt Certbot

To enable HTTPS with automatic 90-day certificate renewals:

```bash
# 1. Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# 2. Stop host container temporarily to bind port 80/443 for standalone issuance
docker compose -f docker-compose.prod.yml stop frontend
sudo certbot certonly --standalone -d vasundhara.yourdomain.org

# 3. Mount certificates into nginx container in docker-compose.prod.yml:
# - /etc/letsencrypt/live/vasundhara.yourdomain.org/fullchain.pem:/etc/nginx/ssl/fullchain.pem:ro
# - /etc/letsencrypt/live/vasundhara.yourdomain.org/privkey.pem:/etc/nginx/ssl/privkey.pem:ro

# 4. Restart stack
docker compose -f docker-compose.prod.yml start frontend
```

---

## 5. Automated Database Backup & Disaster Recovery

An automated daily backup cron job ensures continuous point-in-time recovery without application downtime:

```bash
# Create backup directory
sudo mkdir -p /var/backups/vasundhara
sudo chmod 700 /var/backups/vasundhara

# Add cron task to run daily at 02:00 AM
sudo crontab -e
```

Add the following cron entry:
```cron
0 2 * * * docker exec vasundhara_db_prod pg_dump -U vasundhara_user vasundhara_prod | gzip > /var/backups/vasundhara/db_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz && find /var/backups/vasundhara -type f -name "*.sql.gz" -mtime +30 -delete
```

### Disaster Recovery Procedure
```bash
# 1. Decompress backup
gunzip < /var/backups/vasundhara/db_YYYYMMDD_HHMMSS.sql.gz > restore.sql

# 2. Restore into clean database container
docker exec -i vasundhara_db_prod psql -U vasundhara_user -d vasundhara_prod < restore.sql

# 3. Verify record integrity
docker exec -i vasundhara_db_prod psql -U vasundhara_user -d vasundhara_prod -c "SELECT count(*) FROM reports;"
```
