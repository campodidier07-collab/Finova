import django_filters

from .models import Movement


class MovementFilter(django_filters.FilterSet):
    date_from = django_filters.DateTimeFilter(field_name="occurred_at", lookup_expr="gte")
    date_to = django_filters.DateTimeFilter(field_name="occurred_at", lookup_expr="lte")
    has_receipt = django_filters.BooleanFilter(method="filter_has_receipt")

    class Meta:
        model = Movement
        fields = ("account", "category", "type", "date_from", "date_to", "has_receipt")

    def filter_has_receipt(self, queryset, name, value):
        if value is True:
            return queryset.exclude(receipt="").exclude(receipt__isnull=True)
        if value is False:
            return queryset.filter(receipt="") | queryset.filter(receipt__isnull=True)
        return queryset
