FROM python:3.9.17-slim
WORKDIR /app

RUN apt-get update -y
RUN apt-get install curl -y

# install Node.js
ARG NODE_VERSION=16.20.0
ARG NODE_PACKAGE=node-v$NODE_VERSION-linux-x64
ARG NODE_HOME=/opt/$NODE_PACKAGE

ENV NODE_PATH $NODE_HOME/lib/node_modules
ENV PATH $NODE_HOME/bin:$PATH

RUN curl https://nodejs.org/dist/v$NODE_VERSION/$NODE_PACKAGE.tar.gz | tar -xzC /opt/
RUN npm install -g npm@latest
COPY package.json package-lock.json ./

RUN python -m pip install poetry
# enable installing dependencies into the system's python environment
RUN poetry config virtualenvs.create false

COPY pyproject.toml poetry.lock ./

# install dependencies
ARG ENV_TYPE
RUN if [ "$ENV_TYPE" = "dev" ]; then \
    apt-get install git -y \
    && poetry install --no-root \
    && npm i \
elif [ "$ENV_TYPE" = "prod" ]; then \
    poetry install --without dev --no-root --sync \
    && npm ci --omit=dev \
;fi

# Turns off buffering for easier container logging
ENV PYTHONUNBUFFERED=1

ARG UID
RUN adduser -u ${UID} --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser
