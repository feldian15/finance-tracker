from unicodedata import category

from django import db
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

import models
from datetime import datetime, date
from schemas import TransactionCreate
import uuid

import os
import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from dotenv import load_dotenv
from cryptography.fernet import Fernet

load_dotenv()

DATE_FORMATS = [
    "%Y-%m-%d",
    "%m/%d/%Y",
    "%m/%d/%y"
]

COLUMN_MAPPINGS = {
    "date": ["date", "transaction date", "posted date", "run date"],
    "description": ["description", "details", "merchant", "transaction description"],
    "amount": ["amount", "transaction amount", "amt"],
    "debit": ["debit"],
    "credit": ["credit"],
    "type": ["type", "transaction type"]
}

DEBIT_TYPES = ["debit", "withdrawal", "sale"]
CREDIT_TYPES = ["credit", "deposit", "payment"]

PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
PLAID_SECRET = os.getenv("PLAID_SECRET")
PLAID_ENV = os.getenv("PLAID_ENV", "sandbox")
PLAID_TOKEN_ENCRYPTION_KEY = os.getenv("PLAID_TOKEN_ENCRYPTION_KEY")

fernet = Fernet(PLAID_TOKEN_ENCRYPTION_KEY)

host_map = {
    "sandbox": plaid.Environment.Sandbox,
    "production": plaid.Environment.Production
}

configuration = plaid.Configuration(
    host=host_map[PLAID_ENV],
    api_key={
        "clientId": PLAID_CLIENT_ID,
        "secret": PLAID_SECRET
    },
)

api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)

def encrypt_token(token: str) -> str:
    return fernet.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    return fernet.decrypt(encrypted_token.encode()).decode()

def create_link_token() -> str:
    """Ask Plaid for short lived link token tied to this user"""
    request = LinkTokenCreateRequest(
        products=[Products("transactions")],
        client_name="finance-tracker",
        country_codes=[CountryCode("US")],
        language="en",
        user=LinkTokenCreateRequestUser(client_user_id="local-user"),
    )

    response = client.link_token_create(request)
    return response.link_token


def exchange_public_token(public_token: str) -> dict:
    """Exchange public token for permanent access_token"""
    request = ItemPublicTokenExchangeRequest(public_token=public_token)
    response = client.item_public_token_exchange(request)
    return {
        "access_token": response.access_token,
        "item_id": response.item_id
    }


def get_accounts_for_item(access_token: str):
    """Fetch the accounts associated with a plaid item"""
    request = AccountsGetRequest(access_token=access_token)
    response = client.accounts_get(request)
    return response.accounts


# --------- For testing ------------ #
from plaid.model.sandbox_public_token_create_request import SandboxPublicTokenCreateRequest

def create_sandbox_public_token() -> str:
    """SANDBOX ONLY. Simulates a completed Link flow for a fake test bank,
    so we can test exchange_public_token without a real frontend."""
    request = SandboxPublicTokenCreateRequest(
        institution_id="ins_109508",  # Plaid's "First Platypus Bank" test institution
        initial_products=[Products("transactions")],
    )
    response = client.sandbox_public_token_create(request)
    return response.public_token


# ----------------------------------#


def sync_transactions(access_token: str, cursor: str = None) -> dict:
    request_kwargs = {"access_token": access_token}
    if cursor:
        request_kwargs["cursor"] = cursor

    # Pull new transactions
    request = TransactionsSyncRequest(
        **request_kwargs
    )

    response = client.transactions_sync(request)

    return {
        "added": response.added,
        "modified": response.modified,
        "removed": response.removed,
        "next_cursor": response.next_cursor,
        "has_more": response.has_more,
    }


