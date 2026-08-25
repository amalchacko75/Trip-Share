from pathlib import Path
import os

import dj_database_url


BASE_DIR = Path(__file__).resolve().parent.parent


# ============================================================
# Security
# ============================================================

SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "dev-only-change-me",
)

DEBUG = os.getenv("DEBUG", "True").lower() == "true"


ALLOWED_HOSTS = [
    x.strip()
    for x in os.getenv(
        "ALLOWED_HOSTS",
        "127.0.0.1,localhost",
    ).split(",")
    if x.strip()
]


# ============================================================
# Applications
# ============================================================

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",

    "accounts",
    "spaces",
    "assets",
]


# ============================================================
# Middleware
# ============================================================

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# ============================================================
# URLs / Templates
# ============================================================

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


# ============================================================
# Database
# ============================================================

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            ssl_require=True,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": os.getenv(
                "DB_ENGINE",
                "django.db.backends.sqlite3",
            ),
            "NAME": os.getenv(
                "DB_NAME",
                BASE_DIR / "db.sqlite3",
            ),
            "USER": os.getenv("DB_USER", ""),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST": os.getenv("DB_HOST", ""),
            "PORT": os.getenv("DB_PORT", ""),
        }
    }


# ============================================================
# Custom User
# ============================================================

AUTH_USER_MODEL = "accounts.User"


# ============================================================
# Internationalization
# ============================================================

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Kolkata"

USE_I18N = True
USE_TZ = True


# ============================================================
# Static files
# ============================================================

STATIC_URL = "/static/"

STATIC_ROOT = BASE_DIR / "staticfiles"


# ============================================================
# Media files
# ============================================================

MEDIA_URL = "/media/"

MEDIA_ROOT = BASE_DIR / "media"


# ============================================================
# Django defaults
# ============================================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# ============================================================
# Django REST Framework
# ============================================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}


# ============================================================
# CORS
# ============================================================

CORS_ALLOWED_ORIGINS = [
    x.strip()
    for x in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:5173",
    ).split(",")
    if x.strip()
]


# ============================================================
# File upload limits
# ============================================================

DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024


# ============================================================
# Production security
# ============================================================

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = (
        "HTTP_X_FORWARDED_PROTO",
        "https",
    )

    SESSION_COOKIE_SECURE = True

    CSRF_COOKIE_SECURE = True

    SECURE_BROWSER_XSS_FILTER = True

    SECURE_CONTENT_TYPE_NOSNIFF = True