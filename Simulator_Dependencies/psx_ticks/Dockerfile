# syntax=docker/dockerfile:1

FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /opt/psx_ticks

COPY psx_ticks/requirements.txt ./requirements.txt

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt

COPY psx_ticks/ .

RUN chmod +x psx_ticks_ws.py proxy_populator.py

CMD ["python", "psx_ticks_ws.py"]
