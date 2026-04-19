# Shoes Store Backend — API Reference

**Base URL:** `http://localhost:6969/api/v1`  
**Auth:** JWT via `accessToken` cookie (set automatically on login) or `Authorization: Bearer <token>` header.  
**Content-Type:** `application/json` for all requests except product create/update and avatar upload which use `multipart/form-data`.

All responses follow this shape:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "...",
  "data": { ... }
}
```

---

## Authentication

### POST `/auth/register`
Register a new user account.

**Access:** Public

**Body:**
```json
{
  "firstName": "Bob",
  "lastName": "Smith",
  "email": "bob@example.com",
  "password": "securePass123",
  "role": "buyer"
}
```
`role` accepts `"buyer"` or `"seller"`. Defaults to `"buyer"` if omitted.

**Response `201`:**
```json
{
  "data": {
    "_id": "...",
    "firstName": "Bob",
    "lastName": "Smith",
    "email": "bob@example.com",
    "role": "buyer",
    "isUserVerified": true,
    "isBlocked": false,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### POST `/auth/login`
Log in and receive JWT tokens as cookies.

**Access:** Public

**Body:**
```json
{
  "email": "bob@example.com",
  "password": "securePass123"
}
```

**Response `200`:**
Sets `accessToken` (1 day) and `refreshToken` (10 days) as `httpOnly` cookies.
```json
{
  "data": {
    "user": { "_id": "...", "firstName": "Bob", "role": "buyer", ... },
    "accessToken": "eyJ..."
  }
}
```
> Frontend note: store `accessToken` from response body for header-based auth, OR rely on cookies (recommended for browser apps).

---

### POST `/auth/logout`
Clear tokens and end session.

**Access:** Any logged-in user

**Body:** none

**Response `200`:** Clears both cookies.

---

### POST `/auth/refresh-token`
Get a new access token using the refresh token cookie.

**Access:** Public (reads `refreshToken` cookie automatically)

**Body:** none

**Response `200`:**
Sets new `accessToken` and `refreshToken` cookies.
```json
{
  "data": { "accessToken": "eyJ..." }
}
```

---

### GET `/auth/get-me`
Get the currently logged-in user's profile.

**Access:** Any logged-in user

**Response `200`:**
```json
{
  "data": {
    "_id": "...",
    "firstName": "Bob",
    "lastName": "Smith",
    "email": "bob@example.com",
    "role": "buyer",
    "phone": "...",
    "address": { "street": "...", "city": "...", "state": "...", "zipCode": "...", "country": "..." },
    "avatar": "<imageId>",
    "isUserVerified": true,
    "isBlocked": false
  }
}
```

---

## Users

### GET `/users/me`
Get own profile.

**Access:** Any logged-in user

**Response `200`:** Same shape as `/auth/get-me`.

---

### PATCH `/users/me`
Update own profile (name, phone, address).

**Access:** Any logged-in user

**Body (all fields optional):**
```json
{
  "firstName": "Robert",
  "lastName": "Smith",
  "phone": "+1-555-0100",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```
> Buyers must add an address before placing orders.

**Response `200`:** Updated user object.

---

### PATCH `/users/me/change-password`
Change own password.

**Access:** Any logged-in user

**Body:**
```json
{
  "currentPassword": "oldPass123",
  "newPassword": "newSecurePass456"
}
```

**Response `200`:** `{ "data": null, "message": "Password changed." }`

---

### PATCH `/users/me/avatar`
Upload a profile picture.

**Access:** Any logged-in user  
**Content-Type:** `multipart/form-data`

**Form fields:**
| Field | Type | Description |
|-------|------|-------------|
| `avatar` | File (image) | Max 5 MB. JPEG, PNG, or WebP. |

**Response `200`:** Updated user object with `avatar` set to an image ID.  
To display the image: `GET /api/v1/image/<imageId>`

---

### DELETE `/users/me`
Delete own account permanently.

**Access:** Any logged-in user

**Response `200`:** `{ "data": null, "message": "Account deleted." }`

---

### GET `/users/admin/all`
List all users with filters and pagination.

**Access:** Admin only

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `role` | string | Filter by `admin`, `buyer`, or `seller` |
| `isBlocked` | boolean | `true` or `false` |
| `search` | string | Search by name or email |
| `page` | number | Default `1` |
| `limit` | number | Default `20` |

**Response `200`:**
```json
{
  "data": {
    "items": [ { ...user }, ... ],
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### GET `/users/admin/:userId`
Get a specific user by ID.

**Access:** Admin only

**Response `200`:** User object.

---

### PATCH `/users/admin/:userId`
Update a user's profile fields (name, phone, address).

**Access:** Admin only

**Body:** Same as `PATCH /users/me` (all optional).

**Response `200`:** Updated user object.

---

### DELETE `/users/admin/:userId`
Delete a user account.

**Access:** Admin only

**Response `200`:** `{ "data": null }`

---

### PATCH `/users/admin/:userId/block`
Block a user (prevents login).

**Access:** Admin only

**Response `200`:** User object with `isBlocked: true`.

---

### PATCH `/users/admin/:userId/unblock`
Unblock a user.

**Access:** Admin only

**Response `200`:** User object with `isBlocked: false`.

---

### PATCH `/users/admin/:userId/change-role`
Change a user's role.

**Access:** Admin only

**Body:**
```json
{ "role": "seller" }
```
`role` accepts `"buyer"`, `"seller"`, or `"admin"`.

**Response `200`:** Updated user object.

---

## Categories

### GET `/categories`
List all categories.

**Access:** Public

**Response `200`:**
```json
{
  "data": [
    { "_id": "...", "name": "Running Shoes", "slug": "running-shoes", "description": "...", "image": "<imageId>" },
    ...
  ]
}
```

---

### GET `/categories/:slugOrId`
Get a single category by its slug or MongoDB ID.

**Access:** Public

**Examples:**
- `/categories/running-shoes`
- `/categories/64abc123...`

**Response `200`:** Category object.

---

### POST `/categories`
Create a new category.

**Access:** Admin only

**Body:**
```json
{
  "name": "Running Shoes",
  "description": "High-performance running footwear"
}
```
Slug is auto-generated from the name.

**Response `201`:** Created category object with `slug`.

---

### PATCH `/categories/:categoryId`
Update a category.

**Access:** Admin only

**Body (all optional):**
```json
{
  "name": "Trail Running Shoes",
  "description": "Updated description"
}
```

**Response `200`:** Updated category object.

---

### DELETE `/categories/:categoryId`
Delete a category.

**Access:** Admin only

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `force` | boolean | Pass `?force=true` to delete even if products exist under this category |

**Response `200`:** `{ "data": null }`  
Returns `400` if products still use this category (unless `?force=true`).

---

## Products

### GET `/products`
List products with filtering, sorting, and pagination.

**Access:** Public

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Category slug or ID |
| `size` | number | Filter by available size (only shows sizes with stock > 0) |
| `minPrice` | number | Minimum base price |
| `maxPrice` | number | Maximum base price |
| `seller` | string | Seller user ID |
| `search` | string | Full-text search across name, description, brand |
| `sort` | string | `price_asc`, `price_desc`, `rating`, `newest` (default) |
| `page` | number | Default `1` |
| `limit` | number | Default `20` |
| `isActive` | boolean | Defaults to `true`. Pass `false` to see inactive products (admin use) |

**Response `200`:**
```json
{
  "data": {
    "items": [
      {
        "_id": "...",
        "name": "Nike Air Max 270",
        "slug": "nike-air-max-270",
        "description": "...",
        "brand": "Nike",
        "category": { "_id": "...", "name": "Running Shoes", "slug": "running-shoes" },
        "seller": { "_id": "...", "firstName": "Sam", "lastName": "Seller" },
        "basePrice": 150,
        "images": [ "<imageId>", ... ],
        "sizeVariants": [
          { "size": 8, "stock": 10 },
          { "size": 9, "stock": 13, "price": 155 },
          { "size": 10, "stock": 8 }
        ],
        "tags": [ "running", "cushion" ],
        "isActive": true,
        "averageRating": 4.5,
        "reviewCount": 12
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```
> `sizeVariants[n].price` overrides `basePrice` for that size if set; otherwise use `basePrice`.  
> Images: display via `GET /api/v1/image/<imageId>`.

---

### GET `/products/:slugOrId`
Get a single product.

**Access:** Public

**Examples:**
- `/products/nike-air-max-270`
- `/products/64abc123...`

**Response `200`:** Full product object (same shape as above, single item).

---

### GET `/products/seller/my-products`
List all products belonging to the logged-in seller.

**Access:** Seller only

**Query params:** `page`, `limit`

**Response `200`:** Paginated list of seller's products.

---

### POST `/products`
Create a new product.

**Access:** Seller only  
**Content-Type:** `multipart/form-data`

**Form fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Product name |
| `description` | string | Yes | Min 10 chars |
| `brand` | string | Yes | Brand name |
| `category` | string | Yes | Category MongoDB ID |
| `basePrice` | number | Yes | Default price |
| `sizeVariants` | JSON string | Yes | Array of `{ size, stock, price? }` |
| `tags` | JSON string / CSV | No | Array of strings or comma-separated |
| `images` | File(s) | No | Up to 10 images, max 5 MB each |

`sizeVariants` example value: `[{"size":8,"stock":10},{"size":9,"stock":15},{"size":10,"stock":8}]`

**Response `201`:** Created product object.

---

### PATCH `/products/:productId`
Update a product.

**Access:** Seller (own products only) or Admin (any product)  
**Content-Type:** `multipart/form-data`

**Form fields (all optional):**
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | |
| `description` | string | |
| `brand` | string | |
| `category` | string | Category ID |
| `basePrice` | number | |
| `sizeVariants` | JSON string | Replaces all variants |
| `tags` | JSON string / CSV | Replaces all tags |
| `isActive` | boolean | `"true"` or `"false"` to activate/deactivate |
| `images` | File(s) | Appends new images to existing list |

**Response `200`:** Updated product object.

---

### DELETE `/products/:productId`
Delete a product.

**Access:** Seller (own products only) or Admin (any product)

**Response `200`:** `{ "data": null }`

---

## Orders

### POST `/orders`
Place a new order.

**Access:** Buyer only

> Buyer must have a shipping address saved on their profile (`PATCH /users/me`) before ordering.

**Body:**
```json
{
  "productId": "<productId>",
  "size": 9,
  "quantity": 2
}
```

**Response `201`:**
```json
{
  "data": {
    "_id": "...",
    "buyer": "<buyerId>",
    "seller": { "_id": "...", "firstName": "Sam", "lastName": "Seller" },
    "product": { "_id": "...", "name": "Nike Air Max 270", "brand": "Nike", "images": [...] },
    "size": 9,
    "quantity": 2,
    "unitPrice": 150,
    "totalPrice": 300,
    "shippingAddress": { "street": "...", "city": "...", "state": "...", "zipCode": "...", "country": "..." },
    "status": "pending",
    "statusHistory": [
      { "status": "pending", "changedBy": "<userId>", "changedAt": "..." }
    ],
    "createdAt": "..."
  }
}
```
> Price and address are snapshotted at order time — future profile/product changes won't affect existing orders.  
> Stock is atomically decremented to prevent overselling.

---

### GET `/orders/my`
List the buyer's own orders.

**Access:** Buyer only

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by order status |
| `page` | number | Default `1` |
| `limit` | number | Default `20` |

**Response `200`:** Paginated list of orders with product and seller info populated.

---

### GET `/orders/my/:orderId`
Get a specific order's full detail.

**Access:** Buyer only (own orders)

**Response `200`:** Full order object including `statusHistory`.

---

### PATCH `/orders/my/:orderId/cancel`
Cancel a pending order and restore stock.

**Access:** Buyer only  
**Constraint:** Only orders with `status: "pending"` can be cancelled by the buyer.

**Body (optional):**
```json
{ "cancelReason": "Changed my mind" }
```

**Response `200`:** Updated order with `status: "cancelled"`.

---

### GET `/orders/seller`
List all orders for the seller's products.

**Access:** Seller only

**Query params:** `status`, `page`, `limit`

**Response `200`:** Paginated list of orders with product and buyer info populated.

---

### GET `/orders/seller/:orderId`
Get a specific order's detail (seller view).

**Access:** Seller only (orders on their products)

**Response `200`:** Full order object.

---

### PATCH `/orders/seller/:orderId/status`
Update an order's status. Used from the seller's orders dashboard.

**Access:** Seller only

**Body:**
```json
{
  "status": "confirmed",
  "note": "Order verified and being prepared."
}
```

**Allowed status values:** `confirmed`, `processing`, `shipped`, `out_for_delivery`, `delivered`, `cancelled`

**Valid transitions:**
```
pending          → confirmed | cancelled
confirmed        → processing | cancelled
processing       → shipped | cancelled
shipped          → out_for_delivery | cancelled
out_for_delivery → delivered | cancelled
```
Any other transition returns `400`.  
Setting `cancelled` from the seller side also restores stock.

**Response `200`:** Updated order object with the new status appended to `statusHistory`.

---

### GET `/orders/admin`
List all orders in the system.

**Access:** Admin only

**Query params:** `status`, `buyer` (userId), `seller` (userId), `page`, `limit`

**Response `200`:** Paginated list.

---

### GET `/orders/admin/:orderId`
Get any order by ID.

**Access:** Admin only

**Response `200`:** Full order object with buyer and seller populated.

---

### DELETE `/orders/admin/:orderId`
Delete an order record.

**Access:** Admin only

**Response `200`:** `{ "data": null }`

---

## Reviews & Ratings

### GET `/reviews/product/:productId`
Get all reviews for a product.

**Access:** Public

**Query params:** `page`, `limit`

**Response `200`:**
```json
{
  "data": {
    "items": [
      {
        "_id": "...",
        "product": "<productId>",
        "buyer": { "_id": "...", "firstName": "Bob", "lastName": "Buyer", "avatar": "<imageId>" },
        "rating": 5,
        "comment": "Amazing shoes!",
        "isEdited": false,
        "createdAt": "..."
      }
    ],
    "total": 8,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```
> Overall rating stats (`averageRating`, `reviewCount`) are available directly on the product object — no need to calculate from reviews on the frontend.

---

### GET `/reviews/my`
Get all reviews written by the logged-in buyer.

**Access:** Buyer only

**Query params:** `page`, `limit`

**Response `200`:** Paginated list of reviews with `product` populated (name, brand, slug, images).

---

### POST `/reviews/product/:productId`
Submit a review for a product.

**Access:** Buyer only  
**Constraint:** One review per buyer per product. Returns `409` if already reviewed.

**Body:**
```json
{
  "rating": 5,
  "comment": "Amazing shoes! Super comfortable."
}
```
`rating` must be an integer between 1 and 5. `comment` is optional (max 1000 chars).

**Response `201`:** Created review object.  
> `product.averageRating` and `product.reviewCount` are automatically recalculated after every review action.

---

### PATCH `/reviews/:reviewId`
Edit an existing review.

**Access:** Buyer only (own reviews)

**Body (all optional):**
```json
{
  "rating": 4,
  "comment": "Updated comment."
}
```

**Response `200`:** Updated review with `isEdited: true`.

---

### DELETE `/reviews/:reviewId`
Delete a review.

**Access:** Buyer (own reviews) or Admin (any review)

**Response `200`:** `{ "data": null }`

---

## Images

### GET `/image/:imageId`
Retrieve a stored image (product photo, avatar, category image).

**Access:** Public

**Response:** Raw image binary with the correct `Content-Type` header (e.g. `image/jpeg`, `image/webp`).

**Usage in frontend:**
```html
<img src="http://localhost:6969/api/v1/image/<imageId>" />
```
or in CSS:
```css
background-image: url('http://localhost:6969/api/v1/image/<imageId>');
```

---

## Order Status Reference

| Status | Meaning | Who sets it |
|--------|---------|-------------|
| `pending` | Order placed, awaiting seller confirmation | System (on order create) |
| `confirmed` | Seller accepted the order | Seller |
| `processing` | Order is being packed/prepared | Seller |
| `shipped` | Order handed to courier | Seller |
| `out_for_delivery` | Courier is delivering | Seller |
| `delivered` | Order received by buyer | Seller |
| `cancelled` | Order cancelled | Buyer (from `pending`) or Seller (any non-delivered) |

---

## Role Permissions Summary

| Action | Buyer | Seller | Admin |
|--------|-------|--------|-------|
| Register / Login | ✅ | ✅ | ✅ |
| View products & categories | ✅ | ✅ | ✅ |
| Place order | ✅ | ❌ | ❌ |
| Cancel own order (pending) | ✅ | ❌ | ❌ |
| Write / edit / delete own review | ✅ | ❌ | ❌ |
| Create / edit / delete own products | ❌ | ✅ | ✅ |
| View & update order status | ❌ | ✅ | ✅ |
| Manage categories | ❌ | ❌ | ✅ |
| Block / unblock / change role of users | ❌ | ❌ | ✅ |
| Delete any order / review | ❌ | ❌ | ✅ |

---

## Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request (validation error, business rule violation) |
| `401` | Unauthorized (missing/invalid/expired token, blocked account) |
| `403` | Forbidden (correct token but wrong role or not owner) |
| `404` | Resource not found |
| `409` | Conflict (duplicate email, already reviewed) |
| `500` | Internal server error |

---

## Frontend Quick-Start

### 1. Register & login
```js
// Register
await fetch('/api/v1/auth/register', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ firstName, lastName, email, password, role: 'buyer' })
});

// Login — cookies set automatically
const res = await fetch('/api/v1/auth/login', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { data: { accessToken } } = await res.json();
```

### 2. Authenticated requests
```js
// Option A: cookie-based (recommended for browsers)
fetch('/api/v1/orders/my', { credentials: 'include' });

// Option B: header-based
fetch('/api/v1/orders/my', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

### 3. Product listing with filters
```js
const params = new URLSearchParams({ category: 'running-shoes', size: 9, sort: 'price_asc', page: 1 });
const res = await fetch(`/api/v1/products?${params}`);
const { data: { items, total, totalPages } } = await res.json();
```

### 4. Place an order
```js
// First ensure buyer has address saved
await fetch('/api/v1/users/me', {
  method: 'PATCH',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: { street, city, state, zipCode, country } })
});

// Then place order
await fetch('/api/v1/orders', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ productId, size, quantity })
});
```

### 5. Upload product images (seller)
```js
const formData = new FormData();
formData.append('name', 'Nike Air Max 270');
formData.append('description', 'The Nike Air Max 270...');
formData.append('brand', 'Nike');
formData.append('category', categoryId);
formData.append('basePrice', '150');
formData.append('sizeVariants', JSON.stringify([{ size: 9, stock: 20 }, { size: 10, stock: 15 }]));
formData.append('images', imageFile1);
formData.append('images', imageFile2);

await fetch('/api/v1/products', {
  method: 'POST',
  credentials: 'include',
  body: formData  // no Content-Type header — browser sets it with boundary
});
```

### 6. Seller updates order status
```js
await fetch(`/api/v1/orders/seller/${orderId}/status`, {
  method: 'PATCH',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'confirmed', note: 'Packing your order.' })
});
```

### 7. Token refresh (call on 401 response)
```js
async function refreshTokens() {
  const res = await fetch('/api/v1/auth/refresh-token', {
    method: 'POST',
    credentials: 'include'
  });
  if (!res.ok) {
    // Refresh token expired — redirect to login
    window.location.href = '/login';
    return;
  }
  const { data: { accessToken } } = await res.json();
  return accessToken;
}
```
