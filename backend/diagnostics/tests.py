from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from diagnostics.services import analyze_data_files, analyze_records, detect_csv_format


class AnalysisServiceTests(TestCase):
    def test_analyze_records_calculates_protocol_metrics(self):
        result = analyze_records(
            [
                {"genero": "F", "curso": "Ciencia da Computacao", "ano_ingresso": 2022, "situacao": "Cancelado"},
                {
                    "genero": "F",
                    "curso": "Ciencia da Computacao",
                    "ano_ingresso": 2022,
                    "ano_conclusao": 2024,
                    "situacao": "Concluido",
                },
                {"genero": "M", "curso": "Ciencia da Computacao", "ano_ingresso": 2022, "situacao": "Ativo"},
                {
                    "genero": "M",
                    "curso": "Ciencia da Computacao",
                    "ano_ingresso": 2022,
                    "ano_conclusao": 2024,
                    "situacao": "Concluido",
                },
                {"genero": "F", "curso": "Direito", "ano_ingresso": 2022, "situacao": "Ativo"},
            ]
        )

        metric = result["metrics"][0]
        self.assertEqual(metric["ingressantes_total"], 4)
        self.assertEqual(metric["M1_perc_mulheres_ingressantes"], 50.0)
        self.assertEqual(metric["TEF"], 50.0)
        self.assertEqual(metric["TEM"], 0.0)
        self.assertEqual(metric["M2_gap_evasao"], 50.0)
        self.assertEqual(result["completion_metrics"][0]["ano"], 2024)
        self.assertEqual(result["completion_metrics"][0]["M3_perc_mulheres_concluintes"], 50.0)
        self.assertEqual(result["latest_diagnostic"]["M3"], 50.0)

    def test_detect_csv_format_supports_semicolon(self):
        encoding, separator = detect_csv_format(b"genero;curso;ano_ingresso\nF;TI;2024\n")

        self.assertEqual(encoding, "utf-8")
        self.assertEqual(separator, ";")

    def test_analyze_data_files_uses_local_csv_folder(self):
        result = analyze_data_files()

        self.assertEqual(result["data_source"]["type"], "local_files")
        self.assertGreater(result["data_source"]["files_count"], 0)
        self.assertIn("metrics", result)
        self.assertGreater(len(result["distributions"]["institutions"]), 0)
        self.assertIsNotNone(result["teacher_profile"])
        self.assertGreater(result["teacher_profile"]["summary"]["active_records"], 0)
        self.assertIn("M4_perc_mulheres_docentes", result["teacher_profile"]["summary"])
        self.assertIn("M5_perc_mulheres_lideranca", result["teacher_profile"]["summary"])
        self.assertGreater(result["teacher_profile"]["summary"]["leadership_records"], 0)


class AnalysisApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_demo_endpoint_returns_metrics(self):
        response = self.client.get("/api/demo/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("metrics", response.data)
        self.assertGreater(len(response.data["metrics"]), 0)
        self.assertEqual(response.data["data_source"]["type"], "local_files")

    def test_json_endpoint_validates_and_analyzes_records(self):
        response = self.client.post(
            "/api/analyze-json/",
            {
                "records": [
                    {
                        "sexo": "F",
                        "nome_curso": "Sistemas de Informacao",
                        "ano_de_ingresso": 2024,
                        "situacao": "Matriculado",
                    },
                    {
                        "sexo": "M",
                        "nome_curso": "Sistemas de Informacao",
                        "ano_de_ingresso": 2024,
                        "situacao": "Cancelado",
                    },
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["metrics"][0]["ingressantes_total"], 2)

    def test_file_endpoint_accepts_csv_upload(self):
        csv_file = SimpleUploadedFile(
            "coorte.csv",
            b"genero,curso,ano_ingresso,situacao\nF,Ciencia da Computacao,2024,Ativo\nM,Ciencia da Computacao,2024,Cancelado\n",
            content_type="text/csv",
        )

        response = self.client.post("/api/analyze/", {"files": [csv_file]}, format="multipart")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["files"][0]["detected_type"], "COORTE")
        self.assertEqual(response.data["metrics"][0]["ingressantes_total"], 2)
