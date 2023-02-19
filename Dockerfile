FROM python:3.8.16-slim
WORKDIR /app

COPY requirements.txt /app
RUN pip install -r requirements.txt

ARG BUILD_MODE
RUN if [ "$BUILD_MODE" = "dev" ] ; then pip install pipreq \
	&& apt-get update -y \
	&& apt-get upgrade -y \
	&& apt-get install git -y \
	; fi

# Turns off buffering for easier container logging
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

RUN adduser -u 5678 --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
