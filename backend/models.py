from datetime import date, datetime
from pydantic import Field
from sqlalchemy import Column, Enum, String, Float, ForeignKey, Integer, DateTime, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from db import Base

import enum

class TransactionType(str, enum.Enum):
    EXPENSE = "expense"
    INCOME = "income"
    TRANSFER = "transfer"

class ReportingGroup(str, enum.Enum):
    EXPENSE = "expense"
    INCOME = "income"
    INVESTMENTS = "investments"
    SAVINGS = "savings",
    SYSTEM = "system"

class Account(Base):
    __tablename__ = "accounts"

    __table_args__ = (
        UniqueConstraint("name", "type", name="uq_account_name_type"),
    )

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # e.g. "checking", "savings", "credit_card"

    opening_balance = Column(Float, default=0)
    opening_date = Column(Date, default=datetime.now().date())

    plaid_account_id = Column(String, unique=True, nullable=True)
    plaid_item_id = Column(String, ForeignKey("plaid_items.id"), nullable=True)

    plaid_item = relationship("PlaidItem", backref="accounts")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True)

    # Foreign key to account
    account_id = Column(
        String,
        ForeignKey("accounts.id"),
        nullable=False,
        index=True
    )

    date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    category_id = Column(String, ForeignKey("categories.id"), nullable=True)
    transaction_type = Column(Enum(TransactionType), nullable=False, default=TransactionType.EXPENSE)

    plaid_transaction_id = Column(String, unique=True, nullable=True)

    category = relationship("Category", backref="transactions")
    account = relationship("Account", backref="transactions")

class AccountHistory(Base):
    __tablename__ = "account_history"

    id = Column(String, primary_key=True)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False)
    date = Column(Date)
    balance = Column(Float)

    account = relationship("Account", backref="history")


class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    reporting_group = Column(Enum(ReportingGroup), nullable=False)


class CategoryRule(Base):
    __tablename__ = "category_rules"

    id = Column(String, primary_key=True)

    # description matching
    description_pattern = Column(String, nullable=True)

    # amount matching
    amount_equals = Column(Float, nullable=True)
    amount_min = Column(Float, nullable=True)
    amount_max = Column(Float, nullable=True)

    category_id = Column(String, ForeignKey("categories.id"), nullable=False)

    priority = Column(Integer, default=0)

    category = relationship("Category", backref="rules")


class PlaidItem(Base):
    __tablename__ = "plaid_items"

    id = Column(String, primary_key=True)
    item_id = Column(String, unique=True, nullable=False)
    access_token = Column(String, nullable=False)
    institution_name = Column(String, nullable=True)
    cursor = Column(String, nullable=True)


