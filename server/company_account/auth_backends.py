from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q


class EmailOrUsernameBackend(ModelBackend):
    """
    Authenticate with either username or email (case-insensitive).
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        identifier = username or kwargs.get(UserModel.USERNAME_FIELD) or kwargs.get("email")
        if not identifier or password is None:
            return None

        identifier = identifier.strip()
        user = UserModel.objects.filter(
            Q(username__iexact=identifier) | Q(email__iexact=identifier)
        ).first()
        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