def import_transactions_from_plaid(rows, db):
    created = 0
    error = 0
    duplicates = []

    rules = db.query(models.CategoryRule).all()

    for txn in rows:
        try:
            # Get the account id associated with the plaid account id
            account = db.query(models.Account).filter(models.Account.plaid_account_id == txn.account_id).first()

            if not account:
                raise ValueError("Account does not exists")

            data = {
                "account_id": account.id,
                "date": txn.date,
                "description": txn.name,
                "amount": txn.amount
            }

            txn_in = TransactionCreate(**data)

            category_id = apply_category_rules(txn_in, rules)

            #check if category exists
            cat = db.query(models.Category).filter(models.Category.id == category_id).first()

            # adjust tx type
            if cat:
                if cat.reporting_group in ['savings', 'investments', 'system']:
                    transaction_type = "transfer"
                elif cat.reporting_group == 'income':
                    transaction_type = "income"
                else:
                    transaction_type = "expense"
            else:
                transaction_type = "expense"
            

            new_txn = models.Transaction(
                id=str(uuid.uuid4()),
                account_id=account.id,
                date=txn.date,
                amount=txn.amount,
                description=txn.name,
                category_id=category_id,
                transaction_type=transaction_type,
                plaid_transaction_id=txn.transaction_id
            )

            is_duplicate = db.query(models.Transaction).filter(models.Transaction.plaid_transaction_id == txn.transaction_id).first()

            if is_duplicate:
                duplicates.append(new_txn)
                continue

            db.add(new_txn)
            created += 1
        
        except Exception as e:
            print(e)
            error += 1
            continue

    return {
        "transactions_created": created, 
        "duplicate_transactions_skipped": len(duplicates), 
        "invalid_transactions": error,
        "duplicate_transaction_list": duplicates
    }


def import_transactions_from_csv(rows, account_id, rules, db):
    created = 0
    duplicate = 0
    error = 0

    duplicates = []

    for row in rows:
        try:
            data = normalize_row(row, account_id)
            txn_in = TransactionCreate(**data)

            category_id = apply_category_rules(txn_in, rules)

            # Check if the category is saving/investment:
            cat = db.query(models.Category).filter(models.Category.id==category_id).first()

            if cat:
                if cat.reporting_group in ['savings', 'investments', 'system']:
                    transaction_type = "transfer"
                elif cat.reporting_group == 'income':
                    transaction_type = "income"
                else:
                    transaction_type = "expense"
            else:
                transaction_type = "expense"

            txn = models.Transaction(
                id=str(uuid.uuid4()),
                account_id=txn_in.account_id,
                amount=txn_in.amount,
                description=txn_in.description,
                date=txn_in.date,
                category_id=category_id,
                transaction_type=transaction_type
            )

            if is_duplicate(db, txn_in):
                duplicates.append(txn_in)
                duplicate += 1
                continue

            db.add(txn)
            created += 1

        except Exception:
            error += 1
            continue

    return {"transactions_created": created, 
            "duplicate_transactions_skipped": duplicate, 
            "invalid_transactions": error,
            "duplicate_transaction_list": duplicates}


# parse important fields from csv record
def normalize_row(row, account_id):
    return {
        "account_id": account_id,
        "date": parse_date(
            clean(find_column(row, COLUMN_MAPPINGS["date"]))
        ),
        "description": clean(
            find_column(row, COLUMN_MAPPINGS["description"])
        ),
        "amount": parse_amount(row)
    }


# check for different date formats in csv and parse into date object
def parse_date(value):
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue

    raise ValueError(f"Unknown date format: {value}")


# Normalize string by stripping whitespace when possible and removing dollar signs
def clean(value):
    if value is None:
        return None

    value = value.strip()

    if value == "":
        return None

    return value


# Find the first column in the row that matches any of the aliases, ignoring case and whitespace
def find_column(row, aliases):
    for key in row.keys():
        if key.strip().lower() in aliases:
            return row[key]
    return None


# Amount parsing with support for different CSV formats (amount vs debit/credit, and transaction type hints)
def parse_amount(row):
    amount = find_column(row, COLUMN_MAPPINGS["amount"])

    # Remove $
    if "$" in amount:
        amount = amount.replace("$", "")

    if amount:
        amount = float(clean(amount))
    
        txn_type = find_column(row, COLUMN_MAPPINGS["type"])

        if txn_type:
            txn_type = clean(txn_type).lower()
            
            if txn_type in DEBIT_TYPES:
                return -abs(amount)
            
            if txn_type in CREDIT_TYPES:
                return abs(amount)  
            
        return amount

    debit = find_column(row, COLUMN_MAPPINGS["debit"])
    credit = find_column(row, COLUMN_MAPPINGS["credit"])

    if debit:
        debit = clean(debit)
        if debit:
            return -float(debit)

    if credit:
        credit = clean(credit)
        if credit:
            return float(credit)

    raise ValueError("No valid amount field")


# Check if a transaction matches a rule
def matches_rule(txn, rule):
    # description match
    if rule.description_pattern:
        if rule.description_pattern.lower() not in txn.description.lower():
            return False

    # exact amount
    if rule.amount_equals is not None:
        if txn.amount != rule.amount_equals:
            return False

    # min amount
    if rule.amount_min is not None:
        if txn.amount < rule.amount_min:
            return False

    # max amount
    if rule.amount_max is not None:
        if txn.amount > rule.amount_max:
            return False

    return True


