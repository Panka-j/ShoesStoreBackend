# Shoes Store Frontend — Technical Summary

**For backend developers.** Describes how the frontend consumes the API, manages auth, and handles state.

**Base URL:** `http://localhost:6969/api/v1`  
**Dev server:** `http://localhost:5173` (run `npm run dev`)

---

## Tech Stack

| Layer   | Library                     | Version        |
| ------- | --------------------------- | -------------- |
| UI      | React                       | 19.2.4         |
| Routing | React Router DOM            | 7.14.1         |
| State   | Redux Toolkit + React Redux | 2.11.2 / 9.2.0 |
| HTTP    | Axios                       | 1.15.0         |
| Styling | Tailwind CSS v4             | 4.2.2          |
| Build   | Vite                        | 8.0.4          |

---

## Routes

| Path                        | Access         | Component               |
| --------------------------- | -------------- | ----------------------- |
| `/`                         | Public         | `HomePage`              |
| `/products`                 | Public         | `ProductsPage`          |
| `/products/:slugOrId`       | Public         | `ProductDetailPage`     |
| `/login`                    | Public         | `LoginPage`             |
| `/register`                 | Public         | `RegisterPage`          |
| `/profile`                  | Auth required  | `ProfilePage`           |
| `/orders`                   | Role: `buyer`  | `OrdersPage`            |
| `/orders/:orderId`          | Role: `buyer`  | `OrderDetailPage`       |
| `/seller`                   | Role: `seller` | `SellerDashboardPage`   |
| `/seller/products`          | Role: `seller` | `SellerProductsPage`    |
| `/seller/products/new`      | Role: `seller` | `ProductFormPage`       |
| `/seller/products/:id/edit` | Role: `seller` | `ProductFormPage`       |
| `/seller/orders`            | Role: `seller` | `SellerOrdersPage`      |
| `/seller/orders/:orderId`   | Role: `seller` | `SellerOrderDetailPage` |
| `*`                         | Public         | `NotFoundPage`          |

**Route guards:**

- `ProtectedRoute` — checks `isAuthenticated`; waits for `initDone` before redirecting to `/login`
- `RoleRoute` — checks `user.role === requiredRole`; redirects mismatched roles to `/`

---

## Authentication

**Mechanism:** Cookie-based JWT. The browser sends `accessToken` + `refreshToken` cookies automatically on every request (`withCredentials: true`).

**Init flow (on every page load):**

1. `App.jsx` dispatches `getMeThunk()` → `GET /auth/get-me`
2. If successful, sets `isAuthenticated: true` and stores the user object
3. Sets `initDone: true` — route guards wait for this before rendering or redirecting

**Token refresh:**  
The Axios response interceptor catches `401` responses, automatically calls `POST /auth/refresh-token`, then retries the original request. If the refresh also fails, it dispatches `resetAuth()` and hard-redirects to `/login`.

**Auth Redux state shape:**

```js
{
  user: { _id, firstName, lastName, email, role, phone, address, avatar, ... } | null,
  isAuthenticated: boolean,
  loading: boolean,
  error: string | null,
  initDone: boolean
}
```

**Sync actions used:**

- `resetAuth()` — clears auth state (called by 401 interceptor)
- `updateUser(payload)` — partial update to the user object (used after profile/avatar updates)

---

## API Layer

All requests go through a single Axios instance (`src/api/axiosInstance.js`) with:

- `baseURL = "http://localhost:6969/api/v1"`
- `withCredentials: true`
- Auto-refresh on 401 (see above)

### Auth — `src/api/authApi.js`

| Method | Endpoint              | Auth          |
| ------ | --------------------- | ------------- |
| POST   | `/auth/register`      | Public        |
| POST   | `/auth/login`         | Public        |
| POST   | `/auth/logout`        | Required      |
| GET    | `/auth/get-me`        | Required      |
| POST   | `/auth/refresh-token` | Cookie (auto) |

### Users — `src/api/usersApi.js`

| Method | Endpoint                    | Auth                             |
| ------ | --------------------------- | -------------------------------- |
| GET    | `/users/me`                 | Required                         |
| PATCH  | `/users/me`                 | Required                         |
| PATCH  | `/users/me/change-password` | Required                         |
| PATCH  | `/users/me/avatar`          | Required (`multipart/form-data`) |
| DELETE | `/users/me`                 | Required                         |

### Products — `src/api/productsApi.js`

| Method | Endpoint                       | Auth                           |
| ------ | ------------------------------ | ------------------------------ |
| GET    | `/products`                    | Public                         |
| GET    | `/products/:slugOrId`          | Public                         |
| GET    | `/products/seller/my-products` | Seller                         |
| POST   | `/products`                    | Seller (`multipart/form-data`) |
| PATCH  | `/products/:id`                | Seller (`multipart/form-data`) |
| DELETE | `/products/:id`                | Seller                         |

**Query params used on `GET /products`:** `category`, `size`, `minPrice`, `maxPrice`, `search`, `sort`, `page`, `limit`

### Orders — `src/api/ordersApi.js`

