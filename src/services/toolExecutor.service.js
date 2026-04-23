import ServerError from "../common/errors/ServerError.js";
import { listMyOrders, getMyOrder, cancelOrder } from "./order.service.js";
import { listProducts, getProduct } from "./product.service.js";
import {
  getProductReviews,
  createReview,
  getMyReviews,
} from "./review.service.js";
import { listCategories } from "./category.service.js";

const requireUser = (user) => {
  if (!user) throw new ServerError(401, "Not authenticated.");
};

const requireBuyer = (user) => {
  requireUser(user);
  if (user.role !== "buyer")
    throw new ServerError(403, "Buyer account required.");
};

export const executeTool = async (toolName, args, user) => {
  try {
    switch (toolName) {
      case "get_my_orders": {
        requireBuyer(user);
        const data = await listMyOrders(user._id, { status: args.status });
        return { success: true, data };
      }

      case "get_order_detail": {
        requireBuyer(user);
        if (!args.order_id)
          return {
            success: false,
            error: "I need an order ID. Could you share it?",
          };
        const data = await getMyOrder(user._id, args.order_id);
        return { success: true, data };
      }

      case "cancel_order": {
        requireBuyer(user);
        if (!args.order_id)
          return { success: false, error: "I need the order ID to cancel it." };
        const data = await cancelOrder(
          user._id,
          args.order_id,
          args.cancel_reason
        );
        return { success: true, data };
      }

      case "search_products": {
        const data = await listProducts({
          search: args.search,
          category: args.category,
          minPrice: args.minPrice > 0 ? args.minPrice : undefined,
          maxPrice: args.maxPrice > 0 ? args.maxPrice : undefined,
          size: args.size > 0 ? args.size : undefined,
          sort: args.sort,
          limit: 5,
        });
        return { success: true, data };
      }

      case "get_product": {
        if (!args.slug_or_id)
          return { success: false, error: "I need a product name or ID." };
        const data = await getProduct(args.slug_or_id);
        return { success: true, data };
      }

      case "get_product_reviews": {
        if (!args.product_id)
          return {
            success: false,
            error: "I need a product ID to fetch reviews.",
          };
        const data = await getProductReviews(args.product_id, { limit: 5 });
        return { success: true, data };
      }

      case "submit_review": {
        requireBuyer(user);
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
        const data = await createReview(user._id, args.product_id, {
          rating: Math.round(args.rating),
          comment: args.comment,
        });
        return { success: true, data };
      }

      case "get_my_reviews": {
        requireBuyer(user);
        const data = await getMyReviews(user._id);
        return { success: true, data };
      }

      case "get_categories": {
        const data = await listCategories();
        return { success: true, data };
      }

      case "get_my_profile": {
        requireUser(user);
        return { success: true, data: user };
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    if (error instanceof ServerError) {
      if (error.statusCode === 401)
        return { success: false, error: "SESSION_EXPIRED" };
      if (error.statusCode === 403)
        return { success: false, error: "FORBIDDEN" };
      if (error.statusCode === 404)
        return { success: false, error: "NOT_FOUND" };
      if (error.statusCode === 409)
        return { success: false, error: "CONFLICT" };
      return { success: false, error: error.message };
    }
    console.error(`[ToolExecutor] ${toolName} unexpected error:`, error);
    return { success: false, error: error.message || "TOOL_ERROR" };
  }
};
