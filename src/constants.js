export const DB_NAME = "CrossCanals";

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
};

export const articleSequenceBannerSingletonId = "CrossCanalsArticleIdString";

export const companyGmail = "crosscanals@gmail.com";
