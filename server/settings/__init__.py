"""
Django settings for this project.

Generated by 'django-admin startproject' using Django 4.1.5.

For more information on this file, see
https://docs.djangoproject.com/en/4.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/4.1/ref/settings/
"""

from pathlib import Path
from typing import Type, TypeVar

import cattrs
import django_stubs_ext

# retrieve django settings that are included as environmental variables
from .env_setup import *
from .redis_queues import *

django_stubs_ext.monkeypatch()

T = TypeVar("T")

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

LOGS_DIR = BASE_DIR / "log_files"
LOGS_DIR.mkdir(exist_ok=True)

DAY_IN_SECONDS = 3600 * 24
SESSION_COOKIE_AGE = DAY_IN_SECONDS * 7 * 4

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/4.1/howto/deployment/checklist/

# Application definition
INSTALLED_APPS = [
    # 'whitenoise.runserver_nostatic',
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "homepage",
    "api",
    "products",
    "stock_tracker",
    "product_locator",
    "survey_worker",
    "widget_tweaks",
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "django_cleanup.apps.CleanupConfig",
    "django_rq",
    "reactivated",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    # 'whitenoise.middleware.WhiteNoiseMiddleware',
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "server.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "client/html"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
    {
        "BACKEND": "reactivated.backend.JSX",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "server.context_processors.context_provider",
                "django.contrib.messages.context_processors.messages",
                "django.template.context_processors.csrf",
                "django.template.context_processors.request",
                "django.template.context_processors.static",
            ]
        },
    },
]

WSGI_APPLICATION = "server.wsgi.application"

# Password validation
# https://docs.djangoproject.com/en/4.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
# https://docs.djangoproject.com/en/4.1/topics/i18n/

LANGUAGE_CODE = "en-us"

USE_I18N = True

USE_TZ = True

# Default primary key field type
# https://docs.djangoproject.com/en/4.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

CORS_URLS_REGEX = r"^/(api|product_locator/api)/.*$"
CORS_ALLOW_ALL_ORIGINS = True

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "simple": {
            "format": "{levelname} {asctime:s} {filename:s} {funcName:s} {lineno:3d} -- {message}",
            "datefmt": "%Y-%m-%d %I:%M:%S %p",
            "style": "{",
        },
    },
    "filters": {
        "require_debug_true": {
            "()": "django.utils.log.RequireDebugTrue",
        }
    },
    "handlers": {
        "console": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "formatter": "simple",
            # 'stream': sys.stdout,
        },
        "console_debug": {
            "level": "DEBUG",
            "filters": ["require_debug_true"],
            "class": "logging.StreamHandler",
        },
        "main_handler": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOGS_DIR / "inventory_manager.log",
            "mode": "a",
            "encoding": "utf-8",
            "formatter": "simple",
            "backupCount": 5,
            "maxBytes": 5 * 1024**2,  # 5 MiB
        },
        "worker_handler": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOGS_DIR / "rq_worker.log",
            "level": "DEBUG",
            "mode": "a",
            "encoding": "utf-8",
            "formatter": "simple",
            "backupCount": 5,
            "maxBytes": 5 * 1024**2,  # 5 MiB
        },
    },
    "loggers": {
        "django.request": {
            "handlers": ["main_handler"],
            "level": "WARNING",
            "propagate": False,
        },
        "main_logger": {
            "handlers": ["main_handler", "console"],
            "level": "INFO",
            "propagate": False,
        },
        "rq.worker": {
            "handlers": ["worker_handler", "console"],
            "level": "DEBUG",
            "propagate": True,
        },
        # 'django.db.backends': {
        #     'level': 'DEBUG',
        #     'handlers': ['console_debug'],
        # }
    },
}


def structure_generic(value: T, expected_type: Type[T]) -> T:
    if not isinstance(value, expected_type):
        raise TypeError(f"Value of {value!r} has type {type(value)}. Expected {expected_type}.")
    return value


cattrs.register_structure_hook(str, structure_generic)
# cattrs.register_structure_hook(int, structure_generic)
cattrs.register_structure_hook(float, structure_generic)
cattrs.register_structure_hook(bool, structure_generic)
