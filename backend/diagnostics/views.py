from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from diagnostics.serializers import FileAnalysisSerializer, JsonAnalysisSerializer
from diagnostics.services import (
    DEFAULT_TI_CONFIG,
    analyze_data_files,
    analyze_files,
    analyze_records,
)


class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({"status": "ok", "service": "equidade-genero-ti-api"})


class ConfigView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response(
            {
                "ti_terms": DEFAULT_TI_CONFIG,
                "accepted_formats": ["csv", "xls", "xlsx", "json"],
                "implemented_metrics": ["M1", "M2", "M3", "M4", "M5"],
            }
        )


class FileAnalysisView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = FileAnalysisSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        try:
            result = analyze_files(
                payload["files"],
                include_terms=_split_terms(payload.get("include_terms")),
                exclude_terms=_split_terms(payload.get("exclude_terms")),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


class JsonAnalysisView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = JsonAnalysisSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        try:
            result = analyze_records(
                payload["records"],
                include_terms=payload.get("include_terms"),
                exclude_terms=payload.get("exclude_terms"),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


class DemoAnalysisView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        try:
            result = analyze_data_files(
                include_terms=_split_terms(request.query_params.get("include_terms")),
                exclude_terms=_split_terms(request.query_params.get("exclude_terms")),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


def _split_terms(value):
    if not value:
        return None
    return [item.strip() for item in value.replace(",", "\n").splitlines() if item.strip()]
