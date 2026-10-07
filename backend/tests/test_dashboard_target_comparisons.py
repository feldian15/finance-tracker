import datetime
import os
import sys
import unittest

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


class DashboardTargetComparisonsTest(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        models.Base.metadata.create_all(bind=engine)
        self.db = sessionmaker(bind=engine)()

    def tearDown(self):
        self.db.close()

    def create_category(self, name, target_amount):
        category = models.Category(
            id=name.upper(),
            name=name,
            reporting_group=models.ReportingGroup.EXPENSE,
            target_amount=target_amount,
        )

        self.db.add(category)
        self.db.commit()

        return category

    def create_account(self):
        account = models.Account(
            id="CHECKING",
            name="Checking",
            type="checking",
            opening_balance=0,
            opening_date=datetime.date(2026, 1, 1),
        )

        self.db.add(account)
        self.db.commit()

        return account

    def create_transaction(self, account_id, category_id, amount):
        transaction = models.Transaction(
            id=f"TXN_{category_id}",
            account_id=account_id,
            amount=amount,
            description="Target comparison test",
            date=datetime.date(2026, 1, 15),
            category_id=category_id,
            transaction_type=models.TransactionType.EXPENSE,
        )

        self.db.add(transaction)
        self.db.commit()

    def test_category_spending_includes_target_comparisons(self):
        account = self.create_account()
        groceries = self.create_category("Groceries", 100)
        utilities = self.create_category("Utilities", None)
        dining = self.create_category("Dining", 0)
        gym = self.create_category("Gym", 50)

        self.create_transaction(account.id, groceries.id, -150)
        self.create_transaction(account.id, utilities.id, -25)
        self.create_transaction(account.id, dining.id, -10)

        result = services.get_category_spending(
            self.db,
            start_date=datetime.date(2026, 1, 1),
            end_date=datetime.date(2026, 1, 31),
        )
        categories = {
            category["category_id"]: category
            for category in result["categories"]
        }

        self.assertEqual(categories[groceries.id]["target_amount"], 100)
        self.assertEqual(
            categories[groceries.id]["target_difference"],
            50,
        )
        self.assertEqual(
            categories[groceries.id]["target_percent_difference"],
            50,
        )

        self.assertIsNone(categories[utilities.id]["target_amount"])
        self.assertIsNone(categories[utilities.id]["target_difference"])
        self.assertIsNone(
            categories[utilities.id]["target_percent_difference"]
        )

        self.assertEqual(categories[dining.id]["target_amount"], 0)
        self.assertEqual(categories[dining.id]["target_difference"], 10)
        self.assertIsNone(
            categories[dining.id]["target_percent_difference"]
        )

        self.assertIn(gym.id, categories)
        self.assertEqual(categories[gym.id]["avg_total"], 0)
        self.assertEqual(categories[gym.id]["target_amount"], 50)
        self.assertEqual(categories[gym.id]["target_difference"], -50)
        self.assertEqual(
            categories[gym.id]["target_percent_difference"],
            -100,
        )


if __name__ == "__main__":
    unittest.main()
