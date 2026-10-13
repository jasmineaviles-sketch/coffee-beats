"""Customer-facing routes: settings, menu, tables, placing and tracking orders, serving uploaded images.

Customers never receive prices/billing for a placed order: GET /orders/{id} returns an OrderTicket only.
Billing statements are staff-only (see routers/cashier.py).
"""

import base64

from fastapi import APIRouter, HTTPException, Response
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from lib.db import db
from models.schemas import Order, OrderCreate, OrderItem, OrderTicket, Product, PublicTable, Settings

router = APIRouter()


async def load_settings() -> Settings:
    doc = await db.settings.find_one({"_key": "main"}) or {}
    return Settings(**{k: v for k, v in doc.items() if k in Settings.model_fields})


async def next_order_number() -> int:
    doc = await db.counters.find_one_and_update(
        {"_id": "order_number"}, {"$inc": {"seq": 1}}, upsert=True, return_document=ReturnDocument.AFTER
    )
    return int(doc["seq"])


def ticket(doc: dict) -> OrderTicket:
    return OrderTicket(**{k: doc.get(k) for k in OrderTicket.model_fields if k != "fulfillment"},
                       fulfillment=doc.get("fulfillment", "new"))


@router.get("/settings", response_model=Settings)
async def get_settings():
    return await load_settings()


@router.get("/products", response_model=list[Product])
async def list_available_products():
    docs = await db.products.find({"available": True}).sort([("sort_order", 1), ("name", 1)]).to_list(1000)
    return [Product(**d) for d in docs]


@router.get("/tables/{number}", response_model=PublicTable)
async def get_table(number: int):
    doc = await db.tables.find_one({"number": number})
    if not doc:
        raise HTTPException(status_code=404, detail="Table not found")
    return PublicTable(number=doc["number"], label=doc.get("label", ""), active=doc.get("active", True))


@router.post("/orders", response_model=OrderTicket, status_code=201)
async def place_order(body: OrderCreate):
    existing = await db.orders.find_one({"client_token": body.client_token})
    if existing:  # same submit retried: return the original order, never create a duplicate
        return ticket(existing)
    table = await db.tables.find_one({"number": body.table_number})
    if not table or not table.get("active", True):
        raise HTTPException(status_code=400, detail=f"Table {body.table_number} is not available for ordering")
    ids = [i.product_id for i in body.items]
    products = {p["id"]: p for p in await db.products.find({"id": {"$in": ids}, "available": True}).to_list(1000)}
    merged: dict[str, int] = {}
    for it in body.items:
        merged[it.product_id] = merged.get(it.product_id, 0) + it.qty
    items: list[OrderItem] = []
    for pid, qty in merged.items():
        p = products.get(pid)
        if not p:
            raise HTTPException(status_code=400, detail="One of the items is no longer available")
        items.append(OrderItem(product_id=p["id"], name=p["name"], price=p["price"], qty=qty,
                               subtotal=round(p["price"] * qty, 2)))
    reference = body.payment_reference.strip() if body.payment_method == "card" else ""
    order = Order(
        order_number=await next_order_number(),
        table_number=body.table_number,
        table_label=table.get("label", ""),
        nickname=body.nickname.strip(),
        notes=body.notes.strip(),
        items=items,
        item_count=sum(i.qty for i in items),
        total=round(sum(i.subtotal for i in items), 2),
        payment_method=body.payment_method,
        payment_reference=reference,
    )
    doc = {**order.model_dump(), "client_token": body.client_token}
    try:
        await db.orders.insert_one(doc)
    except DuplicateKeyError:
        existing = await db.orders.find_one({"client_token": body.client_token})
        if existing:
            return ticket(existing)
        raise
    return ticket(doc)


@router.get("/orders/{order_id}", response_model=OrderTicket)
async def get_order_ticket(order_id: str):
    doc = await db.orders.find_one({"id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    return ticket(doc)


@router.get("/images/{image_id}")
async def get_image(image_id: str):
    doc = await db.images.find_one({"id": image_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Image not found")
    return Response(content=base64.b64decode(doc["data"]), media_type=doc["content_type"],
                    headers={"Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff"})
