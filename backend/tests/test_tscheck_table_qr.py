"""Criterion: Table QR management - add single table, add range, duplicate
rejected, edit label, deactivate (ordering blocked + menu shows not available),
reactivate.

Uses high table numbers (tscheck namespace: 9001+) to avoid touching seeded
tables 1-40 or the user's historical data.
"""
import random

import httpx

from .conftest import API_URL


def _admin_client():
    c = httpx.Client(base_url=API_URL, timeout=30.0)
    login = c.post(
        "/auth/login",
        json={"username": "admin", "password": "admin123", "portal": "admin", "accept_terms": True},
    )
    assert login.status_code == 200, login.text
    return c


def test_add_single_table_and_duplicate_rejected():
    c = _admin_client()
    try:
        number = random.randint(9001, 9099)
        resp = c.post("/admin/tables", json={"number": number, "label": f"tscheck-{number}"})
        assert resp.status_code == 201, resp.text
        created = resp.json()
        assert created["number"] == number
        assert created["active"] is True

        dup = c.post("/admin/tables", json={"number": number, "label": "dup"})
        assert dup.status_code >= 400, dup.text
        assert dup.status_code != 201

        # confirm it shows in admin + staff table grids
        admin_list = c.get("/admin/tables").json()
        assert any(t["number"] == number for t in admin_list)
        staff_list = c.get("/staff/tables").json()
        assert any(t["number"] == number for t in staff_list)
    finally:
        c.close()


def test_add_range_edit_label_deactivate_reactivate():
    c = _admin_client()
    try:
        start = random.randint(9200, 9299)
        end = start + 3
        resp = c.post("/admin/tables/bulk", json={"start": start, "end": end})
        assert resp.status_code == 201, resp.text
        out = resp.json()
        admin_list = c.get("/admin/tables").json()
        nums = {t["number"] for t in admin_list}
        for n in range(start, end + 1):
            assert n in nums, f"table {n} missing after bulk add: {out}"

        target = start
        # edit label
        edit_resp = c.put(f"/admin/tables/{target}", json={"label": "tscheck-edited", "active": True})
        assert edit_resp.status_code == 200, edit_resp.text
        assert edit_resp.json()["label"] == "tscheck-edited"

        # deactivate -> public table lookup should say not available, ordering blocked
        deact_resp = c.put(f"/admin/tables/{target}", json={"label": "tscheck-edited", "active": False})
        assert deact_resp.status_code == 200, deact_resp.text
        assert deact_resp.json()["active"] is False

        public_lookup = c.get(f"/tables/{target}")
        assert public_lookup.status_code == 200, public_lookup.text
        assert public_lookup.json()["active"] is False, public_lookup.text

        products = c.get("/products").json()
        order_resp = c.post(
            "/orders",
            json={
                "table_number": target,
                "nickname": "tscheck-deactivated",
                "payment_method": "cash",
                "payment_reference": "",
                "notes": "",
                "client_token": f"tscheck-deact-{target}",
                "items": [{"product_id": products[0]["id"], "qty": 1}],
            },
        )
        assert order_resp.status_code == 400, order_resp.text

        # reactivate
        react_resp = c.put(f"/admin/tables/{target}", json={"label": "tscheck-edited", "active": True})
        assert react_resp.status_code == 200, react_resp.text
        assert react_resp.json()["active"] is True
    finally:
        c.close()
