import asyncio
from datetime import datetime, timezone
from lib.db import db, ensure_indexes

async def seed():
    print("Seeding Coffee Beats by Life initial catalog & settings...")
    await ensure_indexes()

    # Clear existing demo data
    await db.products.delete_many({})
    await db.categories.delete_many({})
    await db.settings.delete_many({})
    await db.orders.delete_many({})

    # Seed Settings
    settings = {
        "id": "main_settings",
        "store_name": "Coffee Beats by Life",
        "tagline": "STAY FOR A MOMENT. CRAFTED FOR LIFE",
        "logo_url": "",
        "background_url": "https://images.unsplash.com/photo-1598022186152-1b66e6c38245?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwyfHxjb2ZmZWUlMjBjdXAlMjBsYXR0ZSUyMHBhc3RyeXxlbnwwfHx8fDE3OTE2MjU1MDl8MA&ixlib=rb-4.1.0&q=85",
        "gcash_name": "Coffee Beats Cashier",
        "gcash_number": "0917-123-4567",
        "gcash_qr_url": "",
        "terms_and_conditions": "By accessing the admin dashboard, you agree to handle customer and store information with strict confidentiality and comply with restaurant operation protocols."
    }
    await db.settings.insert_one(settings)

    # Seed Categories
    categories = [
        {"id": "cat_coffee", "name": "Coffee"},
        {"id": "cat_non_coffee", "name": "Non-Coffee"},
        {"id": "cat_pastries", "name": "Pastries & Cakes"},
        {"id": "cat_meals", "name": "All-Day Meals"}
    ]
    await db.categories.insert_many(categories)

    # Seed 9 classic items (3x3 grid like the user sample)
    products = [
        {
            "id": "prod_1",
            "name": "Artisan Latte",
            "category": "Coffee",
            "price": 140.0,
            "description": "Rich espresso with velvety steamed milk and crafted latte art.",
            "image_url": "https://images.unsplash.com/photo-1776397280314-275d0f295fd9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHw0fHxjb2ZmZWUlMjBjdXAlMjBsYXR0ZSUyMHBhc3RyeXxlbnwwfHx8fDE3OTE2MjU1MDl8MA&ixlib=rb-4.1.0&q=85",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "prod_2",
            "name": "Classic Cappuccino",
            "category": "Coffee",
            "price": 145.0,
            "description": "Equal parts espresso, steamed milk, and dense micro-foam dusting.",
            "image_url": "https://images.unsplash.com/photo-1612880202987-b1ec29fb0839?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwxfHxjb2ZmZWUlMjBjdXAlMjBsYXR0ZSUyMHBhc3RyeXxlbnwwfHx8fDE3OTE2MjU1MDl8MA&ixlib=rb-4.1.0&q=85",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "prod_3",
            "name": "Spanish Latte",
            "category": "Coffee",
            "price": 160.0,
            "description": "Sweetened condensed milk balanced with double shot espresso.",
            "image_url": "https://images.unsplash.com/photo-1598022186152-1b66e6c38245?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwyfHxjb2ZmZWUlMjBjdXAlMjBsYXR0ZSUyMHBhc3RyeXxlbnwwfHx8fDE3OTE2MjU1MDl8MA&ixlib=rb-4.1.0&q=85",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "prod_4",
            "name": "Matcha Cream Latte",
            "category": "Non-Coffee",
            "price": 165.0,
            "description": "Ceremonial grade Japanese green tea paired with oat milk.",
            "image_url": "https://images.unsplash.com/photo-1776397280314-275d0f295fd9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHw0fHxjb2ZmZWUlMjBjdXAlMjBsYXR0ZSUyMHBhc3RyeXxlbnwwfHx8fDE3OTE2MjU1MDl8MA&ixlib=rb-4.1.0&q=85",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "prod_5",
            "name": "Dark Chocolate Tart",
            "category": "Pastries & Cakes",
            "price": 130.0,
            "description": "70% Belgian chocolate filling on a buttery baked crust.",
            "image_url": "https://images.unsplash.com/photo-1777000000010-c44d5c4caeb9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwzfHxjb2ZmZWUlMjBjdXAlMjBsYXR0ZSUyMHBhc3RyeXxlbnwwfHx8fDE3OTE2MjU1MDl8MA&ixlib=rb-4.1.0&q=85",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "prod_6",
            "name": "Butter Croissant",
            "category": "Pastries & Cakes",
            "price": 95.0,
            "description": "Flaky, golden baked French croissant served warm.",
            "image_url": "https://images.unsplash.com/photo-1776397280314-275d0f295fd9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHw0fHxjb2ZmZWUlMjBjdXAlMjBsYXR0ZSUyMHBhc3RyeXxlbnwwfHx8fDE3OTE2MjU1MDl8MA&ixlib=rb-4.1.0&q=85",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "prod_7",
            "name": "Iced Caramel Macchiato",
            "category": "Coffee",
            "price": 155.0,
            "description": "Fresh milk with vanilla, layered with espresso and caramel drizzle.",
            "image_url": "https://images.unsplash.com/photo-1598022186152-1b66e6c38245?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwyfHxjb2ZmZWUlMjBjdXAlMjBsYXR0ZSUyMHBhc3RyeXxlbnwwfHx8fDE3OTE2MjU1MDl8MA&ixlib=rb-4.1.0&q=85",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "prod_8",
            "name": "Signature Waffle with Ice Cream",
            "category": "Pastries & Cakes",
            "price": 180.0,
            "description": "Crisp Belgian waffle topped with vanilla bean gelato.",
            "image_url": "https://images.unsplash.com/photo-1777000000010-c44d5c4caeb9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwzfHxjb2ZmZWUlMjBjdXAlMjBsYXR0ZSUyMHBhc3RyeXxlbnwwfHx8fDE3OTE2MjU1MDl8MA&ixlib=rb-4.1.0&q=85",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "prod_9",
            "name": "Creamy Truffle Pasta",
            "category": "All-Day Meals",
            "price": 240.0,
            "description": "Fettuccine in white truffle cream sauce with parmesan.",
            "image_url": "https://images.unsplash.com/photo-1776397280314-275d0f295fd9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHw0fHxjb2ZmZWUlMjBjdXAlMjBsYXR0ZSUyMHBhc3RyeXxlbnwwfHx8fDE3OTE2MjU1MDl8MA&ixlib=rb-4.1.0&q=85",
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.products.insert_many(products)

    # Seed Sample Initial Order for Table 2
    sample_order = {
        "id": "ord_sample_1",
        "table_number": 2,
        "nickname": "Alex",
        "items": [
            {"product_id": "prod_1", "name": "Artisan Latte", "price": 140.0, "quantity": 2},
            {"product_id": "prod_5", "name": "Dark Chocolate Tart", "price": 130.0, "quantity": 1}
        ],
        "total_amount": 410.0,
        "payment_method": "GCASH",
        "payment_status": "PENDING",
        "notes": "Less ice please",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(sample_order)

    print("Database seeding completed successfully.")

if __name__ == "__main__":
    asyncio.run(seed())
