FROM python:3.8.16-slim
WORKDIR /app

COPY requirements.txt /app
RUN pip install -r requirements.txt

RUN apt-get -y update
RUN apt-get -y upgrade
RUN apt-get install -y sqlite3

EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
