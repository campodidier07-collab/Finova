from django.urls import path

from .views import DashboardSummaryView, PeriodReportView, ReportSnapshotListView

urlpatterns = [
    path("dashboard/", DashboardSummaryView.as_view(), name="reports-dashboard"),
    path("period/", PeriodReportView.as_view(), name="reports-period"),
    path("snapshots/", ReportSnapshotListView.as_view(), name="reports-snapshots"),
]
