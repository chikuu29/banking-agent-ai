FROM python:3.12-slim-bookworm

# Install uv tool
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy project lockfiles and configurations
COPY pyproject.toml uv.lock ./

# Install dependencies without installing the project itself
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

# Copy the rest of the application code
COPY . .

# Sync the project (installs the package itself)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# Expose backend API port
EXPOSE 8000

# Set environment defaults for Docker container
ENV API_HOST=0.0.0.0
ENV API_PORT=8000
ENV DATABASE_URL=sqlite:////app/banking_crm.db

# Run uvicorn server
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
