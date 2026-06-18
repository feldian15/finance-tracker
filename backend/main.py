from datetime import date
from fastapi import FastAPI, File, HTTPException, UploadFile, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from db import engine, SessionLocal
from sqlalchemy.orm import Session
from db import get_db
from contextlib import asynccontextmanager
from schemas import AccountUpdate, CategoryRuleUpdate, CategoryUpdate, TransactionCreate, TransactionOut, AccountCreate, AccountOut, CategoryCreate, CategoryOut, CategoryRuleCreate, CategoryRuleOut, TransactionUpdate, UncategorizedTransactionOut, PlaidItemOut
import models
import services
import uuid
import csv
import io
from pydantic import BaseModel
import json
from plaid.exceptions import ApiException


models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):

    print("Application startup")
    db = SessionLocal()

    try:
        services.ensure_system_categories(db)

    finally:
        db.close()

    yield

    print("Application shutdown")

app = FastAPI(
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "running"}

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...), account_id: str = Form(...), db: Session = Depends(get_db)):
    print("account_id received:", account_id)

    account = db.query(models.Account).filter(models.Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="account not found")

    rules = db.query(models.CategoryRule).all()

    contents = await file.read()
    text = contents.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    created = services.import_transactions_from_csv(rows, account_id, rules, db)

    db.commit()

    return created


@app.get("/transactions", response_model=list[TransactionOut])
def get_transactions(
        min_amount: float | None = None,
        max_amount: float | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        transaction_type: str | None = None,
        category_id: str | None = None,
        account_id: str | None = None,
        description: str | None = None,
        db: Session = Depends(get_db)
    ):

    if min_amount is not None and max_amount is not None and min_amount > max_amount:
        raise HTTPException(status_code=400, detail="min_amount cannot be greater than max_amount")
    if start_date is not None and end_date is not None and start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date cannot be greater than end_date")

    query = db.query(models.Transaction)

    if min_amount is not None:
        query = query.filter(models.Transaction.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(models.Transaction.amount <= max_amount)
    if start_date is not None:
        query = query.filter(models.Transaction.date >= start_date)
    if end_date is not None:
        query = query.filter(models.Transaction.date <= end_date)
    if transaction_type:
        query = query.filter(models.Transaction.transaction_type == transaction_type)
    if category_id:
        query = query.filter(models.Transaction.category_id == category_id)
    if account_id:
        query = query.filter(models.Transaction.account_id == account_id)
    if description:
        query = query.filter(models.Transaction.description.ilike(f"%{description}%"))

    txns = query.all()

    return [
        {
            "id": t.id,
            "account_id": t.account_id,
            "account_name": t.account.name,
            "account_type": t.account.type,
            "amount": t.amount,
            "description": t.description,
            "date": t.date,
            "category_id": t.category_id,
            "category_name": t.category.name if t.category else None,
            "transaction_type": t.transaction_type
        }
        for t in txns
    ]


@app.post("/transactions", response_model=TransactionOut)
def create_transaction(txn: TransactionCreate, db: Session = Depends(get_db)):
    try:
        return services.create_transaction(db, txn.model_dump())

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
    )


@app.patch("/transactions/{transaction_id}", response_model=TransactionOut)
def update_transaction(
        transaction_id: str,
        updates: TransactionUpdate,
        db: Session = Depends(get_db)
    ):

    try:
        return services.update_transaction(
            db,
            transaction_id,
            updates.model_dump(exclude_unset=True)
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
    )
    

@app.get("/accounts", response_model=list[AccountOut])
def get_accounts(db: Session = Depends(get_db)):
    return db.query(models.Account).all()


