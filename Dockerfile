FROM python:3.9.17-slim
WORKDIR /app

ARG ENV_TYPE
ARG UID

ARG NODE_VERSION=16.20.0
ARG NODE_PACKAGE=node-v$NODE_VERSION-linux-x64
ARG NODE_HOME=/opt/$NODE_PACKAGE
ENV NODE_PATH $NODE_HOME/lib/node_modules

# Turns off buffering for easier container logging
ENV PYTHONUNBUFFERED=1 \
    POETRY_HOME="/opt/poetry" \
    # enable installing dependencies into the system's python environment
    POETRY_VIRTUALENVS_CREATE=false

ENV PATH="$NODE_HOME/bin:$POETRY_HOME/bin:$PATH"


RUN apt-get update -y && apt-get upgrade -y \
    && apt-get install curl gnupg -y \
    && apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils \
    && curl -fsSL https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo 'deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main' | tee /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update -y \
    && apt-get install google-chrome-stable -y \
    # install Node and Poetry
    && curl https://nodejs.org/dist/v$NODE_VERSION/$NODE_PACKAGE.tar.gz | tar -xzC /opt/ \
    && curl -sSL https://install.python-poetry.org | python3 -

# RUN npm install -g npm@latest
COPY package.json package-lock.json ./
COPY pyproject.toml poetry.lock ./

# install dependencies
RUN if [ "$ENV_TYPE" = "dev" ]; then \
    apt-get install git -y \
    && poetry install --no-root \
    && npm i \
;elif [ "$ENV_TYPE" = "prod" ]; then \
    poetry install --without dev --no-root \
    && npm ci \
;fi

RUN adduser -u ${UID} --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser
