"""Pydantic models. Every model here has a hand-written TS twin in frontend/src/lib/types.ts."""

import uuid
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


PaymentMethod = Literal["cash", "gcash", "card"]
OrderStatus = Literal["unpaid", "paid", "cancelled"]  # payment status
Fulfillment = Literal["new", "served"]  # preparation / fulfillment status
Role = Literal["admin", "cashier"]

DEFAULT_LOGO = "/brand/logo.png"


# ---------- Products ----------
class ProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=300)
    price: float = Field(ge=0, le=100000)
    category: str = Field(min_length=1, max_length=40)
    image_url: str = Field(default="", max_length=2000)
    available: bool = True
    sort_order: int = 0


class Product(ProductIn):
    id: str = Field(default_factory=new_id)
    created_at: datetime = Field(default_factory=now_utc)


# ---------- Settings ----------
class Settings(BaseModel):
    shop_name: str = Field(default="Coffee Beats by Life", min_length=1, max_length=80)
    tagline: str = Field(default="Stay for a moment. Crafted for life.", max_length=120)
    logo_url: str = Field(default=DEFAULT_LOGO, max_length=2000)
    background_url: str = Field(default="", max_length=2000)
    categories: list[str] = Field(default_factory=lambda: ["Coffee", "Non-Coffee", "Pastries", "Meals"])
    gcash_name: str = Field(default="", max_length=80)
    gcash_number: str = Field(default="", max_length=30)
    gcash_qr_url: str = Field(default="", max_length=2000)
    receipt_footer: str = Field(default="Thank you for staying for a moment. Please come again.", max_length=200)
    terms_text: str = Field(default="", max_length=10000)


# ---------- Tables ----------
class TableIn(BaseModel):
    number: int = Field(ge=1, le=9999)
    label: str = Field(default="", max_length=40)


class TableUpdate(BaseModel):
    label: str = Field(default="", max_length=40)
    active: bool = True


class TableBulkIn(BaseModel):
    start: int = Field(ge=1, le=9999)
    end: int = Field(ge=1, le=9999)


class DiningTable(BaseModel):
    id: str = Field(default_factory=new_id)
    number: int
    label: str = ""
    active: bool = True
    created_at: datetime = Field(default_factory=now_utc)


class PublicTable(BaseModel):
    number: int
    label: str
    active: bool


class BulkOut(BaseModel):
    created: int
    skipped: int


# ---------- Orders ----------
class OrderItemIn(BaseModel):
    product_id: str
    qty: int = Field(ge=1, le=99)


class OrderCreate(BaseModel):
    table_number: int = Field(ge=1)
    nickname: str = Field(min_length=1, max_length=40)
    payment_method: PaymentMethod
    payment_reference: str = Field(default="", max_length=60)  # card: masked last 4 + holder only
    notes: str = Field(default="", max_length=300)
    client_token: str = Field(min_length=8, max_length=64)  # idempotency key, blocks double submits
    items: list[OrderItemIn] = Field(min_length=1, max_length=50)


class OrderItem(BaseModel):
    product_id: str
    name: str
    price: float
    qty: int
    subtotal: float


class Order(BaseModel):
    id: str = Field(default_factory=new_id)
    order_number: int
    table_number: int
    table_label: str = ""
    nickname: str
    notes: str = ""
    items: list[OrderItem]
    item_count: int
    total: float
    payment_method: PaymentMethod
    payment_reference: str = ""
    status: OrderStatus = "unpaid"
    fulfillment: Fulfillment = "new"
    amount_tendered: Optional[float] = None
    change: Optional[float] = None
    processed_by: Optional[str] = None
    served_by: Optional[str] = None
    created_at: datetime = Field(default_factory=now_utc)
    paid_at: Optional[datetime] = None
    served_at: Optional[datetime] = None


class OrderTicket(BaseModel):
    """What a customer may see about their own order: no prices, no billing statement."""
    id: str
    order_number: int
    table_number: int
    nickname: str
    item_count: int
    payment_method: PaymentMethod
    status: OrderStatus
    fulfillment: Fulfillment
    created_at: datetime


class PayIn(BaseModel):
    payment_method: PaymentMethod
    amount_tendered: Optional[float] = Field(default=None, ge=0, le=1000000)
    payment_reference: str = Field(default="", max_length=60)


# ---------- Auth ----------
class LoginIn(BaseModel):
    username: str = Field(max_length=40)
    password: str = Field(max_length=80)
    portal: Role
    accept_terms: bool = False


class Me(BaseModel):
    username: str
    role: Role


class StaffAccount(BaseModel):
    role: Role
    username: str


class CredentialsIn(BaseModel):
    username: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=6, max_length=80)


# ---------- Misc ----------
class UploadIn(BaseModel):
    data_url: str


class UploadOut(BaseModel):
    url: str


class TopItem(BaseModel):
    name: str
    qty: int
    sales: float


class MethodBreakdown(BaseModel):
    method: str
    count: int
    sales: float


class Stats(BaseModel):
    today: str
    today_sales: float
    today_orders: int
    unpaid_orders: int
    unserved_orders: int
    total_sales: float
    total_orders: int
    product_count: int
    table_count: int
    top_items: list[TopItem]
    by_method: list[MethodBreakdown]


class BackupIn(BaseModel):
    version: int = 1
    settings: Optional[dict[str, Any]] = None
    products: list[dict[str, Any]] = Field(default_factory=list)
    orders: list[dict[str, Any]] = Field(default_factory=list)
    images: list[dict[str, Any]] = Field(default_factory=list)
    tables: list[dict[str, Any]] = Field(default_factory=list)


class RestoreOut(BaseModel):
    products: int
    orders: int
    images: int
    tables: int


class Message(BaseModel):
    message: str
