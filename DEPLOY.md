# PartyJeoparty - Docker Deployment Guide

## Quick Start

### 1. Configure Environment
```bash
# Copy and edit the environment file
cp .env.example .env
nano .env  # Set secure passwords
```

### 2. Build and Run
```bash
# Build all containers
docker-compose build

# Start the application
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 3. Access the Application
- **Local**: http://localhost:8080
- **With subdomain**: Configure your nginx (see below)

---

## Subdomain Setup (nginx)

### Option A: Using provided config
```bash
# Copy the nginx config
sudo cp nginx-subdomain.conf /etc/nginx/sites-available/partyjeoparty

# Edit to set your domain
sudo nano /etc/nginx/sites-available/partyjeoparty
# Change: server_name jeoparty.yourdomain.com;

# Enable the site
sudo ln -s /etc/nginx/sites-available/partyjeoparty /etc/nginx/sites-enabled/

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Option B: Add to existing nginx config
Add this location block to your existing server config:
```nginx
location / {
    proxy_pass http://localhost:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

---

## SSL with Let's Encrypt

```bash
# Install certbot if not already installed
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d jeoparty.yourdomain.com

# Auto-renewal is set up automatically
```

---

## Container Management

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f          # All services
docker-compose logs -f server   # Just backend
docker-compose logs -f client   # Just frontend

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Stop and remove volumes (deletes database!)
docker-compose down -v

# Rebuild after code changes
docker-compose build --no-cache
docker-compose up -d
```

---

## Database Management

```bash
# Access MySQL CLI
docker exec -it partyjeoparty-db mysql -u jeoparty -p partyjeoparty

# Backup database
docker exec partyjeoparty-db mysqldump -u jeoparty -p partyjeoparty > backup.sql

# Restore database
docker exec -i partyjeoparty-db mysql -u jeoparty -p partyjeoparty < backup.sql
```

---

## Ports Used

| Service  | Internal | External |
|----------|----------|----------|
| Client   | 80       | 8080     |
| Server   | 3001     | 3001     |
| MySQL    | 3306     | 3306     |

You can modify external ports in `docker-compose.yml` if needed.

---

## Troubleshooting

### Container won't start
```bash
# Check logs for errors
docker-compose logs server
docker-compose logs client

# Verify database is healthy
docker-compose ps db
```

### Database connection issues
```bash
# Ensure db container is healthy before server starts
docker-compose up -d db
# Wait for it to be healthy
docker-compose up -d server client
```

### WebSocket issues
Make sure your nginx config includes:
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

### Permission issues
```bash
# If volume permissions fail
sudo chown -R 1000:1000 ./mysql_data
```
