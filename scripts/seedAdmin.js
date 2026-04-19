/**
 * Run once to create the first admin user:
 *   node scripts/seedAdmin.js
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

dotenv.config({ path: "./.env" });

const ADMIN = {
  firstName: "Super",
  lastName: "Admin",
  email: process.env.SEED_ADMIN_EMAIL || "admin@shoes.com",
  password: process.env.SEED_ADMIN_PASSWORD || "Admin1234",
};

await mongoose.connect(`${process.env.MONGODB_URL}/CrossCanals`);

const userSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    email: { type: String, unique: true, lowercase: true },
    password: String,
    role: { type: String, default: "buyer" },
    isUserVerified: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
  },
  { strict: false }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

const existing = await User.findOne({ email: ADMIN.email });
if (existing) {
  await User.updateOne({ email: ADMIN.email }, { role: "admin" });
  console.log(`✓ Updated existing user ${ADMIN.email} to role=admin`);
} else {
  const hash = await bcrypt.hash(ADMIN.password, 10);
  await User.create({ ...ADMIN, password: hash, role: "admin" });
  console.log(`✓ Created admin user: ${ADMIN.email}`);
}

await mongoose.disconnect();
console.log("Done.");
