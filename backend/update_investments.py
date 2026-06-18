# reset_db.py
# Run with: python3 update.py

import os
import uuid
from datetime import date

from db import Base, engine, SessionLocal
import models

DB_FILE = "finance.db"

# --- Recreate tables ---
db = SessionLocal()

txns = (
    db.query(models.Transaction)
    .join(models.Category)
    .filter(models.Category.reporting_group == 'expense')
    .all()
)
sum = 0

for txn in txns:
    sum += txn.amount

print(sum)


db.close()


print("Database update complete.")