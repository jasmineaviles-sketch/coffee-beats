"""Criterion: role separation and admin terms acceptance.

- Cashier session gets 403 on /api/admin/*.
- Admin login without accept_terms fails with the terms message.
"""
import httpx

from .conftest import API_URL


def test_admin_login_without_terms_fails(client):
    resp = client.post(
        "/auth/login",
        json={"username": "admin", "password": "admin123", "portal": "admin", "accept_terms": False},
    )
    assert resp.status_code in (400, 401, 403, 422), resp.text
    body_text = resp.text.lower()
    assert "terms" in body_text, resp.text


def test_cashier_forbidden_on_admin_routes():
    with httpx.Client(base_url=API_URL, timeout=30.0) as c:
        login = c.post(
            "/auth/login",
            json={"username": "cashier", "password": "cashier123", "portal": "cashier"},
        )
        assert login.status_code == 200, login.text

        resp = c.get("/admin/products")
        assert resp.status_code == 403, resp.text

        resp2 = c.get("/admin/tables")
        assert resp2.status_code == 403, resp2.text
