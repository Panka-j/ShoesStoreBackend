import axios from "axios";

const BASE_URL =
  process.env.API_BASE_URL ||
  `http://localhost:${process.env.PORT || 8000}/api/v1`;

const apiClient = (token) =>
  axios.create({
    baseURL: BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    timeout: 8000,
  });

export const executeTool = async (toolName, args, token) => {
  const api = apiClient(token);

  try {
    switch (toolName) {
      case "get_my_orders": {
        const params = {};
        if (args.status) params.status = args.status;
        const { data } = await api.get("/orders/my", { params });
        return { success: true, data: data.data };
      }

      case "get_order_detail": {
        if (!args.order_id)
          return {
            success: false,
            error: "I need an order ID. Could you share it?",
          };
        const { data } = await api.get(`/orders/my/${args.order_id}`);
        return { success: true, data: data.data };
      }

      case "cancel_order": {
        if (!args.order_id)
          return { success: false, error: "I need the order ID to cancel it." };
        const body = {};
        if (args.cancel_reason) body.cancelReason = args.cancel_reason;
        const { data } = await api.patch(
          `/orders/my/${args.order_id}/cancel`,
          body
        );
        return { success: true, data: data.data };
      }

      case "search_products": {
        const params = { limit: 5 };
        if (args.search) params.search = args.search;
        if (args.category) params.category = args.category;
        if (args.minPrice && args.minPrice > 0) params.minPrice = args.minPrice;
        if (args.maxPrice && args.maxPrice > 0) params.maxPrice = args.maxPrice;
        if (args.size && args.size > 0) params.size = args.size;
        if (args.sort) params.sort = args.sort;
        const { data } = await api.get("/products", { params });
        return { success: true, data: data.data };
      }

      case "get_product": {
        if (!args.slug_or_id)
          return { success: false, error: "I need a product name or ID." };
        const { data } = await api.get(`/products/${args.slug_or_id}`);
        return { success: true, data: data.data };
      }

      case "get_product_reviews": {
        if (!args.product_id)
          return {
            success: false,
            error: "I need a product ID to fetch reviews.",
          };
        const { data } = await api.get(`/reviews/product/${args.product_id}`, {
          params: { limit: 5 },
        });
        return { success: true, data: data.data };
      }

      case "submit_review": {
        if (!args.product_id)
          return {
            success: false,
            error: "I need a product ID to submit a review.",
          };
        if (!args.rating || args.rating < 1 || args.rating > 5)
          return {
            success: false,
            error: "Rating must be a whole number between 1 and 5.",
          };
        const body = { rating: Math.round(args.rating) };
        if (args.comment) body.comment = args.comment;
        const { data } = await api.post(
          `/reviews/product/${args.product_id}`,
          body
        );
        return { success: true, data: data.data };
      }

      case "get_my_reviews": {
        const { data } = await api.get("/reviews/my");
        return { success: true, data: data.data };
      }

      case "get_categories": {
        const { data } = await api.get("/categories");
        return { success: true, data: data.data };
      }

      case "get_my_profile": {
        const { data } = await api.get("/users/me");
        return { success: true, data: data.data };
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    const status = error.response?.status;
    if (status === 401) return { success: false, error: "SESSION_EXPIRED" };
    if (status === 403) return { success: false, error: "FORBIDDEN" };
    if (status === 404) return { success: false, error: "NOT_FOUND" };
    if (status === 409) return { success: false, error: "CONFLICT" };
    return { success: false, error: error.message || "API_ERROR" };
  }
};