# Apply category rules to a transaction
def apply_category_rules(txn, rules):
    # Highest priority wins.
    # If priorities match, first stable rule wins.
    sorted_rules = sorted(
        rules,
        key=lambda r: (-r.priority, r.id)
    )

    # iterate through rules and return matching category
    for rule in sorted_rules:
        if matches_rule(txn, rule):
            return rule.category_id

    return None


def get_account_balance(db, account_id, as_of=None):
    account = db.query(models.Account).filter_by(id=account_id).first()

    query = db.query(models.Transaction).filter(
        models.Transaction.account_id == account_id,
        models.Transaction.date >= account.opening_date
    )

    if as_of:
        query = query.filter(
            models.Transaction.date <= as_of
        )

    txns = query.all()

    txn_total = sum(t.amount for t in txns)

    return account.opening_balance + txn_total

# --- Service functions for main.py ---
def create_transaction(db, txn_data):
    # First validate account exists
    account = db.query(models.Account).filter(
        models.Account.id == txn_data["account_id"]
    ).first()

    if not account:
        raise ValueError("account not found")

    # Normalize potential empty category
    category_id = txn_data.get("category_id")
    if not category_id or not category_id.strip():
        txn_data["category_id"] = None

    # if description or date are empty strings, raise exception
    description = txn_data.get("description")
    if not description or not description.strip():
        raise ValueError("description cannot be empty")
    
    date = txn_data.get("date")
    if not date or not str(date).strip():
        raise ValueError("date cannot be empty")
    
    transaction_type = txn_data["transaction_type"]

    # Validate category exists
    category_id = txn_data.get("category_id")


    if category_id:
        category = db.query(models.Category).filter(
            models.Category.id == category_id
        ).first()

        # Check if the category is saving/investment:
        if category:
            if category.reporting_group in ['savings', 'investments', 'system']:
                transaction_type = "transfer"
            elif category.reporting_group == 'income':
                transaction_type = "income"
            else:
                transaction_type = "expense"

        if not category:
            raise ValueError("category not found")

    new_txn = models.Transaction(
        id=str(uuid.uuid4()),
        **txn_data
    )

    new_txn.transaction_type = transaction_type

    db.add(new_txn)
    db.commit()
    db.refresh(new_txn)

    return {
        "id": new_txn.id,
        "account_id": new_txn.account_id,
        "account_name": new_txn.account.name,
        "account_type": new_txn.account.type,
        "amount": new_txn.amount,
        "description": new_txn.description,
        "date": new_txn.date,
        "category_id": new_txn.category_id,
        "category_name": (
            new_txn.category.name
            if new_txn.category else None
        ),
        "transaction_type": new_txn.transaction_type
    }


def update_transaction(db, transaction_id, updates):
    txn = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id
    ).first()

    if not txn:
        raise ValueError("transaction not found")
    
    if updates.get("category_id") == "":
        updates["category_id"] = None

    category_id = updates.get("category_id")

    if category_id:
        category = db.query(models.Category).filter(
            models.Category.id == category_id
        ).first()

        # Check if the category is saving/investment:
        if category:
            if category.reporting_group in ['savings', 'investments', 'system']:
                transaction_type = "transfer"
            elif category.reporting_group == 'income':
                transaction_type = "income"
            else:
                transaction_type = "expense"

        if not category:
            raise ValueError("category not found")
    
    for key, value in updates.items():
        setattr(txn, key, value)

    txn.transaction_type = transaction_type

    db.commit()
    db.refresh(txn)

    return {
        "id": txn.id,
        "account_id": txn.account_id,
        "account_name": txn.account.name,
        "account_type": txn.account.type,
        "amount": txn.amount,
        "description": txn.description,
        "date": txn.date,
        "category_id": txn.category_id,
        "category_name": (
            txn.category.name
            if txn.category else None
        ),
        "transaction_type": txn.transaction_type
    }




def create_account(db, account_data):
    # First check that the account does not exist
    existing_acc = db.query(models.Account).filter(
        models.Account.name == account_data["name"],
        models.Account.type == account_data.get("type")
    ).first()

    if existing_acc:
        raise ValueError("account with the same name and type already exists")
    
    name = account_data.get("name")

    # Make sure name isnt empty
    if not name or not name.strip():
        raise ValueError("account name cannot be empty")

    new_acc = models.Account(
        id=str(uuid.uuid4()),
        **account_data
    )

    db.add(new_acc)
    db.commit()
    db.refresh(new_acc)

    return new_acc


