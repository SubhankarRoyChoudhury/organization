#!/bin/bash

echo "Starting backend..."

# Backend
cd server || exit
source env/bin/activate
python manage.py migrate

# Run Django server in background
python manage.py runserver &

# Go back
cd ..

echo "Starting login frontend..."

# Login frontend
cd login || exit
npm install
npm run dev &

cd ..

echo "Starting account management frontend..."

# Account management frontend
# cd new_account_management || exit
# npm install
# npm run dev &

# cd ..

echo "Starting hospital frontend..."

# Hospital frontend
cd hospital-management || exit
npm install
npm run dev &

cd ..

echo "Starting clinic frontend..."

# Clinic frontend
cd clinic-management || exit
npm install
npm run dev &

cd ..

echo "Starting school frontend..."

# School frontend
cd school-management || exit
npm install
npm run dev &

cd ..

# Payroll frontend
# cd vidya_payroll-management || exit
# npm install
# npm run dev &

# cd ..

# Payroll frontend
# cd swasthya_payroll-management || exit
# npm install
# npm run dev &

# cd ..


echo "All services started 🚀"

# Keep script running
wait
