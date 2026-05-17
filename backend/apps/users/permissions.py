from rest_framework.permissions import BasePermission


class IsActiveMember(BasePermission):
    message = 'Membership is not active. Contact gym management.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.profile.membership_status == 'active'
        except Exception:
            return False


class IsAdmin(BasePermission):
    message = 'Admin access required.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_admin
        )
