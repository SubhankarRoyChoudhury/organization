from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, username, email, phone_number, password, **extra_fields):
        if not username:
            raise ValueError("The username must be set")

        email = self.normalize_email(email) if email else None
        phone_number = str(phone_number).strip() if phone_number else None
        user = self.model(
            username=username,
            email=email,
            phone_number=phone_number,
            **extra_fields,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(
        self, username, email=None, phone_number=None, password=None, **extra_fields
    ):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(
            username=username,
            email=email,
            phone_number=phone_number,
            password=password,
            **extra_fields,
        )

    def create_superuser(
        self, username, email=None, phone_number=None, password=None, **extra_fields
    ):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(
            username=username,
            email=email,
            phone_number=phone_number,
            password=password,
            **extra_fields,
        )
