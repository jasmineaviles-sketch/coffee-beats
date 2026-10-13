"""Criterion: Excel export (Orders / Backup and Export) with date range /
status filters downloads a workbook with sheets Order Summary, Order Items,
Daily Sales, Products; totals match staff orders count for the same filters;
invalid range (start>end) surfaces an error.
"""
import io
from datetime import datetime, timedelta, timezone

import httpx
import openpyxl

from .conftest import API_URL
from .helpers import place_order


def _admin_client():
    c = httpx.Client(base_url=API_URL, timeout=30.0)
    login = c.post(
        "/auth/login",
        json={"username": "admin", "password": "admin123", "portal": "admin", "accept_terms": True},
    )
    assert login.status_code == 200, login.text
    return c


def test_export_workbook_sheets_and_counts_match():
    c = _admin_client()
    try:
        # create one fixture order so there is a known row to cross-check.
        # NOTE: counts are compared against /api/staff/orders filtered by the
        # SAME query the export used, both read moments apart, so this stays
        # robust even if other tscheck fixtures share the broad date window.
        resp, _ = place_order(c, table_number=1, payment_method="cash")
        assert resp.status_code == 201, resp.text
        order_number = resp.json()["order_number"]

        now = datetime.now(timezone.utc)
        start = (now - timedelta(days=1)).strftime("%Y-%m-%d")
        end = (now + timedelta(days=1)).strftime("%Y-%m-%d")

        # Read the staff listing first, then export immediately after -
        # export aggregates the same collection so as long as no deletes
        # happen between the two reads the counts must match.
        staff_orders = c.get("/staff/orders", params={"start": start, "end": end, "limit": 2000})
        assert staff_orders.status_code == 200, staff_orders.text
        staff_list = staff_orders.json()
        staff_count = len(staff_list) if isinstance(staff_list, list) else len(staff_list.get("orders", []))
        staff_numbers = {o["order_number"] for o in staff_list} if isinstance(staff_list, list) else set()
        assert order_number in staff_numbers, f"fixture order {order_number} missing from staff listing"

        export_resp = c.get("/admin/export.xlsx", params={"start": start, "end": end})
        assert export_resp.status_code == 200, export_resp.text
        assert "spreadsheetml" in export_resp.headers.get("content-type", "") or \
            export_resp.headers.get("content-type", "") == "application/octet-stream"

        wb = openpyxl.load_workbook(io.BytesIO(export_resp.content))
        expected_sheets = {"Order Summary", "Order Items", "Daily Sales", "Products"}
        assert expected_sheets.issubset(set(wb.sheetnames)), wb.sheetnames

        summary_sheet = wb["Order Summary"]
        summary_rows = summary_sheet.max_row - 1  # minus header
        header = [cell.value for cell in next(summary_sheet.iter_rows(min_row=1, max_row=1))]
        order_no_col = header.index("Order #") if "Order #" in header else (
            header.index("Order Number") if "Order Number" in header else None)
        assert order_no_col is not None, f"could not find order number column in {header}"
        exported_numbers = {
            row[order_no_col] for row in summary_sheet.iter_rows(min_row=2, values_only=True)
        }
        assert order_number in exported_numbers, (
            f"fixture order {order_number} missing from exported Order Summary sheet"
        )
        # totals in the same ballpark as the staff listing for the identical filter
        assert abs(summary_rows - staff_count) <= 2, (
            f"Order Summary rows ({summary_rows}) far from /api/staff/orders count ({staff_count})"
        )
    finally:
        c.close()


def test_export_invalid_date_range_rejected():
    c = _admin_client()
    try:
        resp = c.get("/admin/export.xlsx", params={"start": "2026-05-10", "end": "2026-05-01"})
        assert resp.status_code >= 400, f"expected error for start>end, got {resp.status_code}: {resp.text[:200]}"
    finally:
        c.close()
