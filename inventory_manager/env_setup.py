import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles/"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media/"

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ['DJANGO_SECRET_KEY']

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ['DEBUG'] == "1"

ALLOWED_HOSTS = []

# Database
# https://docs.djangoproject.com/en/4.1/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        "NAME": os.environ['psql_db_name'],
        "USER": os.environ['psql_username'],
        "PASSWORD": os.environ['psql_password'],
        "HOST": os.environ['psql_host'],
        "PORT": os.environ['psql_port'],
    }
}

TIME_ZONE = os.environ['TZ']
