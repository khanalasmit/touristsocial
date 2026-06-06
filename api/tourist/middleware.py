from django.utils import timezone


class UpdateLastSeenMiddleware:
    """
    Updates TouristProfile.last_seen on every authenticated HTTP request.
    Uses update() to avoid triggering post_save signals.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.user.is_authenticated:
            try:
                from .models import TouristProfile
                TouristProfile.objects.filter(user=request.user).update(last_seen=timezone.now())
            except Exception:
                pass
        return response
