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


class DashboardChartDataTest(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        models.Base.metadata.create_all(bind=engine)
        self.db = sessionmaker(bind=engine)()

    def tearDown(self):
        self.db.close()

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

    def create_category(
        self,
        category_id,
        name,
        reporting_group,
        target_amount=100,
    ):
        category = models.Category(
            id=category_id,
            name=name,
            reporting_group=reporting_group,
            target_amount=target_amount,
        )

        self.db.add(category)
        self.db.commit()

        return category

    def create_transaction(self, transaction_id, account_id, category_id, amount, txn_date):
        transaction = models.Transaction(
            id=transaction_id,
            account_id=account_id,
            amount=amount,
            description="Chart data test",
            date=txn_date,
            category_id=category_id,
            transaction_type=models.TransactionType.EXPENSE,
        )

        self.db.add(transaction)
        self.db.commit()

    def test_monthly_chart_data_aggregates_categories_and_groups(self):
        account = self.create_account()
        groceries = self.create_category(
            "GROCERIES",
            "Groceries",
            models.ReportingGroup.EXPENSE,
        )
        utilities = self.create_category(
            "UTILITIES",
            "Utilities",
            models.ReportingGroup.EXPENSE,
        )
        paychecks = self.create_category(
            "PAYCHECKS",
            "Paychecks",
            models.ReportingGroup.INCOME,
        )
        internal_transfer = self.create_category(
            "INTERNAL_TRANSFER",
            "Internal Transfer",
            models.ReportingGroup.SYSTEM,
        )

        self.create_transaction(
            "JAN_GROCERY_1",
            account.id,
            groceries.id,
            -45,
            datetime.date(2026, 1, 10),
        )
        self.create_transaction(
            "JAN_GROCERY_2",
            account.id,
            groceries.id,
            -30,
            datetime.date(2026, 1, 20),
        )
        self.create_transaction(
            "FEB_UTILITIES",
            account.id,
            utilities.id,
            -80,
            datetime.date(2026, 2, 3),
        )
        self.create_transaction(
            "FEB_PAYCHECK",
            account.id,
            paychecks.id,
            1200,
            datetime.date(2026, 2, 15),
        )
        self.create_transaction(
            "SYSTEM_TRANSFER",
            account.id,
            internal_transfer.id,
            -300,
            datetime.date(2026, 2, 16),
        )
        self.create_transaction(
            "OUTSIDE_PERIOD",
            account.id,
            groceries.id,
            -999,
            datetime.date(2026, 3, 1),
        )

        result = services.get_dashboard_chart_data(
            self.db,
            start_date=datetime.date(2026, 1, 1),
            end_date=datetime.date(2026, 2, 28),
        )

        self.assertEqual(
            result["months"],
            [
                {"month": "2026-01", "label": "Jan 2026"},
                {"month": "2026-02", "label": "Feb 2026"},
            ],
        )

        categories = {
            category["category_id"]: category
            for category in result["categories"]
        }
        self.assertNotIn(internal_transfer.id, categories)
        self.assertEqual(
            categories[groceries.id]["series"],
            [
                {"month": "2026-01", "total": 75.0},
                {"month": "2026-02", "total": 0.0},
            ],
        )
        self.assertEqual(
            categories[utilities.id]["series"],
            [
                {"month": "2026-01", "total": 0.0},
                {"month": "2026-02", "total": 80.0},
            ],
        )

        groups = {
            group["reporting_group"]: group
            for group in result["groups"]
        }
        self.assertEqual(
            groups["expense"]["series"],
            [
                {"month": "2026-01", "total": 75.0},
                {"month": "2026-02", "total": 80.0},
            ],
        )
        self.assertEqual(
            groups["income"]["series"],
            [
                {"month": "2026-01", "total": 0.0},
                {"month": "2026-02", "total": 1200.0},
            ],
        )

    def test_category_chart_data_includes_only_active_or_targeted_categories(self):
        account = self.create_account()
        active = self.create_category(
            "ACTIVE",
            "Active",
            models.ReportingGroup.EXPENSE,
            target_amount=None,
        )
        has_target_amount = self.create_category(
            "HAS_TARGET_AMOUNT",
            "Has Target Amount",
            models.ReportingGroup.EXPENSE,
            target_amount=50,
        )
        zero_target_amount_idle = self.create_category(
            "ZERO_TARGET_AMOUNT_IDLE",
            "Zero Target Amount Idle",
            models.ReportingGroup.EXPENSE,
            target_amount=0,
        )
        no_target_idle = self.create_category(
            "NO_TARGET_IDLE",
            "No Target Idle",
            models.ReportingGroup.EXPENSE,
            target_amount=None,
        )
        outside_period = self.create_category(
            "OUTSIDE_PERIOD",
            "Outside Period",
            models.ReportingGroup.EXPENSE,
            target_amount=None,
        )

        self.create_transaction(
            "ACTIVE_TXN",
            account.id,
            active.id,
            -30,
            datetime.date(2026, 1, 10),
        )
        self.create_transaction(
            "OUTSIDE_TXN",
            account.id,
            outside_period.id,
            -40,
            datetime.date(2026, 2, 10),
        )

        result = services.get_dashboard_chart_data(
            self.db,
            start_date=datetime.date(2026, 1, 1),
            end_date=datetime.date(2026, 1, 31),
        )

        category_ids = [
            category["category_id"]
            for category in result["categories"]
        ]

        self.assertIn(active.id, category_ids)
        self.assertIn(has_target_amount.id, category_ids)
        self.assertNotIn(zero_target_amount_idle.id, category_ids)
        self.assertNotIn(no_target_idle.id, category_ids)
        self.assertNotIn(outside_period.id, category_ids)

    def test_category_chart_data_returns_target_threshold_only_for_target_amounts(self):
        account = self.create_account()
        groceries = self.create_category(
            "GROCERIES",
            "Groceries",
            models.ReportingGroup.EXPENSE,
            target_amount=100,
        )
        dining = self.create_category(
            "DINING",
            "Dining",
            models.ReportingGroup.EXPENSE,
            target_amount=0,
        )
        utilities = self.create_category(
            "UTILITIES",
            "Utilities",
            models.ReportingGroup.EXPENSE,
            target_amount=None,
        )

        self.create_transaction(
            "DINING_TXN",
            account.id,
            dining.id,
            -20,
            datetime.date(2026, 1, 10),
        )
        self.create_transaction(
            "UTILITIES_TXN",
            account.id,
            utilities.id,
            -30,
            datetime.date(2026, 1, 12),
        )

        result = services.get_dashboard_chart_data(
            self.db,
            start_date=datetime.date(2026, 1, 1),
            end_date=datetime.date(2026, 1, 31),
        )

        categories = {
            category["category_id"]: category
            for category in result["categories"]
        }

        self.assertEqual(categories[groceries.id]["target_threshold"], 100)
        self.assertIsNone(categories[dining.id]["target_threshold"])
        self.assertIsNone(categories[utilities.id]["target_threshold"])

    def test_reporting_group_chart_data_aggregates_monthly_actuals(self):
        account = self.create_account()
        groceries = self.create_category(
            "GROCERIES",
            "Groceries",
            models.ReportingGroup.EXPENSE,
        )
        utilities = self.create_category(
            "UTILITIES",
            "Utilities",
            models.ReportingGroup.EXPENSE,
        )
        paychecks = self.create_category(
            "PAYCHECKS",
            "Paychecks",
            models.ReportingGroup.INCOME,
        )
        internal_transfer = self.create_category(
            "INTERNAL_TRANSFER",
            "Internal Transfer",
            models.ReportingGroup.SYSTEM,
        )

        self.create_transaction(
            "JAN_GROCERY",
            account.id,
            groceries.id,
            -30,
            datetime.date(2026, 1, 5),
        )
        self.create_transaction(
            "JAN_UTILITIES",
            account.id,
            utilities.id,
            -40,
            datetime.date(2026, 1, 10),
        )
        self.create_transaction(
            "FEB_PAYCHECK",
            account.id,
            paychecks.id,
            1500,
            datetime.date(2026, 2, 1),
        )
        self.create_transaction(
            "SYSTEM_TXN",
            account.id,
            internal_transfer.id,
            -999,
            datetime.date(2026, 2, 2),
        )

        result = services.get_dashboard_chart_data(
            self.db,
            start_date=datetime.date(2026, 1, 1),
            end_date=datetime.date(2026, 2, 28),
        )

        groups = {
            group["reporting_group"]: group
            for group in result["groups"]
        }

        self.assertNotIn("system", groups)
        self.assertEqual(
            groups["expense"]["series"],
            [
                {"month": "2026-01", "total": 70.0},
                {"month": "2026-02", "total": 0.0},
            ],
        )
        self.assertEqual(
            groups["income"]["series"],
            [
                {"month": "2026-01", "total": 0.0},
                {"month": "2026-02", "total": 1500.0},
            ],
        )


if __name__ == "__main__":
    unittest.main()
