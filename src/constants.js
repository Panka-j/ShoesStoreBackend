export const DB_NAME = "ShoesStore";

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
};

export const articleSequenceBannerSingletonId = "ShoesStoreArticleIdString";

export const companyGmail = "jcodestudy@gmail.com";