@app.post("/accounts", response_model=AccountOut)
def create_account(account: AccountCreate, db: Session = Depends(get_db)):
    try:
        return services.create_account(db, account.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.patch("/accounts/{account_id}", response_model=AccountOut)
def update_account(
        account_id: str,
        updates: AccountUpdate,
        db: Session = Depends(get_db)
    ):

    try:
       return services.update_account(
              db,
              account_id,
              updates.model_dump(exclude_unset=True)
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/categories", response_model=list[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()


@app.post("/categories", response_model=CategoryOut)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    query = db.query(models.Category).filter(models.Category.name == category.name).first()
    if query:
        raise HTTPException(status_code=409, detail="category with this name already exists")

    new_cat = models.Category(
        id=str(uuid.uuid4()),
        name=category.name,
        reporting_group=category.reporting_group
    )

    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)

    return new_cat


@app.patch("/categories/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: str,
    updates: CategoryUpdate,
    db: Session = Depends(get_db)
):
    try:
        return services.update_category(
            db,
            category_id,
            updates.model_dump(exclude_unset=True)
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@app.get("/rules", response_model=list[CategoryRuleOut])
def get_rules(db: Session = Depends(get_db)):
    rules = db.query(models.CategoryRule).all()

    return [
        {
            "id": r.id,
            "description_pattern": r.description_pattern,
            "amount_equals": r.amount_equals,
            "amount_min": r.amount_min,
            "amount_max": r.amount_max,
            "category_id": r.category_id,
            "category_name": r.category.name if r.category else None,
            "priority": r.priority
        }
        for r in rules
    ]


@app.post("/rules", response_model=CategoryRuleOut)
def create_rule(rule: CategoryRuleCreate, db: Session = Depends(get_db)):
    category = db.query(models.Category).filter(models.Category.id == rule.category_id).first()

    # Validation: category must exist
    if not category:
        raise HTTPException(status_code=404, detail="category not found")
    
    # Validation: must have at least one condition
    if not any([
        rule.description_pattern,
        rule.amount_equals is not None,
        rule.amount_min is not None,
        rule.amount_max is not None
    ]):
        raise HTTPException(
            status_code=400,
            detail="rule must have at least one matching condition"
        )

    new_rule = models.CategoryRule(
        id=str(uuid.uuid4()),
        description_pattern=rule.description_pattern,
        amount_equals=rule.amount_equals,
        amount_min=rule.amount_min,
        amount_max=rule.amount_max,
        category_id=rule.category_id,
        priority=rule.priority
    )

    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)

    return new_rule


@app.patch("/rules/{rule_id}", response_model=CategoryRuleOut)
def update_rule(
    rule_id: str,
    updates: CategoryRuleUpdate,
    db: Session = Depends(get_db)
):
    try:
        return services.update_rule(
            db,
            rule_id,
            updates.model_dump(exclude_unset=True)
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

@app.get("/accounts/{account_id}/balance")
def get_balance(
        account_id: str, 
        as_of: date | None = None,
        db: Session = Depends(get_db)
    ):

    account = db.query(models.Account).filter(models.Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="account not found")

    return {"balance": services.get_account_balance(db, account_id, as_of)}


@app.delete("/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: str,
    db: Session = Depends(get_db)
):
    try:
        services.delete_transaction(
            db,
            transaction_id
        )

        return {"message": "transaction deleted"}

    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )
    

@app.delete("/rules/{rule_id}")
def delete_rule(
    rule_id: str,
    db: Session = Depends(get_db)
):
    try:
        services.delete_rule(
            db,
            rule_id
        )

        return {"message": "rule deleted"}

    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )
    

@app.delete("/categories/{category_id}")
def delete_category(
    category_id: str,
    db: Session = Depends(get_db)
):
    try:
        services.delete_category(
            db,
            category_id
        )

        return {"message": "category deleted"}

    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )
    

@app.delete("/accounts/{account_id}")
def delete_account(
    account_id: str,
    db: Session = Depends(get_db)
):
    try:
        services.delete_account(
            db,
            account_id
        )

        return {"message": "account deleted"}

    except ValueError as e:

        detail = str(e)

        if detail == "account not found":
            raise HTTPException(
                status_code=404,
                detail=detail
            )

        raise HTTPException(
            status_code=400,
            detail=detail
        )


@app.get("/transactions/uncategorized", response_model=list[UncategorizedTransactionOut])
def get_uncategorized_transactions(
    db: Session = Depends(get_db)
):
    
    txns = db.query(models.Transaction).filter(
        models.Transaction.category_id == None
    ).all()

    return [
        {
            "id": t.id,
            "account_name": t.account.name,
            "account_type": t.account.type,
            "date": t.date,
            "description": t.description,
            "amount": t.amount,
            "category_id": t.category_id,
            "transaction_type": t.transaction_type
        }
        for t in txns
    ]



@app.post("/rules/reapply")
def reapply_rules(
    db: Session = Depends(get_db)
):
    return services.reapply_category_rules(db)


