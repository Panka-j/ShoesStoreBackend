import { saveImageToDb } from "./saveImageToDb.js";

export const saveMultipleImagesToDb = async (files) => {
  const ids = [];
  for (const file of files) {
    const id = await saveImageToDb(file.path, file.originalname, file.mimetype);
    ids.push(id);
  }
  return ids;
};
