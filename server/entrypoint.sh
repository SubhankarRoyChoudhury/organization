#!/bin/bash

echo "✅ Collecting static files..."
python manage.py collectstatic --noinput

echo "✅ Applying all remaining migrations..."
# First, mark existing tables as migrated to avoid duplicate table errors.
# python manage.py migrate --fake-initial
python manage.py migrate
# python manage.py migrate --noinput

echo "✅ Checking if superuser exists..."
if ! python manage.py shell -c "
from django.contrib.auth import get_user_model;
User = get_user_model();
exists = User.objects.filter(username='admin').exists();
print(exists)" | grep -q 'True'; then
    echo "✅ Creating superuser..."
    DJANGO_SUPERUSER_USERNAME=admin \
    DJANGO_SUPERUSER_EMAIL=admin@gmail.com \
    DJANGO_SUPERUSER_PASSWORD=admin123 \
    python manage.py createsuperuser --noinput
else
    echo "✅ Superuser already exists."
fi

# 🔧 Remaining setup tasks
# python manage.py setup_oauth2
# python manage.py loadpermissions
# python manage.py errormessages
# python manage.py createdefaultpermissiongroups
# python manage.py create_default_timeslots

# python3 manage.py seed_hospital_sidebar_faker --company-id 1

exec "$@"
