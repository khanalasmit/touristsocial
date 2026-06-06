"""
Management command: seed_demo_users

Creates two tourist users near Kathmandu city center with active location
sharing — lets you test the Explore / nearby-users map in local dev.

Usage:
    python manage.py seed_demo_users
    python manage.py seed_demo_users --lat 27.7172 --lon 85.3240   # custom origin
    python manage.py seed_demo_users --clear                        # remove demo users

Demo accounts created
---------------------
  priya@demo.com   / demo1234
  raj@demo.com     / demo1234
"""

import random
import math

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from tourist.models import TouristProfile, UserLocation

User = get_user_model()

# Small coordinate offset so users appear ~200-500 m apart
def _offset(base: float, km: float) -> float:
    """Shift a coordinate by roughly `km` kilometres."""
    return base + km / 111.0  # 1 degree ≈ 111 km

DEMO_USERS = [
    {
        "email": "priya@demo.com",
        "username": "Priya",
        "password": "demo1234",
        "profile": {
            "bio": "Solo backpacker exploring the Himalayas",
            "travel_style": "backpacker",
            "budget_category": "budget",
        },
        # offset from origin in km
        "lat_offset_km":  0.3,
        "lon_offset_km":  0.2,
    },
    {
        "email": "raj@demo.com",
        "username": "Raj",
        "password": "demo1234",
        "profile": {
            "bio": "Cultural explorer, lover of temples and street food",
            "travel_style": "cultural",
            "budget_category": "mid",
        },
        "lat_offset_km": -0.25,
        "lon_offset_km":  0.35,
    },
]


class Command(BaseCommand):
    help = "Seed two demo tourist users with nearby locations for the Explore map."

    def add_arguments(self, parser):
        parser.add_argument(
            "--lat", type=float, default=27.7172,
            help="Origin latitude  (default: Kathmandu centre 27.7172)"
        )
        parser.add_argument(
            "--lon", type=float, default=85.3240,
            help="Origin longitude (default: Kathmandu centre 85.3240)"
        )
        parser.add_argument(
            "--clear", action="store_true",
            help="Delete the demo users instead of creating them"
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self._clear()
            return

        origin_lat = options["lat"]
        origin_lon = options["lon"]

        self.stdout.write(self.style.MIGRATE_HEADING(
            f"\nSeeding demo users around ({origin_lat}, {origin_lon})\n"
        ))

        for data in DEMO_USERS:
            user, created = User.objects.get_or_create(
                email=data["email"],
                defaults={"username": data["username"]},
            )
            user.set_password(data["password"])
            user.save()

            # Update profile fields
            profile = user.profile  # created by signal
            for field, value in data["profile"].items():
                setattr(profile, field, value)
            profile.save()

            # Place them near the origin
            lat = _offset(origin_lat, data["lat_offset_km"])
            lon = _offset(origin_lon, data["lon_offset_km"])

            location, _ = UserLocation.objects.update_or_create(
                user=user,
                defaults={
                    "latitude": lat,
                    "longitude": lon,
                    "is_sharing": True,
                },
            )

            verb = "Created" if created else "Updated"
            self.stdout.write(
                f"  [OK] {verb}: {data['email']}  lat={lat:.5f}, lon={lon:.5f}"
            )

        self.stdout.write(self.style.SUCCESS(
            "\nDone! Log in as your main account and open /explore "
            "-- both demo users will appear on the map.\n"
            "\n  priya@demo.com  /  demo1234"
            "\n  raj@demo.com    /  demo1234\n"
        ))

    def _clear(self):
        emails = [d["email"] for d in DEMO_USERS]
        deleted, _ = User.objects.filter(email__in=emails).delete()
        self.stdout.write(self.style.WARNING(
            f"Removed {deleted} demo user record(s)."
        ))
