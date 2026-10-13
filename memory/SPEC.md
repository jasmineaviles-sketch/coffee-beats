# Coffee Beats by Life - QR Table Ordering, Cashier Terminal, Admin Dashboard

## What it does
- Customer scans a table QR -> `/t/{number}` opens the menu with the TABLE # badge auto-filled. Customer adds items, reviews (BACK / CONFIRM ORDER), enters nickname + optional notes, picks payment: Cash, GCash (shows QR image, account name, account number separately; NO reference field), or Card/ATM (card number, holder, MM, YYYY, CVV; only last 4 + holder are stored).
- After placing, customer sees a ticket only (order #, item count, payment status, order status). Customers NEVER see the billing statement / prices of a placed order (`GET /api/orders/{id}` returns `OrderTicket` with no prices). Billing statement is staff-only (`GET /api/staff/orders/{id}`).
- Cashier (`/cashier`) sees live orders (4s polling), table grid (active tables, highlighted when open orders), filters New / Unpaid / Served / Paid / Cancelled / All, order detail (items, qty, unit price, subtotal, total, method, payment status, order status, notes, date/time), actions: Confirm payment (cashier verifies first; cash needs amount received), Mark as served, Cancel (unpaid only), print Billing statement / Official receipt.
- Admin (`/admin`, must accept Terms and Conditions to log in): sidebar sections Overview, Products (CRUD, upload/URL images), Orders (filters + pagination + export), Table QR (add one, add range, edit label, activate/deactivate, unlimited tables, print QR sheet), Settings (shop name, tagline, logo, background, categories, GCash name/number/QR, receipt footer, T&C text, staff logins), Backup and Export (Excel with date/status/method filters, JSON backup, restore).

## Data model (Mongo)
- products {id, name, description, price, category, image_url, available, sort_order, created_at}
- tables {id, number (unique), label, active, created_at} - seeded 1..40 on first run
- orders {id, order_number, table_number, table_label, nickname, notes, items[{product_id,name,price,qty,subtotal}], item_count, total, payment_method cash|gcash|card, payment_reference, status unpaid|paid|cancelled (payment), fulfillment new|served (order status), amount_tendered, change, processed_by, served_by, created_at, paid_at, served_at, client_token (unique idempotency key)}
- settings {_key:"main", ...Settings}; logo_url default `/brand/logo.png` (official logo in frontend/public/brand)
- images {id, content_type, data(base64)} served at /api/images/{id}; uploads PNG/JPG/WEBP/GIF, max 4 MB, magic-byte checked
- users {username, password_hash(pbkdf2), role admin|cashier}; sessions {token, username, role, expires_at TTL}

## Auth / roles
- httpOnly cookie `cb_session`. `/api/staff/*` = admin or cashier. `/api/admin/*` = admin only (cashier gets 403). Admin login requires `accept_terms: true`.
- Credentials: see test_credentials.md.

## Rules
- Payment is only marked paid by staff via POST /api/staff/orders/{id}/pay (409 if already processed).
- Duplicate submits with the same client_token return the original order.
- Inactive or non-existent tables cannot order (400) and the menu shows "Table not available / not found".
- Excel export: sheets Order Summary, Order Items, Daily Sales, Products; X-Order-Count header.
