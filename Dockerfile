FROM python:3.12.1-slim
COPY --from=ghcr.io/astral-sh/uv:0.7.10 /uv /uvx /bin/

WORKDIR /app

ARG ENV_TYPE
ARG UID

ARG NODE_VERSION=18.18.2
ARG NODE_PACKAGE=node-v$NODE_VERSION-linux-x64
ARG NODE_HOME=/opt/$NODE_PACKAGE
ENV NODE_PATH="$NODE_HOME/lib/node_modules"

ENV PATH="$NODE_HOME/bin:$PATH"

ENV UV_PROJECT_ENVIRONMENT=/opt/.venv
ENV PATH="$UV_PROJECT_ENVIRONMENT/bin:$PATH"

RUN apt-get update --fix-missing -y && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    # install Node
    && curl https://nodejs.org/dist/v$NODE_VERSION/$NODE_PACKAGE.tar.gz | tar -xzC /opt/

COPY package.json package-lock.jso[n] ./
COPY pyproject.toml uv.loc[k] ./

# Turns off buffering for easier container logging
ENV PYTHONUNBUFFERED=1


RUN if [ "$ENV_TYPE" = "dev" ]; then \
	apt-get update -y \
        && apt-get install git -y \
    ;fi
    
RUN adduser -u ${UID} --disabled-password --gecos "" appuser \
    && mkdir -p /opt/.venv \
    && chown -R appuser /app /opt/.venv

USER appuser

# install dependencies
RUN if [ "$ENV_TYPE" = "dev" ]; then \
        uv sync \
        && npm ci \
    ;elif [ "$ENV_TYPE" = "prod" ]; then \
        uv sync --no-dev \
        && npm ci \
    ;fi