def update_account(db, account_id, updates):
    acc = db.query(models.Account).filter(
        models.Account.id == account_id
    ).first()

    # First check account existence
    if not acc:
        raise ValueError("account not found")
    
    # Then check for name + type uniqueness in databaseif either is being updated
    if updates.get("name") or updates.get("type"):
        #use existing values if not being updated to check for conflicts
        new_name = updates["name"] if "name" in updates else acc.name
        new_type = updates["type"] if "type" in updates else acc.type

        existing_acc = db.query(models.Account).filter(
            models.Account.name == new_name,
            models.Account.type == new_type,
            models.Account.id != account_id
        ).first()

        if existing_acc:
            raise ValueError("another account with the same name and type already exists")
    
    for key, value in updates.items():
        setattr(acc, key, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("another account with the same name and type already exists")
    
    db.refresh(acc)
    return acc


def update_category(db, category_id, updates):
    if category.category_id == "INTERNAL_TRANSFER":
        raise ValueError("system categories cannot be updated")

    cat = db.query(models.Category).filter(
        models.Category.id == category_id
    ).first()

    if not cat:
        raise ValueError("category not found")

    # Prevent duplicate category names
    if "name" in updates:

        existing_cat = db.query(models.Category).filter(
            models.Category.name == updates["name"],
            models.Category.id != category_id
        ).first()

        if existing_cat:
            raise ValueError(
                "category with this name already exists"
            )

    for key, value in updates.items():
        setattr(cat, key, value)

    try:
        db.commit()

    except IntegrityError:
        db.rollback()
        raise ValueError(
            "category with this name already exists"
        )

    db.refresh(cat)

    return cat


def update_rule(db, rule_id, updates):

    rule = db.query(models.CategoryRule).filter(
        models.CategoryRule.id == rule_id
    ).first()

    if not rule:
        raise ValueError("rule not found")

    # Validate category exists if updating category_id
    if "category_id" in updates:

        category = db.query(models.Category).filter(
            models.Category.id == updates["category_id"]
        ).first()

        if not category:
            raise ValueError("category not found")

    # Simulate final rule state after updates
    final_description_pattern = (
        updates["description_pattern"]
        if "description_pattern" in updates
        else rule.description_pattern
    )

    final_amount_equals = (
        updates["amount_equals"]
        if "amount_equals" in updates
        else rule.amount_equals
    )

    final_amount_min = (
        updates["amount_min"]
        if "amount_min" in updates
        else rule.amount_min
    )

    final_amount_max = (
        updates["amount_max"]
        if "amount_max" in updates
        else rule.amount_max
    )

    # Rule must still have at least one condition
    if not any([
        final_description_pattern,
        final_amount_equals is not None,
        final_amount_min is not None,
        final_amount_max is not None
    ]):
        raise ValueError(
            "rule must have at least one matching condition"
        )

    for key, value in updates.items():
        setattr(rule, key, value)

    try:
        db.commit()

    except IntegrityError:
        db.rollback()
        raise ValueError("failed to update rule")

    db.refresh(rule)

    return {
        "id": rule.id,
        "description_pattern": rule.description_pattern,
        "amount_equals": rule.amount_equals,
        "amount_min": rule.amount_min,
        "amount_max": rule.amount_max,
        "category_id": rule.category_id,
        "category_name": (
            rule.category.name
            if rule.category else None
        ),
        "priority": rule.priority
    }
    

# Helper function to normalize descriptions for duplicate detection
def normalize_description(desc: str):
    # if description is None or empty, return empty string to avoid blank descriptions. Else return description with one space between each word
    if not desc:
        return ""
    return desc.lower().strip()


def is_duplicate(db, txn):
    return db.query(models.Transaction).filter(
        models.Transaction.account_id == txn.account_id,
        models.Transaction.date == txn.date,
        models.Transaction.amount == txn.amount,
        func.lower(func.trim(models.Transaction.description)) ==
        normalize_description(txn.description)
    ).first() is not None


def delete_transaction(db, transaction_id):
    txn = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id
    ).first()

    if not txn:
        raise ValueError("transaction not found")

    db.delete(txn)
    db.commit()


def delete_rule(db, rule_id):
    rule = db.query(models.CategoryRule).filter(
        models.CategoryRule.id == rule_id
    ).first()

    if not rule:
        raise ValueError("rule not found")

    db.delete(rule)
    db.commit()



