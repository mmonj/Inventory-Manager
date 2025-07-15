import os
from pathlib import Path

TIME_ZONE = os.environ["TZ"]

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.1/howto/static-files/

STATIC_URL = os.environ["DJANGO_STATIC_URL"]
STATIC_ROOT = BASE_DIR / "collected"
STATICFILES_DIRS = (BASE_DIR / "static/",)

MEDIA_URL = os.environ["DJANGO_MEDIA_URL"]
MEDIA_ROOT = BASE_DIR / "media/"
MEDIA_ROOT.mkdir(exist_ok=True)

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ["DEV"] == "1"

ALLOWED_HOSTS = os.environ["DJANGO_ALLOWED_HOSTS"].split()
CSRF_TRUSTED_ORIGINS = os.environ["DJANGO_CSRF_TRUSTED_ORIGINS"].split()

# Database
# https://docs.djangoproject.com/en/4.1/ref/settings/#databases

DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024**2

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ["PSQL_DB_NAME"],
        "USER": os.environ["PSQL_USERNAME"],
        "PASSWORD": os.environ["PSQL_PASSWORD"],
        "HOST": os.environ["PSQL_HOST"],
        "PORT": os.environ["PSQL_PORT"],
    }
}