@app.get("/dashboard/spending-summary")
def spending_summary(db: Session = Depends(get_db)):
    return services.get_spending_summary(db)


@app.get("/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    return services.get_dashboard_summary(db)

@app.get("/dashboard/dynamic_summary")
def dashboard_dynamic_summary(start_date: date, end_date: date, db: Session = Depends(get_db)):
    return services.get_dashboard_dynamic_summary(start_date, end_date, db)

@app.get("/dashboard/category_spending")
def category_spending(start_date: date, end_date: date, db: Session = Depends(get_db)):
    return services.get_category_spending(db, start_date, end_date)


class PublicTokenRequest(BaseModel):
    public_token: str


@app.get("/api/create_link_token")
def create_link_token():
    link_token = services.create_link_token()
    return {"link_token": link_token}


@app.get("/api/create_update_link_token/{item_id}")
def create_update_link_token(item_id: str, db: Session = Depends(get_db)):
    plaid_item = db.query(models.PlaidItem).filter(models.PlaidItem.id == item_id).first()

    if not plaid_item:
        raise HTTPException(status_code=404, detail="Plaid Item not found")
    
    link_token = services.create_update_link_token(services.decrypt_token(plaid_item.access_token))
    return {"link_token": link_token}


@app.post("/api/exchange_public_token")
def exchange_public_token(body: PublicTokenRequest, db: Session = Depends(get_db)):
    # first exchange the public token for permanent access token
    result = services.exchange_public_token(body.public_token)
    access_token = result["access_token"]
    item_id = result["item_id"]

    # check for existence:
    pi = db.query(models.PlaidItem).filter(models.PlaidItem.item_id == item_id).first()

    if not pi:
        # save new plaid item
        plaid_item = models.PlaidItem(
            id=str(uuid.uuid4()),
            item_id=item_id,
            access_token=services.encrypt_token(access_token),
        )
        db.add(plaid_item)
        db.commit()
        db.refresh(plaid_item)

    # Fetch accounts for this item and save them
    accounts = services.get_accounts_for_item(access_token)

    for acct in accounts:
        db.add(models.Account(
            id=str(uuid.uuid4()),
            name=acct.name,
            type=str(acct.subtype),
            opening_balance=acct.balances["available"],
            plaid_account_id=acct.account_id, 
            plaid_item_id=plaid_item.id))
    db.commit()

    return {"status": "success", "item_id": item_id, "accounts_linked": len(accounts)}


# --------- Sandbox Testing ----------------
@app.get("/api/sandbox/create_public_token")
def sandbox_create_public_token():
    public_token = services.create_sandbox_public_token()
    return {"public_token": public_token}


@app.post("/api/sandbox/force_login_required/{item_id}")
def sandbox_force_login_required(item_id: str, db: Session = Depends(get_db)):
    plaid_item = db.query(models.PlaidItem).filter(models.PlaidItem.id == item_id).first()
    if not plaid_item:
        raise HTTPException(status_code=404, detail=f"PlaidItem not found: {item_id}")
    services.force_item_login_required(services.decrypt_token(plaid_item.access_token))
    return {"status": "forced"}

# ------------------------


@app.post("/api/sync_transactions/{item_id}")
def sync_transactions(item_id: str, db: Session = Depends(get_db)):
    plaid_item = db.query(models.PlaidItem).filter(models.PlaidItem.id == item_id).first()
    if not plaid_item:
        raise HTTPException(status_code=404, detail="PlaidItem not found")
    
    try: 
        result = services.sync_transactions(services.decrypt_token(plaid_item.access_token), plaid_item.cursor)
    except ApiException as e:
        error_body = json.loads(e.body)
        if error_body.get("error_code") == "ITEM_LOGIN_REQUIRED":
            raise HTTPException(
                status_code=409,
                detail={
                    "error_code": "ITEM_LOGIN_REQUIRED",
                    "item_id": plaid_item.id
                }
            )
        raise HTTPException(status_code=500, detail=error_body.get("error_message", "Plaid error"))

    rows = result["added"]

    created = services.import_transactions_from_plaid(rows, db)

    db.commit()

    return created


@app.get("/plaid_items", response_model=list[PlaidItemOut])
def get_accounts(db: Session = Depends(get_db)):
    return db.query(models.PlaidItem).all()