def delete_category(db, category_id):
    if category_id == "INTERNAL_TRANSFER":
        raise ValueError("system categories cannot be deleted")

    category = db.query(models.Category).filter(
        models.Category.id == category_id
    ).first()

    if not category:
        raise ValueError("category not found")

    transactions = db.query(models.Transaction).filter(
        models.Transaction.category_id == category_id
    ).all()

    for txn in transactions:
        txn.category_id = None

    rules = db.query(models.CategoryRule).filter(
        models.CategoryRule.category_id == category_id
    ).all()

    for rule in rules:
        db.delete(rule)

    db.delete(category)
    db.commit()


def delete_account(db, account_id):
    account = db.query(models.Account).filter(
        models.Account.id == account_id
    ).first()

    if not account:
        raise ValueError("account not found")

    txn_exists = db.query(models.Transaction).filter(
        models.Transaction.account_id == account_id
    ).first()

    if txn_exists:
        raise ValueError(
            "cannot delete account with transactions"
        )

    db.delete(account)
    db.commit()



def reapply_category_rules(db):

    rules = db.query(
        models.CategoryRule
    ).all()

    transactions = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.category_id == None
        )
        .all()
    )

    updated = 0

    for txn in transactions:

        category_id = apply_category_rules(
            txn,
            rules
        )

        if category_id:

            txn.category_id = category_id

            updated += 1

    db.commit()

    return {
        "updated": updated
    }


# aggregate by category
def get_spending_summary(db):

    today = date.today()
    current_month_start = date(today.year, today.month, 1)

    # all categorized transactions that are expenses
    rows = (
        db.query(
            models.Category.id.label("category_id"),
            models.Category.name.label("category_name"),
            func.sum(models.Transaction.amount).label("all_time"),
        )
        .join(models.Transaction, models.Transaction.category_id == models.Category.id)
        .group_by(models.Category.id)
        .filter(models.Category.reporting_group == "expense", models.Transaction.date < current_month_start)
        .all()
    )

    results = []

    for r in rows:

        # current month
        current_month_total = (
            db.query(func.sum(models.Transaction.amount))
            .filter(
                models.Transaction.category_id == r.category_id,
                models.Transaction.date >= current_month_start
            )
            .scalar()
        ) or 0

        # earliest transaction date for avg calc
        # first_txn_date = (
        #     db.query(func.min(models.Transaction.date))
        #     .filter(models.Transaction.category_id == r.category_id)
        #     .scalar()
        # )

        # if first_txn_date:
        #     months = max(
        #         1,
        #         (today.year - first_txn_date.year) * 12 +
        #         (today.month - first_txn_date.month)
        #     )
        # else:
        #     months = 1

        months = today.month - 1

        results.append({
            "category_id": r.category_id,
            "category_name": r.category_name,
            "all_time": float(r.all_time or 0),
            "current_month": float(current_month_total),
            "avg_monthly": float((r.all_time or 0) / months)
        })

    return results


def get_category_spending(db, start_date, end_date):

    income = (
        db.query(
            func.sum(models.Transaction.amount)
        )
        .join(models.Category)
        .filter(
            models.Category.reporting_group == 'income',
            models.Transaction.date >= start_date,
            models.Transaction.date <= end_date
        )
        .scalar()
    ) or 0

    expenses = (
        db.query(
            func.abs(func.sum(models.Transaction.amount))
        )
        .join(models.Category)
        .filter(
            models.Category.reporting_group == 'expense',
            models.Transaction.date >= start_date,
            models.Transaction.date <= end_date
        )
        .scalar()
    ) or 0

    savings = (
        db.query(
            func.abs(func.sum(models.Transaction.amount))
        )
        .join(models.Category)
        .filter(
            models.Category.reporting_group == 'savings',
            models.Transaction.date >= start_date,
            models.Transaction.date <= end_date
        )
        .scalar()
    ) or 0

    investments = (
        db.query(
            func.abs(func.sum(models.Transaction.amount))
        )
        .join(models.Category)
        .filter(
            models.Category.reporting_group == 'investments',
            models.Transaction.date >= start_date,
            models.Transaction.date <= end_date
        )
        .scalar()
    ) or 0

    leftover = income - expenses - investments - savings

    rows = (
        db.query(
            models.Category.id,
            models.Category.name,
            models.Category.reporting_group,
            func.coalesce(func.abs(func.sum(models.Transaction.amount)), 0).label("total")
        )
        .outerjoin(
            models.Transaction,
            (models.Transaction.category_id == models.Category.id)
            & (models.Transaction.date >= start_date)
            & (models.Transaction.date <= end_date)
        )
        .filter(
            models.Category.reporting_group != 'system'
        )
        .group_by(
            models.Category.id,
            models.Category.name,
            models.Category.reporting_group
        )
        .all()
    )


    months = (
        (end_date.year - start_date.year) * 12 + end_date.month - start_date.month + 1
    )

    categories = []

    for r in rows:
        avg_total = r.total / months
        
        #if income != 0:
        pct_income = r.total / income * 100 if income else 0
        

        categories.append({
            "category_id": r.id,
            "category_name": r.name,
            "reporting_group": r.reporting_group,
            "total": r.total,
            "avg_total": avg_total,
            "pct_income": pct_income
        })

    categories.sort(
        key=lambda cat: cat["pct_income"],
        reverse=True
    )


    return {
        "income": income,
        "expenses": expenses,
        "savings": savings,
        "investments": investments,
        "months": months,
        "leftover": leftover,
        "categories": categories
    }




