import django_filters

from .models import Movement


class MovementFilter(django_filters.FilterSet):
    date_from = django_filters.DateTimeFilter(field_name="occurred_at", lookup_expr="gte")
    date_to = django_filters.DateTimeFilter(field_name="occurred_at", lookup_expr="lte")

    class Meta:
        model = Movement
        fields = ("account", "category", "type", "date_from", "date_to")
