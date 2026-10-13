"""Shared helpers for backend tests."""
import uuid


def unique_suffix() -> str:
    return uuid.uuid4().hex[:8]


def place_order(client, table_number=1, payment_method="cash", qty=1):
    products = client.get("/products").json()
    assert products, "no seeded products available"
    product = products[0]
    token = f"tscheck-{unique_suffix()}"
    body = {
        "table_number": table_number,
        "nickname": f"tscheck-{unique_suffix()}",
        "payment_method": payment_method,
        "payment_reference": "",
        "notes": "tscheck note",
        "client_token": token,
        "items": [{"product_id": product["id"], "qty": qty}],
    }
    resp = client.post("/orders", json=body)
    return resp, product
