# Birthday Manager Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (including cryptography build dependencies)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p data uploads exports imports temp_import

# Set environment variables
ENV BIRTHDAY_REMINDER_PORTABLE=true
ENV PYTHONUNBUFFERED=1

# Expose port 4040
EXPOSE 4040

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:4040/health')"

# Run the application
CMD ["python3", "server.py", "--host", "0.0.0.0", "--port", "4040", "--portable"]

