# Server Setup Guide

This project is a Django REST API server with JWT authentication.


## Tech Stack

- Django
- Django REST Framework
- SimpleJWT
- PostgreSQL


## Features Implemented

- User registration API
- User login API
- JWT token generation (`access`, `refresh`)
- Login with `username` or `email` or `phone_number`
- `OrganizationUser` model created at registration with user primary key


## 1. Prerequisites

- Python 3.12+
- PostgreSQL running on your machine
- `school_db` database created


## 2. Project Setup

```bash

python3.12 -m venv env
source env/bin/activate 
pip install -U pip
pip install django
pip install django-cors-headers
pip install psycopg2-binary
pip install djangorestframework
pip install djangorestframework-simplejwt
pip install python-dotenv

```

## 3. Environment Variables

The project uses `.env`.

Current expected DB variables:

```env
DB_ENGINE=django.db.backends.postgresql
DB_NAME=school_db
DB_USER=postgres
DB_PASSWORD=school_db
DB_HOST=localhost
DB_PORT=5432
```

If your PostgreSQL credentials are different, update `.env` before migrations.


## 4. Run Migrations

```bash
source .venv/bin/activate
python manage.py makemigrations
python manage.py migrate
```

## 5. Start Development Server

```bash
source .venv/bin/activate
python manage.py runserver
```

Server runs at:

- `http://127.0.0.1:8000`

## 6. API Endpoints

Base path:

- `/api/auth/`

Endpoints:

- `POST /api/auth/register/`
- `POST /api/auth/login/`

## 7. Request/Response Examples

### Register

`POST /api/auth/register/`

Request body:

```json
{
  "username": "john",
  "email": "john@example.com",
  "phone_number": "9000000000",
  "password": "StrongPass123",
  "organization_name": "Acme School"
}
```

Success response (`201`):

```json
{
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "phone_number": "9000000000"
  },
  "tokens": {
    "refresh": "<refresh_token>",
    "access": "<access_token>"
  }
}
```

### Login

`POST /api/auth/login/`

Request body with email (you can also pass username or phone number in `login`):

```json
{
  "login": "john@example.com",
  "password": "StrongPass123"
}
```

Success response (`200`):

```json
{
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "phone_number": "9000000000"
  },
  "tokens": {
    "refresh": "<refresh_token>",
    "access": "<access_token>"
  }
}
```

## 8. Run Tests

```bash
source .venv/bin/activate
python manage.py test
```

## 9. Common Issue

If migration fails with:

- `password authentication failed for user ...`

Then either:

- your PostgreSQL username/password in `.env` is incorrect, or
- PostgreSQL user password is not what you set in `.env`.

Update credentials and run migrations again.



chmod +x entrypoint.sh


