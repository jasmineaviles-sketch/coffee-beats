"""Criterion: customer cannot see billing statement after ordering.

GET /api/orders/{id} must return an OrderTicket with no prices/items.
GET /api/staff/orders/{id} must return 401 without login.
"""
from .helpers import place_order


def test_customer_ticket_has_no_prices(client):
    resp, product = place_order(client, table_number=1, payment_method="cash")
    assert resp.status_code == 201, resp.text
    ticket = resp.json()
    order_id = ticket["id"]

    # the creation response itself (OrderTicket) must not leak prices/items
    assert "total" not in ticket
    assert "items" not in ticket
    assert "price" not in str(ticket.get("payment_method", ""))

    get_resp = client.get(f"/orders/{order_id}")
    assert get_resp.status_code == 200, get_resp.text
    data = get_resp.json()
    assert "total" not in data, f"customer ticket leaked total: {data}"
    assert "items" not in data, f"customer ticket leaked items: {data}"
    assert data["order_number"] == ticket["order_number"]
    assert data["id"] == order_id


def test_staff_order_detail_requires_auth(client):
    resp, _ = place_order(client, table_number=1, payment_method="cash")
    assert resp.status_code == 201, resp.text
    order_id = resp.json()["id"]

    staff_resp = client.get(f"/staff/orders/{order_id}")
    assert staff_resp.status_code == 401, staff_resp.text
