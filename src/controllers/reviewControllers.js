import ServerResponse from "../common/utils/ServerResponse.js";
import wrapAsync from "../common/utils/wrapAsync.js";
import * as reviewService from "../services/review.service.js";

export const getMyReviews = wrapAsync(async (req, res) => {
  const { page, limit } = req.query;
  const data = await reviewService.getMyReviews(req.user._id, { page, limit });
  res.status(200).json(new ServerResponse(200, data, "Reviews fetched."));
});

export const getProductReviews = wrapAsync(async (req, res) => {
  const { page, limit } = req.query;
  const data = await reviewService.getProductReviews(req.params.productId, {
    page,
    limit,
  });
  res.status(200).json(new ServerResponse(200, data, "Reviews fetched."));
});

export const createReview = wrapAsync(async (req, res) => {
  const review = await reviewService.createReview(
    req.user._id,
    req.params.productId,
    req.body
  );
  res.status(201).json(new ServerResponse(201, review, "Review submitted."));
});

export const updateReview = wrapAsync(async (req, res) => {
  const review = await reviewService.updateReview(
    req.user._id,
    req.params.reviewId,
    req.body
  );
  res.status(200).json(new ServerResponse(200, review, "Review updated."));
});

export const deleteReview = wrapAsync(async (req, res) => {
  await reviewService.deleteReview(req.user, req.params.reviewId);
  res.status(200).json(new ServerResponse(200, null, "Review deleted."));
});