| Method | Endpoint                         | Auth   |
| ------ | -------------------------------- | ------ |
| POST   | `/orders`                        | Buyer  |
| GET    | `/orders/my`                     | Buyer  |
| GET    | `/orders/my/:orderId`            | Buyer  |
| PATCH  | `/orders/my/:orderId/cancel`     | Buyer  |
| GET    | `/orders/seller`                 | Seller |
| GET    | `/orders/seller/:orderId`        | Seller |
| PATCH  | `/orders/seller/:orderId/status` | Seller |

### Categories — `src/api/categoriesApi.js`

| Method | Endpoint                | Auth   |
| ------ | ----------------------- | ------ |
| GET    | `/categories`           | Public |
| GET    | `/categories/:slugOrId` | Public |

### Reviews — `src/api/reviewsApi.js`

| Method | Endpoint                      | Auth   |
| ------ | ----------------------------- | ------ |
| GET    | `/reviews/product/:productId` | Public |
| POST   | `/reviews/product/:productId` | Buyer  |
| PATCH  | `/reviews/:reviewId`          | Buyer  |
| DELETE | `/reviews/:reviewId`          | Buyer  |
| GET    | `/reviews/my`                 | Buyer  |

---

## State Management (Redux)

### `authSlice` — user identity

Described above. Fetched once on mount via `getMeThunk`.

### `categoriesSlice`

```js
{ items: Category[], loading: boolean, error: string | null }
```

Fetched once on mount (`App.jsx`) and again when `ProductFormPage` loads.

### `productsSlice`

```js
{
  // Public browse
  items: Product[], total, page, totalPages, loading, error,
  selectedProduct: Product | null, selectedProductLoading,

  // Seller view
  sellerProducts: Product[], sellerTotal, sellerPage, sellerTotalPages, sellerLoading
}
```

Thunks: `fetchProductsThunk`, `fetchProductThunk`, `fetchSellerProductsThunk`, `createProductThunk`, `updateProductThunk`, `deleteProductThunk`

### `ordersSlice`

```js
{
  buyerOrders: { items[], total, page, totalPages, loading },
  selectedOrder: Order | null,
  selectedOrderLoading, placeOrderLoading, error,
  sellerOrders: { items[], total, page, totalPages, loading }
}
```

Thunks: `placeOrderThunk`, `fetchMyOrdersThunk`, `fetchMyOrderThunk`, `cancelOrderThunk`, `fetchSellerOrdersThunk`, `fetchSellerOrderThunk`, `updateOrderStatusThunk`

### `uiSlice`

```js
{ toasts: [{ id, type, message, duration }], mobileMenuOpen: boolean }
```

Manages toast notifications and mobile nav state. No API calls.

---

## Expected API Response Shape

Every response the frontend reads follows:

```json
{ "statusCode": 200, "success": true, "message": "...", "data": <payload> }
```

For paginated lists, `data` is:

```json
{ "items": [], "total": 50, "page": 1, "limit": 20, "totalPages": 3 }
```

**Error responses** are read as `err.response?.data?.message` and shown in toast notifications.

---

## Form Submission Notes

- **File uploads** (product images, avatar) use `multipart/form-data` via `FormData`. No `Content-Type` header is set manually — the browser sets it with the correct boundary.
- **`sizeVariants`** is JSON-stringified and sent as a single form field: `fd.append("sizeVariants", JSON.stringify([...]))`
- **`tags`** is JSON-stringified array if non-empty: `fd.append("tags", JSON.stringify([...]))`
- **Product create/edit** sends `isActive` as the string `"true"` or `"false"` (not boolean)

---

## Client-Side Validation

Validation runs on submit before the API call, using pure functions in `src/utils/validators.js`. Rules mirror the backend Mongoose model constraints:

| Form            | Fields validated                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------- |
| Login           | email format, password required                                                                   |
| Register        | names (min 2/max 50), email format, password min 8                                                |
| Profile info    | names required, phone max 20                                                                      |
| Password change | both required, new password min 8                                                                 |
| Product form    | name (2–200), description (10–2000), brand (max 100), basePrice ≥ 0, category required, tags ≤ 10 |
| Size variants   | each row: size > 0, stock ≥ 0, price ≥ 0 if set                                                   |
| Review          | rating 1–5 required, comment max 1000                                                             |

Validation errors are shown as inline field messages. Server errors are shown as toast notifications.

---

## Key Behaviours to Be Aware Of

1. **Auth init blocks routing** — `ProtectedRoute` renders a spinner until `initDone: true`. If `GET /auth/get-me` is slow, users see a loading screen.
2. **Token refresh is transparent** — A 401 on any request triggers one automatic retry after `POST /auth/refresh-token`. A second 401 logs the user out.
3. **Categories are fetched globally** — `App.jsx` fetches them on mount so they are available everywhere (navbar, product form, filters).
4. **Seller product route collision** — `GET /products/seller/my-products` must be defined before `GET /products/:slugOrId` in the backend router, otherwise `:slugOrId` captures the literal string `"seller"`.
5. **Order placement requires a saved address** — The frontend checks `user.address.street` before showing the place-order button. Missing address sends the user to `/profile`.
6. **Image IDs** — Product `images[]` and `avatar` fields are MongoDB ObjectIds. The frontend constructs image URLs as `GET /api/v1/image/:imageId`.
7. **Pagination defaults** — Frontend requests default to `page=1, limit=20` for products and orders.
