from django.db.models import Q
from rest_framework import viewsets

from .models import Category
from .serializers import CategorySerializer


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    filterset_fields = ("type",)
    search_fields = ("name",)

    def get_queryset(self):
        return Category.objects.filter(
            Q(user=self.request.user) | Q(user__isnull=True, is_default=True)
        )

    def perform_destroy(self, instance: Category) -> None:
        if instance.is_default or instance.user_id != self.request.user.id:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Cannot delete default or foreign categories.")
        super().perform_destroy(instance)
