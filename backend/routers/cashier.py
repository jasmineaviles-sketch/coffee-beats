"""Cashier terminal (staff only): order queue, billing statements, confirm payment, mark served, cancel."""

from datetime import datetime, time, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query

from lib.auth import require_staff
from lib.db import db
from models.schemas import DiningTable, Fulfillment, Order, OrderStatus, PayIn, PaymentMethod

router = APIRouter(prefix="/staff")
TZ = ZoneInfo("Asia/Manila")


def day_bounds(start: Optional[str], end: Optional[str]) -> dict:
    """YYYY-MM-DD (Manila) inclusive range -> created_at filter in UTC."""
    rng: dict = {}
    try:
        if start:
            rng["$gte"] = datetime.combine(datetime.strptime(start, "%Y-%m-%d").date(), time.min, TZ).astimezone(timezone.utc)
        if end:
            rng["$lt"] = datetime.combine(datetime.strptime(end, "%Y-%m-%d").date() + timedelta(days=1), time.min, TZ).astimezone(timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be in YYYY-MM-DD format")
    if "$gte" in rng and "$lt" in rng and rng["$gte"] >= rng["$lt"]:
        raise HTTPException(status_code=400, detail="Start date must be on or before end date")
    return {"created_at": rng} if rng else {}


def order_query(status: Optional[str], fulfillment: Optional[str], method: Optional[str], table: Optional[int],
                start: Optional[str], end: Optional[str]) -> dict:
    q: dict = day_bounds(start, end)
    if status:
        q["status"] = status
    if fulfillment == "new":
        q["fulfillment"] = {"$ne": "served"}
        q.setdefault("status", {"$ne": "cancelled"})
    elif fulfillment == "served":
        q["fulfillment"] = "served"
    if method:
        q["payment_method"] = method
    if table:
        q["table_number"] = table
    return q


def to_order(d: dict) -> Order:
    return Order(**{k: v for k, v in d.items() if k in Order.model_fields})


@router.get("/orders", response_model=list[Order])
async def list_orders(status: Optional[OrderStatus] = None, fulfillment: Optional[Fulfillment] = None,
                      method: Optional[PaymentMethod] = None, table: Optional[int] = None,
                      start: Optional[str] = None, end: Optional[str] = None,
                      limit: int = Query(default=300, ge=1, le=2000), _=Depends(require_staff)):
    docs = await db.orders.find(order_query(status, fulfillment, method, table, start, end)) \
        .sort("created_at", -1).to_list(limit)
    return [to_order(d) for d in docs]


@router.get("/orders/{order_id}", response_model=Order)
async def billing_statement(order_id: str, _=Depends(require_staff)):
    doc = await db.orders.find_one({"id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    return to_order(doc)


@router.get("/tables", response_model=list[DiningTable])
async def staff_tables(_=Depends(require_staff)):
    docs = await db.tables.find({"active": True}).sort("number", 1).to_list(5000)
    return [DiningTable(**d) for d in docs]


async def _update(order_id: str, expect: dict, update: dict, err: str) -> Order:
    """Atomic conditional update: the filter guards against double-processing."""
    res = await db.orders.find_one_and_update({"id": order_id, **expect}, {"$set": update}, return_document=True)
    if res:
        return to_order(res)
    if not await db.orders.find_one({"id": order_id}):
        raise HTTPException(status_code=404, detail="Order not found")
    raise HTTPException(status_code=409, detail=err)


@router.post("/orders/{order_id}/pay", response_model=Order)
async def confirm_payment(order_id: str, body: PayIn, user: dict = Depends(require_staff)):
    doc = await db.orders.find_one({"id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    if doc["status"] != "unpaid":
        raise HTTPException(status_code=409, detail=f"Order is already {doc['status']}")
    tendered = body.amount_tendered if body.payment_method == "cash" and body.amount_tendered is not None else doc["total"]
    if tendered < doc["total"]:
        raise HTTPException(status_code=400, detail="Amount tendered is less than the total")
    update = {
        "status": "paid",
        "payment_method": body.payment_method,
        "payment_reference": body.payment_reference.strip() or doc.get("payment_reference", ""),
        "amount_tendered": round(tendered, 2),
        "change": round(tendered - doc["total"], 2),
        "processed_by": user["username"],
        "paid_at": datetime.now(timezone.utc),
    }
    return await _update(order_id, {"status": "unpaid"}, update, "Order was already processed")


@router.post("/orders/{order_id}/serve", response_model=Order)
async def mark_served(order_id: str, user: dict = Depends(require_staff)):
    update = {"fulfillment": "served", "served_by": user["username"], "served_at": datetime.now(timezone.utc)}
    return await _update(order_id, {"status": {"$ne": "cancelled"}, "fulfillment": {"$ne": "served"}}, update,
                         "Order is already served or was cancelled")


@router.post("/orders/{order_id}/cancel", response_model=Order)
async def cancel_order(order_id: str, user: dict = Depends(require_staff)):
    update = {"status": "cancelled", "processed_by": user["username"]}
    return await _update(order_id, {"status": "unpaid"}, update, "Only unpaid orders can be cancelled")
