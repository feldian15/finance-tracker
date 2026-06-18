from pydantic import BaseModel, Field
import datetime
from typing import Optional

import enum

from models import TransactionType, ReportingGroup

class TransactionCreate(BaseModel):
    account_id: str
    amount: float
    description: str
    date: datetime.date
    transaction_type: TransactionType = TransactionType.EXPENSE
    category_id: Optional[str] = None

class TransactionOut(BaseModel):
    id: str
    account_id: str
    account_name: str
    account_type: str
    amount: float
    description: str
    date: datetime.date
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    transaction_type: TransactionType

    class Config:
        from_attributes = True


class TransactionUpdate(BaseModel):
    amount: float | None = None
    description: str | None = None
    date: datetime.date | None = None
    category_id: str | None = None
    transaction_type: TransactionType | None = None


class AccountCreate(BaseModel):
    name: str
    type: str | None = None
    opening_balance: float = 0
    opening_date: datetime.date = Field(default_factory=datetime.datetime.now().date)


class AccountOut(BaseModel):
    id: str
    name: str
    type: str | None = None
    opening_balance: float
    opening_date: datetime.date
    plaid_account_id: str | None = None
    plaid_item_id: str | None = None

    class Config:
        from_attributes = True 


class AccountUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    opening_balance: float | None = None
    opening_date: datetime.date | None = None 


class CategoryCreate(BaseModel):
    name: str
    reporting_group: ReportingGroup = ReportingGroup.EXPENSE

class CategoryOut(BaseModel):
    id: str
    name: str
    reporting_group: ReportingGroup

    class Config:
        from_attributes = True  


class CategoryUpdate(BaseModel):
    name: str | None = None
    reporting_group: ReportingGroup | None = None


class CategoryRuleCreate(BaseModel):
    description_pattern: Optional[str] = None
    amount_equals: Optional[float] = None
    amount_min: Optional[float] = None
    amount_max: Optional[float] = None
    category_id: str
    priority: int = 0

class CategoryRuleOut(BaseModel):
    id: str
    description_pattern: Optional[str] = None
    amount_equals: Optional[float] = None
    amount_min: Optional[float] = None
    amount_max: Optional[float] = None
    category_id: str
    category_name: Optional[str] = None
    priority: int

    class Config:
        from_attributes = True


class CategoryRuleUpdate(BaseModel):
    description_pattern: str | None = None
    amount_equals: float | None = None
    amount_min: float | None = None
    amount_max: float | None = None
    category_id: str | None = None
    priority: int | None = None

class UncategorizedTransactionOut(BaseModel):
    id: str
    account_name: str
    account_type: str
    date: datetime.date
    description: str
    amount: float
    category_id: str | None = None
    transaction_type: TransactionType

    class Config:
        from_attributes = True


class PlaidItemOut(BaseModel):
    id: str
    item_id: str
    access_token: str
    institution_name: str | None = None
    cursor: str | None = None

    class Config:
        from_attributes = True