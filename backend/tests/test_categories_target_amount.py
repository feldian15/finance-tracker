import os
import sys
import tempfile
import unittest

from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


class CategoryTargetAmountTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._cwd = os.getcwd()
        cls._tmpdir = tempfile.TemporaryDirectory()
        os.chdir(cls._tmpdir.name)

        backend_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..")
        )
        sys.path.insert(0, backend_dir)
        os.environ.setdefault("PLAID_ENV", "sandbox")
        os.environ.setdefault("PLAID_CLIENT_ID", "test-client")
        os.environ.setdefault("PLAID_SECRET", "test-secret")
        os.environ["PLAID_TOKEN_ENCRYPTION_KEY"] = (
            Fernet.generate_key().decode()
        )

        import main
        import models

        cls.client = TestClient(main.app)
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.testing_session_factory = sessionmaker(bind=cls.engine)
        cls.models = models
        cls.main = main

        def override_get_db():
            db = cls.testing_session_factory()
            try:
                yield db
            finally:
                db.close()

        main.app.dependency_overrides[main.get_db] = override_get_db

    @classmethod
    def tearDownClass(cls):
        cls.main.app.dependency_overrides.clear()
        os.chdir(cls._cwd)
        cls._tmpdir.cleanup()

    def setUp(self):
        self.models.Base.metadata.drop_all(bind=self.engine)
        self.models.Base.metadata.create_all(bind=self.engine)

    def test_create_read_and_update_category_target_amount(self):
        response = self.client.post(
            "/categories",
            json={
                "name": "Groceries",
                "reporting_group": "expense",
                "target_amount": 500,
            },
        )

        self.assertEqual(response.status_code, 200)
        category = response.json()
        self.assertEqual(category["target_amount"], 500)

        response = self.client.get("/categories")

        self.assertEqual(response.status_code, 200)
        categories = response.json()
        saved_category = next(
            cat for cat in categories if cat["id"] == category["id"]
        )
        self.assertEqual(saved_category["target_amount"], 500)

        response = self.client.patch(
            f"/categories/{category['id']}",
            json={"target_amount": None},
        )

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["target_amount"])

    def test_zero_target_amount_is_allowed(self):
        response = self.client.post(
            "/categories",
            json={
                "name": "Dining",
                "reporting_group": "expense",
                "target_amount": 0,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["target_amount"], 0)

    def test_negative_target_amount_is_rejected(self):
        response = self.client.post(
            "/categories",
            json={
                "name": "Utilities",
                "reporting_group": "expense",
                "target_amount": -1,
            },
        )

        self.assertEqual(response.status_code, 422)

    def test_system_category_cannot_be_created(self):
        response = self.client.post(
            "/categories",
            json={
                "name": "System Category",
                "reporting_group": "system",
                "target_amount": 100,
            },
        )

        self.assertEqual(response.status_code, 400)

    def test_category_cannot_be_changed_to_system_reporting_group(self):
        response = self.client.post(
            "/categories",
            json={
                "name": "Car",
                "reporting_group": "expense",
                "target_amount": 300,
            },
        )
        category = response.json()

        response = self.client.patch(
            f"/categories/{category['id']}",
            json={"reporting_group": "system"},
        )

        self.assertEqual(response.status_code, 400)

    def test_lightweight_schema_update_adds_target_amount_column(self):
        import services

        engine = create_engine("sqlite:///legacy.db")

        with engine.begin() as conn:
            conn.execute(
                text(
                    "CREATE TABLE categories ("
                    "id VARCHAR PRIMARY KEY, "
                    "name VARCHAR NOT NULL UNIQUE, "
                    "reporting_group VARCHAR(11) NOT NULL"
                    ")"
                )
            )

        services.ensure_category_target_amount_column(engine)

        columns = inspect(engine).get_columns("categories")
        self.assertIn(
            "target_amount",
            [column["name"] for column in columns],
        )


if __name__ == "__main__":
    unittest.main()
