from rest_framework import serializers


class JsonAnalysisSerializer(serializers.Serializer):
    records = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False,
        help_text="Lista de registros discentes em formato JSON.",
    )
    include_terms = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
    )
    exclude_terms = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
    )


class FileAnalysisSerializer(serializers.Serializer):
    files = serializers.ListField(
        child=serializers.FileField(),
        allow_empty=False,
        help_text="Um ou mais arquivos CSV, Excel ou JSON para diagnostico.",
    )
    include_terms = serializers.CharField(required=False, allow_blank=True)
    exclude_terms = serializers.CharField(required=False, allow_blank=True)

    def to_internal_value(self, data):
        mutable = data.copy()
        if hasattr(data, "getlist"):
            mutable.setlist("files", data.getlist("files") or data.getlist("file"))
        return super().to_internal_value(mutable)
