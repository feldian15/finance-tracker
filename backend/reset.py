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

query = db.query(models.Transaction).join(models.Account).filter(models.Account.name == 'Chase', models.Transaction.date < '2026-06-29').all()

query.sort(key=lambda tx: (tx.date, tx.amount), reverse=False)

# l = [q.amount for q in query]

# import csv

# output_file = "output.csv"

# with open(output_file, "w", newline="", encoding="utf-8") as csvfile:
#     writer = csv.writer(csvfile)

#     # Optional header
#     writer.writerow(["amount"])

#     for item in l:
#         writer.writerow([item])

sum = 0

for q in query:
    sum += q.amount


print(len(query))
print(sum)





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