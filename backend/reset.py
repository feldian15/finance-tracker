# reset_db.py
# Run with: python reset_db.py

import os
import uuid
from datetime import date

from db import Base, engine, SessionLocal
import models

DB_FILE = "finance.db"

# # --- Delete old DB ---
# if os.path.exists(DB_FILE):
#     os.remove(DB_FILE)

# --- Recreate tables ---
Base.metadata.create_all(bind=engine)

from sqlalchemy import text

# with engine.begin() as conn:
#     conn.execute(text("""
#         ALTER TABLE plaid_items
#         ADD COLUMN cursor TEXT
#     """))

db = SessionLocal()

accs = db.query(models.PlaidItem).delete()
db.commit()

# # --- Create test account ---
# test_account = models.Account(
#     id=str(uuid.uuid4()),
#     name="Test Checking",
#     type="checking",
#     opening_balance=0,
#     opening_date=date(2026, 1, 1)
# )

# db.add(test_account)

# # --- Categories ---
# food = models.Category(
#     id=str(uuid.uuid4()),
#     name="Eating Out",
#     reporting_group=models.ReportingGroup.EXPENSE
# )

# rent = models.Category(
#     id=str(uuid.uuid4()),
#     name="Rent",
#     reporting_group=models.ReportingGroup.EXPENSE
# )

# db.add_all([food, rent])
# db.commit()

# # --- Rules ---
# rules = [
#     models.CategoryRule(
#         id=str(uuid.uuid4()),
#         description_pattern="chipotle",
#         category_id=food.id,
#         priority=10
#     ),
#     models.CategoryRule(
#         id=str(uuid.uuid4()),
#         description_pattern="check cashed",
#         amount_equals=-500,
#         category_id=rent.id,
#         priority=20
#     )
# ]

# db.add_all(rules)
# db.commit()

print("Database reset complete.")
#print("Test account ID:", test_account.id)