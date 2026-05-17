from django.core.management.base import BaseCommand
from apps.equipment.models import Equipment

EQUIPMENT = [
    {'name': 'Barbell', 'description': 'Standard Olympic barbell (20kg)', 'usage_guide': 'Use with weight plates for compound lifts like squat, deadlift, bench press. Ensure collars are secured before lifting.'},
    {'name': 'Dumbbell Set', 'description': 'Adjustable dumbbells (2-40kg)', 'usage_guide': 'Grip firmly with thumb wrapped around handle. Keep wrists neutral for most exercises.'},
    {'name': 'Cable Machine', 'description': 'Multi-station cable pulley system', 'usage_guide': 'Adjust the pin to appropriate weight. Cable flyes, tricep pushdowns, lat pulldowns.'},
    {'name': 'Leg Press Machine', 'description': 'Plate-loaded leg press', 'usage_guide': 'Place feet shoulder-width on platform. Do not lock knees at the top.'},
    {'name': 'Treadmill', 'description': 'Motorized treadmill', 'usage_guide': 'Start at a slow speed. Use safety clip. Increase incline for more calorie burn.'},
    {'name': 'Pull-up Bar', 'description': 'Wall-mounted pull-up bar', 'usage_guide': 'Grip slightly wider than shoulder-width. Engage lats, pull chest to bar.'},
    {'name': 'Bench Press', 'description': 'Flat adjustable bench with rack', 'usage_guide': 'Set safety bars appropriately. Keep feet flat, arch natural, retract shoulder blades.'},
    {'name': 'Kettlebells', 'description': 'Cast iron kettlebells (8-32kg)', 'usage_guide': 'Swing with hip hinge, not arm lift. Turkish get-ups build total-body stability.'},
]


class Command(BaseCommand):
    help = 'Seed gym equipment data'

    def handle(self, *args, **options):
        for item in EQUIPMENT:
            Equipment.objects.get_or_create(name=item['name'], defaults=item)
        self.stdout.write(self.style.SUCCESS(f'Seeded {len(EQUIPMENT)} equipment items.'))
