from django.core.management.base import BaseCommand

from apps.categories.models import Category

DEFAULT_CATEGORIES = [
    ("Salario", Category.CategoryType.INCOME, "#16a34a", "briefcase"),
    ("Freelance", Category.CategoryType.INCOME, "#0d9488", "laptop"),
    ("Inversiones", Category.CategoryType.INCOME, "#2563eb", "trending-up"),
    ("Otros ingresos", Category.CategoryType.INCOME, "#65a30d", "plus-circle"),
    ("Alimentación", Category.CategoryType.EXPENSE, "#ea580c", "utensils"),
    ("Transporte", Category.CategoryType.EXPENSE, "#d97706", "car"),
    ("Vivienda", Category.CategoryType.EXPENSE, "#7c3aed", "home"),
    ("Servicios", Category.CategoryType.EXPENSE, "#0284c7", "zap"),
    ("Salud", Category.CategoryType.EXPENSE, "#e11d48", "heart-pulse"),
    ("Entretenimiento", Category.CategoryType.EXPENSE, "#db2777", "film"),
    ("Educación", Category.CategoryType.EXPENSE, "#4f46e5", "book-open"),
    ("Otros gastos", Category.CategoryType.EXPENSE, "#64748b", "tag"),
]


class Command(BaseCommand):
    help = "Seed default income and expense categories."

    def handle(self, *args, **options) -> None:
        created_count = 0
        for name, cat_type, color, icon in DEFAULT_CATEGORIES:
            _, created = Category.objects.get_or_create(
                user=None,
                name=name,
                type=cat_type,
                defaults={"color": color, "icon": icon, "is_default": True},
            )
            if created:
                created_count += 1
        self.stdout.write(self.style.SUCCESS(f"Seeded {created_count} default categories."))