def ensure_system_categories(db):

    existing = (
        db.query(models.Category)
        .filter(
            models.Category.name ==
            "Internal Transfer"
        )
        .first()
    )

    if not existing:

        db.add(
            models.Category(
                id="INTERNAL_TRANSFER",
                name="Internal Transfer",
                reporting_group="system",
            )
        )

        db.commit()


def get_dashboard_summary(db):
    today = date.today()
    current_month_start = today.replace(day=1)

    income_txns = (
        db.query(models.Transaction)
        .join(models.Category)
        .filter(
            models.Transaction.date >= current_month_start,
            models.Category.reporting_group == "income"
        )
        .all()
    )

    income = sum(txn.amount for txn in income_txns)

    expense_txns = (
        db.query(models.Transaction)
        .join(models.Category)
        .filter(
            models.Transaction.date >= current_month_start,
            models.Category.reporting_group == "expense"
        )
        .all()
    )

    expenses = sum(txn.amount for txn in expense_txns)

    investment_txns = (
        db.query(models.Transaction)
        .join(models.Category)
        .filter(
            models.Transaction.date >= current_month_start,
            models.Category.reporting_group == "investments"
        )
        .all()
    )

    investments = sum(txn.amount for txn in investment_txns)

    savings_txns = (
        db.query(models.Transaction)
        .join(models.Category)
        .filter(
            models.Transaction.date >= current_month_start,
            models.Category.reporting_group == "savings"
        )
        .all()
    )

    savings = sum(txn.amount for txn in savings_txns) 

    surplus_deficit = income - abs(expenses) - abs(investments) - abs(savings)

    return {
        "income": income,
        "expenses": expenses,
        "investments": investments,
        "savings": savings,
        "surplus_deficit": surplus_deficit
    }


def get_dashboard_dynamic_summary(start_date, end_date, db):

    income_txns = (
        db.query(models.Transaction)
        .join(models.Category)
        .filter(
            models.Transaction.date >= start_date,
            models.Transaction.date <= end_date,
            models.Category.reporting_group == "income"
        )
        .all()
    )

    income = sum(txn.amount for txn in income_txns)

    expense_txns = (
        db.query(models.Transaction)
        .join(models.Category)
        .filter(
            models.Transaction.date >= start_date,
            models.Transaction.date <= end_date,
            models.Category.reporting_group == "expense"
        )
        .all()
    )

    expenses = sum(txn.amount for txn in expense_txns)

    investment_txns = (
        db.query(models.Transaction)
        .join(models.Category)
        .filter(
            models.Transaction.date >= start_date,
            models.Transaction.date <= end_date,
            models.Category.reporting_group == "investments"
        )
        .all()
    )

    investments = sum(txn.amount for txn in investment_txns)

    savings_txns = (
        db.query(models.Transaction)
        .join(models.Category)
        .filter(
            models.Transaction.date >= start_date,
            models.Transaction.date <= end_date,
            models.Category.reporting_group == "savings"
        )
        .all()
    )

    savings = sum(txn.amount for txn in savings_txns) 

    surplus_deficit = income - abs(expenses) - abs(investments) - abs(savings)

    return {
        "income": income,
        "expenses": expenses,
        "investments": investments,
        "savings": savings,
        "surplus_deficit": surplus_deficit
    }