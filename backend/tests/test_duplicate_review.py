import datetime
import os
import sys
import unittest
from types import SimpleNamespace

from cryptography.fernet import Fernet
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_dir)
os.environ.setdefault("PLAID_ENV", "sandbox")
os.environ.setdefault("PLAID_CLIENT_ID", "test-client")
os.environ.setdefault("PLAID_SECRET", "test-secret")
os.environ["PLAID_TOKEN_ENCRYPTION_KEY"] = Fernet.generate_key().decode()

import models
import services


class DuplicateReviewTest(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        models.Base.metadata.create_all(bind=engine)
        self.db = sessionmaker(bind=engine)()
        self.account = models.Account(
            id="CHECKING",
            name="Checking",
            type="checking",
            opening_date=datetime.date(2026, 1, 1),
        )
        self.db.add(self.account)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def add_transaction(self, transaction_id, plaid_transaction_id=None):
        transaction = models.Transaction(
            id=transaction_id,
            account_id=self.account.id,
            date=datetime.date(2026, 1, 15),
            amount=-25,
            description="Coffee Shop",
            transaction_type=models.TransactionType.EXPENSE,
            plaid_transaction_id=plaid_transaction_id,
        )
        self.db.add(transaction)
        self.db.commit()
        return transaction

    def test_csv_heuristic_duplicate_is_imported_for_review(self):
        self.add_transaction("EXISTING")

        result = services.import_transactions_from_csv(
            [{
                "date": "2026-01-15",
                "description": "coffee shop",
                "amount": "-25",
            }],
            self.account.id,
            [],
            self.db,
        )

        self.assertEqual(result["transactions_created"], 1)
        self.assertEqual(result["duplicate_transactions_flagged"], 1)
        imported = self.db.query(models.Transaction).filter(
            models.Transaction.id != "EXISTING"
        ).one()
        self.assertTrue(imported.needs_review)

    def test_plaid_exact_duplicate_is_suppressed(self):
        self.add_transaction("EXISTING", plaid_transaction_id="plaid-1")
        plaid_row = SimpleNamespace(
            account_id="plaid-account",
            pending=False,
            authorized_date=datetime.date(2026, 1, 15),
            date=datetime.date(2026, 1, 15),
            name="Coffee Shop",
            amount=25,
            transaction_id="plaid-1",
        )
        self.account.plaid_account_id = "plaid-account"
        self.db.commit()

        result = services.import_transactions_from_plaid([plaid_row], self.db)

        self.assertEqual(result["created"], 0)
        self.assertEqual(result["dups"], 1)
        self.assertEqual(self.db.query(models.Transaction).count(), 1)

    def test_marking_transaction_correct_clears_review_flag(self):
        transaction = self.add_transaction("REVIEW", plaid_transaction_id="plaid-2")
        transaction.needs_review = True
        self.db.commit()

        updated = services.update_transaction(
            self.db,
            transaction.id,
            {"needs_review": False},
        )

        self.assertFalse(updated["needs_review"])


if __name__ == "__main__":
    unittest.main()
