from django.urls import path

from .views import (
    BalanceTrendView,
    DashboardSummaryView,
    PeriodReportExportXlsxView,
    PeriodReportView,
    ReportSnapshotListView,
)

urlpatterns = [
    path("dashboard/", DashboardSummaryView.as_view(), name="reports-dashboard"),
    path("balance-trend/", BalanceTrendView.as_view(), name="reports-balance-trend"),
    path("period/", PeriodReportView.as_view(), name="reports-period"),
    path("export-xlsx/", PeriodReportExportXlsxView.as_view(), name="reports-export-xlsx"),
    path("snapshots/", ReportSnapshotListView.as_view(), name="reports-snapshots"),
]
