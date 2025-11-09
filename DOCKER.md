# Docker Setup for Birthday Manager

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The application will be available at: `http://localhost:4040`

### Using Docker directly

```bash
# Build the image
docker build -t birthday-manager .

# Run the container
docker run -d \
  --name birthday-manager \
  -p 4040:4040 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  birthday-manager

# View logs
docker logs -f birthday-manager

# Stop the container
docker stop birthday-manager
docker rm birthday-manager
```

## Data Persistence

The Docker setup uses volumes to persist:
- **Database**: `./data/birthdays.db`
- **Config**: `./data/birthday_reminder_config.json`
- **Uploads**: `./uploads/` (photos)

These directories are mounted as volumes, so your data persists even if you remove the container.

## Environment Variables

- `BIRTHDAY_REMINDER_PORTABLE=true` - Uses portable mode (data in ./data)
- `PYTHONUNBUFFERED=1` - Ensures Python output is not buffered

## Health Check

The container includes a health check that monitors the `/health` endpoint. You can check the health status with:

```bash
docker ps
```

## Troubleshooting

### Port already in use
If port 4040 is already in use, you can change it in `docker-compose.yml`:
```yaml
ports:
  - "4041:4040"  # Change 4041 to any available port
```

### Permission issues
If you encounter permission issues with volumes:
```bash
sudo chown -R $USER:$USER data uploads
```

### View container logs
```bash
docker-compose logs -f birthday-manager
```

### Access container shell
```bash
docker exec -it birthday-manager /bin/bash
```

## Production Deployment

For production, consider:
1. Using environment variables for sensitive data
2. Setting up reverse proxy (nginx/traefik)
3. Using Docker secrets for SMTP passwords
4. Setting up proper backup strategy for volumes
5. Using Docker Swarm or Kubernetes for orchestration

