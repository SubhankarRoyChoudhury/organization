from django.core.management.base import BaseCommand
from oauth2_provider.models import Application
from django.contrib.auth.models import User
import uuid
from django.contrib.auth import get_user_model
import os
from dotenv import load_dotenv
load_dotenv()




class Command(BaseCommand):
    help = "Create an OAuth2 application"

    def handle(self, *args, **kwargs):
        User = get_user_model()
        admin_user = User.objects.filter(is_superuser=True).first()
        print("admin_user",admin_user)

        if not admin_user:
            self.stdout.write("No superuser found. Please create a superuser first.")
            return

        # Check if admin_user id is 1 and is_superuser is True
        # if admin_user.id == 1 and admin_user.is_superuser:
        if admin_user and admin_user.is_superuser:
            try:
                # Check if an Application with the same client_id already exists
                app = Application.objects.filter(client_id=os.getenv("CLIENT_ID")).first()

                if not app:
                    # If no app found, create a new one
                    app = Application.objects.create(
                        name=os.getenv("app_name"),
                        client_id=os.getenv("CLIENT_ID"),
                        client_secret=os.getenv("CLIENT_SECRET"),
                        user=admin_user,
                        client_type=Application.CLIENT_CONFIDENTIAL,
                        authorization_grant_type=Application.GRANT_PASSWORD,
                        redirect_uris="http://localhost/callback",
                    )
                    self.stdout.write(f"Created OAuth2 Application: Client ID: {app.client_id}, Client Secret: {app.client_secret}")
                else:
                    # If the application exists, print a message
                    self.stdout.write(f"OAuth2 Application already exists: Client ID: {app.client_id}, Client Secret: {app.client_secret}")

            except Exception as e:
                self.stdout.write(f"Error creating OAuth2 Application: {str(e)}")
        else:
            # If the admin_user's id is not 1 or they are not a superuser, just return the client ID and secrets
            self.stdout.write(f"Client ID:{os.getenv('CLIENT_ID')}")
            self.stdout.write(f"Client Secret: {os.getenv('CLIENT_SECRET')}")