# reset_db.py
# Run with: python3 update.py

import os
import uuid
from datetime import date

from db import Base, engine, SessionLocal
import models

DB_FILE = "finance.db"

# --- Delete old DB ---
if os.path.exists(DB_FILE):
    os.remove(DB_FILE)

# --- Recreate tables ---
Base.metadata.create_all(bind=engine)

# --- Recreate tables ---
db = SessionLocal()

# Create Accounts
account1 = models.Account(
    id=str(uuid.uuid4()),
    name="Capital One",
    type="Checking",
    opening_balance=2600.84,
    opening_date=date(2026, 1, 1)
)
account2 = models.Account(
    id=str(uuid.uuid4()),
    name="Capital One",
    type="Savings",
    opening_balance=13249.28,
    opening_date=date(2026, 1, 1)
)
account3 = models.Account(
    id=str(uuid.uuid4()),
    name="Capital One",
    type="Credit Card",
    opening_balance=70.02,
    opening_date=date(2026, 1, 1)
)
account4 = models.Account(
    id=str(uuid.uuid4()),
    name="Chase",
    type="Credit Card",
    opening_balance=0,
    opening_date=date(2026, 1, 1)
)

db.add_all([account1, account2, account3, account4])
db.commit()


print("Database update complete.")