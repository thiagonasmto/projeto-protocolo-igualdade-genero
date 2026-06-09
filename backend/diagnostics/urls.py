from django.urls import path

from diagnostics import views

urlpatterns = [
    path("health/", views.HealthCheckView.as_view(), name="health-check"),
    path("config/", views.ConfigView.as_view(), name="diagnostics-config"),
    path("analyze/", views.FileAnalysisView.as_view(), name="file-analysis"),
    path("analyze-json/", views.JsonAnalysisView.as_view(), name="json-analysis"),
    path("demo/", views.DemoAnalysisView.as_view(), name="demo-analysis"),
]
