FROM python:3.9.17-slim
WORKDIR /app

ARG DEV
ARG UID

RUN echo "Building with: DEV=${DEV}, UID=${UID}"

# ensure DEV and UID are provided
RUN if [ -z "${DEV}" ] || [ -z "${UID}" ]; then \
    echo "ERROR: Both DEV and UID build arguments are required but were not provided"; \
    exit 1; \
fi

ARG POETRY_VERSION=2.1.3
ARG NODE_VERSION=16.20.0

ARG NODE_PACKAGE=node-v$NODE_VERSION-linux-x64
ARG NODE_HOME=/opt/$NODE_PACKAGE

ENV NODE_PATH="$NODE_HOME/lib/node_modules" \
    POETRY_HOME="/opt/poetry"
ENV PATH="$NODE_HOME/bin:$POETRY_HOME/bin:$PATH"

RUN apt-get update --fix-missing -y && apt-get upgrade -y \
    && apt-get install curl -y \
    # install Node and Poetry
    && curl https://nodejs.org/dist/v$NODE_VERSION/$NODE_PACKAGE.tar.gz | tar -xzC /opt/ \
    && curl -sSL https://install.python-poetry.org | POETRY_VERSION=$POETRY_VERSION python3 -

COPY package.json package-lock.json ./
COPY pyproject.toml poetry.lock ./

# Turns off buffering for easier container logging
ENV PYTHONUNBUFFERED=1 \
    POETRY_VIRTUALENVS_PATH=/.globals/poetry \
    POETRY_VIRTUALENVS_CREATE=true \
    PATH="$NODE_HOME/bin:$POETRY_HOME/bin:$PATH"


RUN if [ "$DEV" = "1" ]; then \
    apt-get update -y && apt-get upgrade -y && apt-get install git -y; \
fi

RUN adduser -u ${UID} --disabled-password --gecos "" appuser && chown -R appuser /app \
    && mkdir -p $POETRY_VIRTUALENVS_PATH && chown -R appuser $POETRY_VIRTUALENVS_PATH

USER appuser

# install dependencies based on DEV
RUN if [ "$DEV" = "1" ]; then \
    echo "Installing in DEV mode"; \
    poetry install --no-root && \
    npm ci; \
elif [ "$DEV" = "0" ]; then \
    echo "Installing in PROD mode"; \
    poetry install --without dev --no-root && \
    npm ci --omit=dev; \
fi
