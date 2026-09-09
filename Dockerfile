# Use a lightweight official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=5000

# Default Prefix configuration (e.g. /voguem)
ENV DEFAULT_PREFIX="/voguem"

# This environment variable defines where all uploaded journal data is stored.
# Users should mount an external persistent storage volume to this path.
ENV DATA_DIR="/app/data"

# Set work directory
WORKDIR /app

# Install system dependencies if needed (none are strictly required for our standard build, keeping it slim)
# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir --quiet -r requirements.txt

# Copy application source code
COPY main.py .
COPY assets/ ./assets/
COPY static/ ./static/

# Create the data directory in the container
RUN mkdir -p /app/data

# Expose port 5000 for standard subpath deployment
EXPOSE 5000

# Health check directive for monitoring container health status
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=5s \
    CMD python -c "import requests; requests.get('http://localhost:5000/${DEFAULT_PREFIX}/api/status')"

# Start the application using Uvicorn on port 5000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
