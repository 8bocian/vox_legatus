FROM python:3.12-slim

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements.txt from the subfolder
COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your project files (adjust if needed)
COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
