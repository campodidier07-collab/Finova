from rest_framework import serializers

from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "type", "color", "icon", "is_default")
        read_only_fields = ("id", "is_default")

    def create(self, validated_data: dict) -> Category:
        validated_data["user"] = self.context["request"].user
        validated_data["is_default"] = False
        return super().create(validated_data)
