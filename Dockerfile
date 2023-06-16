FROM nikolaik/python-nodejs:python3.9-nodejs16-slim

WORKDIR /app
ARG ENV_TYPE

RUN if [ "$ENV_TYPE" = "dev" ] ; then \
	apt-get update -y \
	&& apt-get install git -y \
	; fi

COPY pyproject.toml poetry.lock ./

RUN python -m pip install poetry
# enable installing dependencies into the system's python environment
RUN poetry config virtualenvs.create false
RUN poetry install --no-root

# user 'pn' was created during nikolaik/python-nodejs's build step
USER pn
