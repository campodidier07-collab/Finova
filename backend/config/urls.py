from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health_check(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/auth/", include("apps.users.urls")),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/categories/", include("apps.categories.urls")),
    path("api/movements/", include("apps.ledger.urls")),
    path("api/reports/", include("apps.reports.urls")),
    path("api/subscriptions/", include("apps.subscriptions.urls")),
    path("api/debts/", include("apps.debts.urls")),
    path("api/system/", include("apps.system.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
