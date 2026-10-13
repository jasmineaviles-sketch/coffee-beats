"""Idempotent first-run seed: staff accounts, settings and a starter menu. Runs at startup."""

from lib.auth import hash_password
from lib.db import db
from models.schemas import DEFAULT_LOGO, DiningTable, Product, Settings

U = "https://images.unsplash.com/"
Q = "?auto=format&fit=crop&w=700&q=80"

DEFAULT_BG = f"{U}photo-1772188378544-4f37fb074350?auto=format&fit=crop&w=1600&q=80"

DEFAULT_TERMS = """COFFEE BEATS BY LIFE - STAFF SYSTEM TERMS AND CONDITIONS

1. Authorized Use. This dashboard is for authorized administrators and cashiers of Coffee Beats by Life only. Do not share your username or password.
2. Accountability. Every login, product change and payment confirmation is recorded under your account. You are responsible for all actions done using your credentials.
3. Data Privacy. Customer nicknames, orders and payment references are confidential and must be handled in accordance with the Data Privacy Act of 2012 (RA 10173).
4. Accuracy. Product names, prices and images must be accurate before publishing them on the customer menu.
5. Payments. Payments must only be marked as paid after the cash, GCash or card transaction has been verified.
6. Backups. Administrators should download a backup regularly and keep it in a secure cloud folder.
7. Violations. Misuse of this system may result in suspension of access and disciplinary action."""

MENU = [
    ("Hazel-Cloud", "Espresso, hazelnut and cloud-soft milk foam with cinnamon.", 160, "Coffee", "photo-1550731358-491ded4af838"),
    ("Cafe Latte", "Double shot espresso with steamed fresh milk.", 140, "Coffee", "photo-1593443320739-77f74939d0da"),
    ("Spanish Latte", "Espresso, condensed milk and fresh milk.", 155, "Coffee", "photo-1511426420268-4cfdd3763b77"),
    ("Caramel Macchiato", "Vanilla milk, espresso and caramel drizzle.", 165, "Coffee", "photo-1595485225178-457ee5893fa3"),
    ("Iced Matcha Latte", "Ceremonial grade matcha over milk and ice.", 170, "Non-Coffee", "photo-1749280447307-31a68eb38673"),
    ("Matcha Cloud", "Iced matcha with sweet cream cloud.", 180, "Non-Coffee", "photo-1717398804885-a6c22b3e5c2f"),
    ("Butter Croissant", "Flaky, all-butter French croissant.", 95, "Pastries", "photo-1681218079567-35aef7c8e7e4"),
    ("Pain au Chocolat", "Laminated pastry with dark chocolate.", 115, "Pastries", "photo-1681218424681-b4f8228ecea9"),
    ("Lemon Meringue Cube", "Cube croissant with lemon curd and torched meringue.", 135, "Pastries", "photo-1622941367239-8acd68fa946d"),
    ("Clubhouse Sandwich", "Ham, cheese, egg and greens on toasted bread.", 210, "Meals", "photo-1642694358494-3d450f5ea978"),
    ("Chicken Pesto Pasta", "Penne in creamy pesto with grilled chicken and garlic bread.", 245, "Meals", "photo-1723362120818-bc8b54e8229d"),
    ("Truffle Alfredo", "Penne alfredo with truffle oil and garlic bread.", 260, "Meals", "photo-1573821201069-dbf297ca410a"),
]


async def seed() -> None:
    if not await db.users.find_one({"role": "admin"}):
        await db.users.insert_one({"username": "admin", "password_hash": hash_password("admin123"), "role": "admin"})
    if not await db.users.find_one({"role": "cashier"}):
        await db.users.insert_one({"username": "cashier", "password_hash": hash_password("cashier123"), "role": "cashier"})
    current = await db.settings.find_one({"_key": "main"})
    if not current:
        s = Settings(background_url=DEFAULT_BG, terms_text=DEFAULT_TERMS, gcash_name="Coffee Beats by Life").model_dump()
        await db.settings.insert_one({"_key": "main", **s})
    else:
        fix: dict = {}
        if not current.get("logo_url"):
            fix["logo_url"] = DEFAULT_LOGO  # official logo
        if current.get("gcash_number") == "0917-000-0000":
            fix["gcash_number"] = ""  # drop old placeholder number
        if fix:
            await db.settings.update_one({"_key": "main"}, {"$set": fix})
    if await db.tables.count_documents({}) == 0:
        count = int((current or {}).get("table_count") or 40)
        await db.tables.insert_many([DiningTable(number=n).model_dump() for n in range(1, count + 1)])
    await db.orders.update_many({"fulfillment": {"$exists": False}}, {"$set": {"fulfillment": "new", "notes": ""}})
    if await db.products.count_documents({}) == 0:
        docs = [
            Product(name=n, description=d, price=p, category=c, image_url=f"{U}{img}{Q}", sort_order=i).model_dump()
            for i, (n, d, p, c, img) in enumerate(MENU)
        ]
        await db.products.insert_many(docs)
