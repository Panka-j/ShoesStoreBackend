export const slugify = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // spaces & non-alnum -> -
    .replace(/^-+|-+$/g, ""); // trim leading/trailing -
};
