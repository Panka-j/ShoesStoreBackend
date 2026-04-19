/**
 * Seed all models with sample data.
 * Run from project root: node scripts/seedData.js
 *
 * Insertion order respects ObjectId references:
 *   Image → User → Category → Product → Order → Review
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

import User from "../src/models/userModel.js";
import Category from "../src/models/categoryModel.js";
import Product from "../src/models/productModel.js";
import Order from "../src/models/orderModel.js";
import Review from "../src/models/reviewModel.js";
import Image from "../src/models/imageModel.js";

dotenv.config({ path: "./.env" });

await mongoose.connect(`${process.env.MONGODB_URL}/CrossCanals`);
console.log("✓ Connected to MongoDB");

// ─── 1. IMAGES ───────────────────────────────────────────────────────────────

const imageDefs = [
  { fileName: "avatar-admin.jpg", mimeType: "image/jpeg" },
  { fileName: "avatar-seller1.jpg", mimeType: "image/jpeg" },
  { fileName: "avatar-seller2.jpg", mimeType: "image/jpeg" },
  { fileName: "avatar-seller3.jpg", mimeType: "image/jpeg" },
  { fileName: "avatar-buyer1.jpg", mimeType: "image/jpeg" },
  { fileName: "avatar-buyer2.jpg", mimeType: "image/jpeg" },
];

const syntheticBuffer = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
]);

const images = [];
for (const def of imageDefs) {
  let img = await Image.findOne({ fileName: def.fileName });
  if (!img) {
    img = await Image.create({ ...def, data: syntheticBuffer });
    console.log(`  ✓ Image created: ${def.fileName}`);
  } else {
    console.log(`  · Image already exists: ${def.fileName}`);
  }
  images.push(img);
}
console.log(`✓ Images: ${images.length}`);

// ─── 2. USERS ─────────────────────────────────────────────────────────────────

const PASSWORD_PLAIN = "Password123";
const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, 10);

const userDefs = [
  {
    firstName: "Super",
    lastName: "Admin",
    email: "admin@shoes.com",
    role: "admin",
    phone: "9000000000",
    address: {
      street: "1 Admin Lane",
      city: "Mumbai",
      state: "Maharashtra",
      zipCode: "400001",
      country: "India",
    },
    avatar: images[0]._id,
  },
  {
    firstName: "Arjun",
    lastName: "Mehta",
    email: "seller1@shoes.com",
    role: "seller",
    phone: "9111111111",
    address: {
      street: "22 Linking Road",
      city: "Mumbai",
      state: "Maharashtra",
      zipCode: "400050",
      country: "India",
    },
    avatar: images[1]._id,
  },
  {
    firstName: "Priya",
    lastName: "Sharma",
    email: "seller2@shoes.com",
    role: "seller",
    phone: "9222222222",
    address: {
      street: "14 MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      zipCode: "560001",
      country: "India",
    },
    avatar: images[2]._id,
  },
  {
    firstName: "Rohan",
    lastName: "Verma",
    email: "seller3@shoes.com",
    role: "seller",
    phone: "9333333333",
    address: {
      street: "5 Connaught Place",
      city: "New Delhi",
      state: "Delhi",
      zipCode: "110001",
      country: "India",
    },
    avatar: images[3]._id,
  },
  {
    firstName: "Neha",
    lastName: "Kapoor",
    email: "buyer1@shoes.com",
    role: "buyer",
    phone: "9444444444",
    address: {
      street: "88 Jubilee Hills",
      city: "Hyderabad",
      state: "Telangana",
      zipCode: "500033",
      country: "India",
    },
    avatar: images[4]._id,
  },
  {
    firstName: "Karan",
    lastName: "Singh",
    email: "buyer2@shoes.com",
    role: "buyer",
    phone: "9555555555",
    address: {
      street: "12 Anna Salai",
      city: "Chennai",
      state: "Tamil Nadu",
      zipCode: "600002",
      country: "India",
    },
    avatar: images[5]._id,
  },
  {
    firstName: "Anjali",
    lastName: "Patel",
    email: "buyer3@shoes.com",
    role: "buyer",
    phone: "9666666666",
    address: {
      street: "3 Park Street",
      city: "Kolkata",
      state: "West Bengal",
      zipCode: "700016",
      country: "India",
    },
  },
  {
    firstName: "Vikram",
    lastName: "Nair",
    email: "buyer4@shoes.com",
    role: "buyer",
    phone: "9777777777",
    address: {
      street: "45 FC Road",
      city: "Pune",
      state: "Maharashtra",
      zipCode: "411005",
      country: "India",
    },
  },
  {
    firstName: "Sneha",
    lastName: "Reddy",
    email: "buyer5@shoes.com",
    role: "buyer",
    phone: "9888888888",
    address: {
      street: "7 Civil Lines",
      city: "Jaipur",
      state: "Rajasthan",
      zipCode: "302006",
      country: "India",
    },
  },
];

const users = {};
for (const def of userDefs) {
  let user = await User.findOne({ email: def.email });
  if (!user) {
    user = await User.create({ ...def, password: passwordHash });
    console.log(`  ✓ User created: ${def.email} (${def.role})`);
  } else {
    console.log(`  · User already exists: ${def.email}`);
  }
  users[def.email] = user;
}
console.log(`✓ Users: ${Object.keys(users).length}`);

const seller1 = users["seller1@shoes.com"];
const seller2 = users["seller2@shoes.com"];
const seller3 = users["seller3@shoes.com"];
const buyer1 = users["buyer1@shoes.com"];
const buyer2 = users["buyer2@shoes.com"];
const buyer3 = users["buyer3@shoes.com"];
const buyer4 = users["buyer4@shoes.com"];
const buyer5 = users["buyer5@shoes.com"];

// ─── 3. CATEGORIES ────────────────────────────────────────────────────────────

const categoryDefs = [
  {
    name: "Running",
    description: "High-performance running shoes for road and trail.",
  },
  {
    name: "Casual",
    description: "Everyday comfortable shoes for casual and lifestyle wear.",
  },
  {
    name: "Formal",
    description: "Elegant shoes for professional and formal occasions.",
  },
  {
    name: "Sports",
    description: "Versatile sports shoes for gym and outdoor activities.",
  },
  {
    name: "Sandals",
    description: "Open-toe footwear for warm weather and beach outings.",
  },
  {
    name: "Boots",
    description: "Sturdy boots for trekking, work, and winter conditions.",
  },
];

const categories = {};
for (const def of categoryDefs) {
  let cat = await Category.findOne({ name: def.name });
  if (!cat) {
    cat = await Category.create(def);
    console.log(`  ✓ Category created: ${def.name} (slug: ${cat.slug})`);
  } else {
    console.log(`  · Category already exists: ${def.name}`);
  }
  categories[def.name] = cat;
}
console.log(`✓ Categories: ${Object.keys(categories).length}`);

// ─── 4. PRODUCTS ──────────────────────────────────────────────────────────────
// All prices in INR

const productDefs = [
  // ── seller1 (Arjun Mehta) ──
  {
    name: "AeroStride Pro",
    description:
      "Lightweight running shoe with superior cushioning and breathable mesh upper ideal for long-distance road running.",
    brand: "AeroStride",
    category: categories["Running"]._id,
    seller: seller1._id,
    basePrice: 5499,
    sizeVariants: [
      { size: 6, stock: 8, price: 5299 },
      { size: 7, stock: 12, price: 5299 },
      { size: 8, stock: 18, price: 5499 },
      { size: 9, stock: 15, price: 5499 },
      { size: 10, stock: 10, price: 5699 },
      { size: 11, stock: 6, price: 5699 },
    ],
    tags: ["running", "lightweight", "road"],
  },
  {
    name: "CloudWalk Trainer",
    description:
      "Premium training shoe engineered for speed workouts with a responsive foam midsole and snug lace-up fit.",
    brand: "CloudWalk",
    category: categories["Running"]._id,
    seller: seller1._id,
    basePrice: 7299,
    sizeVariants: [
      { size: 6, stock: 5, price: 6999 },
      { size: 7, stock: 10, price: 7099 },
      { size: 8, stock: 14, price: 7299 },
      { size: 9, stock: 12, price: 7299 },
      { size: 10, stock: 8, price: 7499 },
      { size: 11, stock: 4, price: 7499 },
    ],
    tags: ["training", "responsive", "speed"],
  },
  {
    name: "UrbanStep Classic",
    description:
      "Timeless canvas sneaker with a vulcanised rubber sole and padded collar for relaxed everyday use.",
    brand: "UrbanStep",
    category: categories["Casual"]._id,
    seller: seller1._id,
    basePrice: 2199,
    sizeVariants: [
      { size: 6, stock: 20, price: 1999 },
      { size: 7, stock: 25, price: 2199 },
      { size: 8, stock: 30, price: 2199 },
      { size: 9, stock: 22, price: 2199 },
      { size: 10, stock: 15, price: 2399 },
      { size: 11, stock: 10, price: 2399 },
    ],
    tags: ["casual", "canvas", "everyday"],
  },
  {
    name: "HikeMaster Trail",
    description:
      "Rugged trekking boot with waterproof suede upper, Vibram outsole, and ankle support for mountain trails.",
    brand: "HikeMaster",
    category: categories["Boots"]._id,
    seller: seller1._id,
    basePrice: 9999,
    sizeVariants: [
      { size: 6, stock: 4, price: 9799 },
      { size: 7, stock: 8, price: 9799 },
      { size: 8, stock: 12, price: 9999 },
      { size: 9, stock: 10, price: 9999 },
      { size: 10, stock: 7, price: 10299 },
      { size: 11, stock: 4, price: 10299 },
    ],
    tags: ["boots", "trekking", "waterproof", "vibram"],
  },

  // ── seller2 (Priya Sharma) ──
  {
    name: "Executive Oxford",
    description:
      "Handcrafted Derby oxford with full-grain leather upper, leather lining, and blake-stitched leather sole.",
    brand: "LexCraft",
    category: categories["Formal"]._id,
    seller: seller2._id,
    basePrice: 11999,
    sizeVariants: [
      { size: 6, stock: 5, price: 11499 },
      { size: 7, stock: 8, price: 11499 },
      { size: 8, stock: 10, price: 11999 },
      { size: 9, stock: 10, price: 11999 },
      { size: 10, stock: 6, price: 12499 },
      { size: 11, stock: 3, price: 12499 },
    ],
    tags: ["formal", "oxford", "leather", "office"],
  },
  {
    name: "SlimMonk Brogue",
    description:
      "Slim-profile monk-strap brogue in tan calfskin with perforated detailing and memory-foam insole.",
    brand: "LexCraft",
    category: categories["Formal"]._id,
    seller: seller2._id,
    basePrice: 9499,
    sizeVariants: [
      { size: 6, stock: 4, price: 9199 },
      { size: 7, stock: 7, price: 9199 },
      { size: 8, stock: 9, price: 9499 },
      { size: 9, stock: 9, price: 9499 },
      { size: 10, stock: 5, price: 9799 },
      { size: 11, stock: 2, price: 9799 },
    ],
    tags: ["formal", "monk-strap", "brogue", "calfskin"],
  },
  {
    name: "PowerFlex Court",
    description:
      "High-traction court sports shoe with lateral ankle support and herringbone rubber outsole for all court surfaces.",
    brand: "PowerFlex",
    category: categories["Sports"]._id,
    seller: seller2._id,
    basePrice: 5999,
    sizeVariants: [
      { size: 6, stock: 10, price: 5799 },
      { size: 7, stock: 15, price: 5799 },
      { size: 8, stock: 20, price: 5999 },
      { size: 9, stock: 18, price: 5999 },
      { size: 10, stock: 12, price: 6199 },
      { size: 11, stock: 7, price: 6199 },
    ],
    tags: ["sports", "court", "basketball", "traction"],
  },
  {
    name: "BeachWalk Sandal",
    description:
      "Water-resistant EVA sandal with adjustable double-strap system and contoured footbed for all-day beach comfort.",
    brand: "TideStep",
    category: categories["Sandals"]._id,
    seller: seller2._id,
    basePrice: 1299,
    sizeVariants: [
      { size: 6, stock: 25, price: 1199 },
      { size: 7, stock: 30, price: 1199 },
      { size: 8, stock: 35, price: 1299 },
      { size: 9, stock: 30, price: 1299 },
      { size: 10, stock: 20, price: 1399 },
      { size: 11, stock: 12, price: 1399 },
    ],
    tags: ["sandals", "beach", "EVA", "water-resistant"],
  },

  {
    name: "NightRun Reflex",
    description:
      "Reflective night-running shoe with 360° reflectivity strips, glow-in-dark heel tab, and energy-return foam.",
    brand: "AeroStride",
    category: categories["Running"]._id,
    seller: seller1._id,
    basePrice: 6799,
    sizeVariants: [
      { size: 6, stock: 6, price: 6599 },
      { size: 7, stock: 10, price: 6599 },
      { size: 8, stock: 14, price: 6799 },
      { size: 9, stock: 12, price: 6799 },
      { size: 10, stock: 8, price: 6999 },
      { size: 11, stock: 4, price: 6999 },
    ],
    tags: ["running", "night", "reflective", "safety"],
  },
  {
    name: "StreetKick Low",
    description:
      "Low-top lifestyle sneaker with suede toe cap, contrast stitching, and cupsole construction for street style.",
    brand: "UrbanStep",
    category: categories["Casual"]._id,
    seller: seller1._id,
    basePrice: 3499,
    sizeVariants: [
      { size: 6, stock: 18, price: 3299 },
      { size: 7, stock: 22, price: 3299 },
      { size: 8, stock: 28, price: 3499 },
      { size: 9, stock: 24, price: 3499 },
      { size: 10, stock: 16, price: 3699 },
      { size: 11, stock: 8, price: 3699 },
    ],
    tags: ["casual", "sneaker", "street", "suede"],
  },
  {
    name: "DirtKing MTB",
    description:
      "Mountain bike flat pedal shoe with stiff nylon shank, micro-lug rubber outsole, and reinforced toe box.",
    brand: "HikeMaster",
    category: categories["Sports"]._id,
    seller: seller1._id,
    basePrice: 8499,
    sizeVariants: [
      { size: 6, stock: 4, price: 8199 },
      { size: 7, stock: 7, price: 8199 },
      { size: 8, stock: 10, price: 8499 },
      { size: 9, stock: 9, price: 8499 },
      { size: 10, stock: 6, price: 8799 },
      { size: 11, stock: 3, price: 8799 },
    ],
    tags: ["sports", "cycling", "MTB", "flat-pedal"],
  },
  {
    name: "CamoField Boot",
    description:
      "Camouflage-print ankle boot with oil-resistant rubber outsole and steel-shank midsole for outdoor work.",
    brand: "HikeMaster",
    category: categories["Boots"]._id,
    seller: seller1._id,
    basePrice: 11499,
    sizeVariants: [
      { size: 6, stock: 3, price: 11199 },
      { size: 7, stock: 6, price: 11199 },
      { size: 8, stock: 9, price: 11499 },
      { size: 9, stock: 8, price: 11499 },
      { size: 10, stock: 5, price: 11799 },
      { size: 11, stock: 2, price: 11799 },
    ],
    tags: ["boots", "outdoor", "camo", "oil-resistant"],
  },

  // ── seller2 (Priya Sharma) ──
  {
    name: "VelvetLoafer Classic",
    description:
      "Penny loafer in burnished calfskin with leather-lined interior and hand-sewn moccasin toe for smart-casual wear.",
    brand: "LexCraft",
    category: categories["Formal"]._id,
    seller: seller2._id,
    basePrice: 8299,
    sizeVariants: [
      { size: 6, stock: 6, price: 7999 },
      { size: 7, stock: 9, price: 7999 },
      { size: 8, stock: 12, price: 8299 },
      { size: 9, stock: 10, price: 8299 },
      { size: 10, stock: 6, price: 8599 },
      { size: 11, stock: 3, price: 8599 },
    ],
    tags: ["formal", "loafer", "calfskin", "smart-casual"],
  },
  {
    name: "SprintX Elite",
    description:
      "Carbon-fibre-plated sprint racing flat with sock-like Flyknit upper and aggressive forefoot rocker geometry.",
    brand: "CloudWalk",
    category: categories["Running"]._id,
    seller: seller2._id,
    basePrice: 14999,
    sizeVariants: [
      { size: 6, stock: 3, price: 14499 },
      { size: 7, stock: 5, price: 14499 },
      { size: 8, stock: 8, price: 14999 },
      { size: 9, stock: 7, price: 14999 },
      { size: 10, stock: 4, price: 15499 },
      { size: 11, stock: 2, price: 15499 },
    ],
    tags: ["running", "racing", "carbon-plate", "elite"],
  },
  {
    name: "AquaSlide Sandal",
    description:
      "Quick-dry river sandal with drainage ports, adjustable webbing straps, and sticky rubber outsole for wet rocks.",
    brand: "TideStep",
    category: categories["Sandals"]._id,
    seller: seller2._id,
    basePrice: 1899,
    sizeVariants: [
      { size: 6, stock: 20, price: 1799 },
      { size: 7, stock: 25, price: 1799 },
      { size: 8, stock: 30, price: 1899 },
      { size: 9, stock: 25, price: 1899 },
      { size: 10, stock: 18, price: 1999 },
      { size: 11, stock: 10, price: 1999 },
    ],
    tags: ["sandals", "water", "river", "quick-dry"],
  },
  {
    name: "FutsalBlast Indoor",
    description:
      "Non-marking gum-rubber indoor football shoe with close-fitting last, herringbone sole, and padded ankle collar.",
    brand: "PowerFlex",
    category: categories["Sports"]._id,
    seller: seller2._id,
    basePrice: 3999,
    sizeVariants: [
      { size: 6, stock: 12, price: 3799 },
      { size: 7, stock: 16, price: 3799 },
      { size: 8, stock: 20, price: 3999 },
      { size: 9, stock: 18, price: 3999 },
      { size: 10, stock: 12, price: 4199 },
      { size: 11, stock: 6, price: 4199 },
    ],
    tags: ["sports", "futsal", "indoor", "football"],
  },

  // ── seller3 (Rohan Verma) ──
  {
    name: "SlipOn Breeze",
    description:
      "Zero-effort slip-on sneaker with elastic gore panels, memory-foam insole, and breathable knit upper.",
    brand: "UrbanStep",
    category: categories["Casual"]._id,
    seller: seller3._id,
    basePrice: 3299,
    sizeVariants: [
      { size: 6, stock: 22, price: 3099 },
      { size: 7, stock: 28, price: 3099 },
      { size: 8, stock: 35, price: 3299 },
      { size: 9, stock: 30, price: 3299 },
      { size: 10, stock: 20, price: 3499 },
      { size: 11, stock: 10, price: 3499 },
    ],
    tags: ["casual", "slip-on", "memory-foam", "knit"],
  },
  {
    name: "GymPulse Flex",
    description:
      "Cross-training gym shoe with multi-directional flex grooves, wide toe box, and anti-slip gum outsole.",
    brand: "PowerFlex",
    category: categories["Sports"]._id,
    seller: seller3._id,
    basePrice: 4799,
    sizeVariants: [
      { size: 6, stock: 12, price: 4599 },
      { size: 7, stock: 16, price: 4599 },
      { size: 8, stock: 20, price: 4799 },
      { size: 9, stock: 18, price: 4799 },
      { size: 10, stock: 12, price: 4999 },
      { size: 11, stock: 6, price: 4999 },
    ],
    tags: ["gym", "cross-training", "sports", "flex"],
  },
  {
    name: "WinterEdge Boot",
    description:
      "Insulated Chelsea boot with faux-shearling lining, side zip, and lug sole for cold-weather urban commutes.",
    brand: "HikeMaster",
    category: categories["Boots"]._id,
    seller: seller3._id,
    basePrice: 7799,
    sizeVariants: [
      { size: 6, stock: 6, price: 7499 },
      { size: 7, stock: 9, price: 7499 },
      { size: 8, stock: 12, price: 7799 },
      { size: 9, stock: 10, price: 7799 },
      { size: 10, stock: 7, price: 7999 },
      { size: 11, stock: 3, price: 7999 },
    ],
    tags: ["boots", "winter", "insulated", "chelsea"],
  },
  {
    name: "SunTrek Sandal",
    description:
      "Arch-support sport sandal with Velcro straps, cork-latex footbed, and grippy rubber outsole for active outings.",
    brand: "TideStep",
    category: categories["Sandals"]._id,
    seller: seller3._id,
    basePrice: 2499,
    sizeVariants: [
      { size: 6, stock: 18, price: 2299 },
      { size: 7, stock: 22, price: 2299 },
      { size: 8, stock: 28, price: 2499 },
      { size: 9, stock: 24, price: 2499 },
      { size: 10, stock: 16, price: 2699 },
      { size: 11, stock: 8, price: 2699 },
    ],
    tags: ["sandals", "arch-support", "cork", "outdoor"],
  },
  {
    name: "RetroRunner 90s",
    description:
      "Chunky retro running silhouette with two-tone mesh panels, oversized midsole, and vintage branding for streetwear.",
    brand: "AeroStride",
    category: categories["Casual"]._id,
    seller: seller3._id,
    basePrice: 4299,
    sizeVariants: [
      { size: 6, stock: 14, price: 3999 },
      { size: 7, stock: 18, price: 3999 },
      { size: 8, stock: 24, price: 4299 },
      { size: 9, stock: 20, price: 4299 },
      { size: 10, stock: 14, price: 4499 },
      { size: 11, stock: 7, price: 4499 },
    ],
    tags: ["casual", "retro", "chunky", "streetwear"],
  },
  {
    name: "CricketStud Pro",
    description:
      "Full-grain leather cricket shoe with reinforced toe guard, spike-ready outsole, and lateral heel stabiliser.",
    brand: "PowerFlex",
    category: categories["Sports"]._id,
    seller: seller3._id,
    basePrice: 6499,
    sizeVariants: [
      { size: 6, stock: 8, price: 6299 },
      { size: 7, stock: 12, price: 6299 },
      { size: 8, stock: 16, price: 6499 },
      { size: 9, stock: 14, price: 6499 },
      { size: 10, stock: 9, price: 6699 },
      { size: 11, stock: 5, price: 6699 },
    ],
    tags: ["sports", "cricket", "spikes", "leather"],
  },
  {
    name: "DesertDune Boot",
    description:
      "Chukka-height desert boot in oiled nubuck with crepe rubber sole and brass eyelet lacing for relaxed style.",
    brand: "HikeMaster",
    category: categories["Boots"]._id,
    seller: seller3._id,
    basePrice: 5799,
    sizeVariants: [
      { size: 6, stock: 7, price: 5599 },
      { size: 7, stock: 10, price: 5599 },
      { size: 8, stock: 14, price: 5799 },
      { size: 9, stock: 12, price: 5799 },
      { size: 10, stock: 8, price: 5999 },
      { size: 11, stock: 4, price: 5999 },
    ],
    tags: ["boots", "chukka", "nubuck", "crepe-sole"],
  },
  {
    name: "FlipComfort Daily",
    description:
      "Ergonomic daily-use flip-flop with anatomical arch support, anti-bacterial top-cover, and non-slip outsole.",
    brand: "TideStep",
    category: categories["Sandals"]._id,
    seller: seller3._id,
    basePrice: 799,
    sizeVariants: [
      { size: 6, stock: 40, price: 749 },
      { size: 7, stock: 50, price: 749 },
      { size: 8, stock: 55, price: 799 },
      { size: 9, stock: 48, price: 799 },
      { size: 10, stock: 35, price: 849 },
      { size: 11, stock: 20, price: 849 },
    ],
    tags: ["sandals", "flip-flop", "daily", "arch-support"],
  },
];

const products = [];
for (const def of productDefs) {
  let prod = await Product.findOne({ name: def.name });
  if (!prod) {
    prod = await Product.create(def);
    console.log(`  ✓ Product created: "${def.name}" ₹${def.basePrice}`);
  } else {
    console.log(`  · Product already exists: "${def.name}"`);
  }
  products.push(prod);
}

const [
  aeroStride,
  cloudWalk,
  urbanStep,
  hikeMaster, // seller1 originals
  execOxford,
  slimMonk,
  powerFlex,
  beachWalk, // seller2 originals
  nightRun,
  streetKick,
  dirtKing,
  camoField, // seller1 new
  velvetLoafer,
  sprintX,
  aquaSlide,
  futsalBlast, // seller2 new
  slipOn,
  gymPulse,
  winterBoot,
  sunTrek, // seller3 originals
  retroRunner,
  cricketStud,
  desertBoot,
  flipComfort, // seller3 new
] = products;

console.log(`✓ Products: ${products.length}`);

// ─── 5. ORDERS ────────────────────────────────────────────────────────────────

const addr = {
  neha: {
    street: "88 Jubilee Hills",
    city: "Hyderabad",
    state: "Telangana",
    zipCode: "500033",
    country: "India",
  },
  karan: {
    street: "12 Anna Salai",
    city: "Chennai",
    state: "Tamil Nadu",
    zipCode: "600002",
    country: "India",
  },
  anjali: {
    street: "3 Park Street",
    city: "Kolkata",
    state: "West Bengal",
    zipCode: "700016",
    country: "India",
  },
  vikram: {
    street: "45 FC Road",
    city: "Pune",
    state: "Maharashtra",
    zipCode: "411005",
    country: "India",
  },
  sneha: {
    street: "7 Civil Lines",
    city: "Jaipur",
    state: "Rajasthan",
    zipCode: "302006",
    country: "India",
  },
};

const orderDefs = [
  // buyer1 (Neha)
  {
    buyer: buyer1._id,
    seller: aeroStride.seller,
    product: aeroStride._id,
    size: 7,
    quantity: 1,
    unitPrice: 5299,
    totalPrice: 5299,
    shippingAddress: addr.neha,
    status: "delivered",
  },
  {
    buyer: buyer1._id,
    seller: execOxford.seller,
    product: execOxford._id,
    size: 8,
    quantity: 1,
    unitPrice: 11999,
    totalPrice: 11999,
    shippingAddress: addr.neha,
    status: "confirmed",
  },
  {
    buyer: buyer1._id,
    seller: beachWalk.seller,
    product: beachWalk._id,
    size: 7,
    quantity: 2,
    unitPrice: 1199,
    totalPrice: 2398,
    shippingAddress: addr.neha,
    status: "delivered",
  },

  // buyer2 (Karan)
  {
    buyer: buyer2._id,
    seller: cloudWalk.seller,
    product: cloudWalk._id,
    size: 9,
    quantity: 1,
    unitPrice: 7299,
    totalPrice: 7299,
    shippingAddress: addr.karan,
    status: "shipped",
  },
  {
    buyer: buyer2._id,
    seller: powerFlex.seller,
    product: powerFlex._id,
    size: 8,
    quantity: 1,
    unitPrice: 5999,
    totalPrice: 5999,
    shippingAddress: addr.karan,
    status: "delivered",
  },
  {
    buyer: buyer2._id,
    seller: slimMonk.seller,
    product: slimMonk._id,
    size: 9,
    quantity: 1,
    unitPrice: 9499,
    totalPrice: 9499,
    shippingAddress: addr.karan,
    status: "processing",
  },

  // buyer3 (Anjali)
  {
    buyer: buyer3._id,
    seller: urbanStep.seller,
    product: urbanStep._id,
    size: 6,
    quantity: 2,
    unitPrice: 1999,
    totalPrice: 3998,
    shippingAddress: addr.anjali,
    status: "pending",
  },
  {
    buyer: buyer3._id,
    seller: slipOn.seller,
    product: slipOn._id,
    size: 7,
    quantity: 1,
    unitPrice: 3099,
    totalPrice: 3099,
    shippingAddress: addr.anjali,
    status: "delivered",
  },
  {
    buyer: buyer3._id,
    seller: sunTrek.seller,
    product: sunTrek._id,
    size: 6,
    quantity: 1,
    unitPrice: 2299,
    totalPrice: 2299,
    shippingAddress: addr.anjali,
    status: "out_for_delivery",
  },

  // buyer4 (Vikram)
  {
    buyer: buyer4._id,
    seller: hikeMaster.seller,
    product: hikeMaster._id,
    size: 10,
    quantity: 1,
    unitPrice: 10299,
    totalPrice: 10299,
    shippingAddress: addr.vikram,
    status: "confirmed",
  },
  {
    buyer: buyer4._id,
    seller: gymPulse.seller,
    product: gymPulse._id,
    size: 9,
    quantity: 1,
    unitPrice: 4799,
    totalPrice: 4799,
    shippingAddress: addr.vikram,
    status: "delivered",
  },
  {
    buyer: buyer4._id,
    seller: winterBoot.seller,
    product: winterBoot._id,
    size: 10,
    quantity: 1,
    unitPrice: 7799,
    totalPrice: 7799,
    shippingAddress: addr.vikram,
    status: "cancelled",
    cancelReason: "Ordered the wrong size by mistake.",
    cancelledBy: "buyer",
  },

  // buyer5 (Sneha)
  {
    buyer: buyer5._id,
    seller: aeroStride.seller,
    product: aeroStride._id,
    size: 6,
    quantity: 1,
    unitPrice: 5299,
    totalPrice: 5299,
    shippingAddress: addr.sneha,
    status: "delivered",
  },
  {
    buyer: buyer5._id,
    seller: execOxford.seller,
    product: execOxford._id,
    size: 7,
    quantity: 1,
    unitPrice: 11499,
    totalPrice: 11499,
    shippingAddress: addr.sneha,
    status: "pending",
  },
];

for (const def of orderDefs) {
  const existing = await Order.findOne({
    buyer: def.buyer,
    product: def.product,
    size: def.size,
  });
  if (!existing) {
    await Order.create(def);
    console.log(
      `  ✓ Order: buyer=${def.buyer} product=${def.product} size=${def.size} ₹${def.totalPrice} [${def.status}]`
    );
  } else {
    console.log(`  · Order already exists (buyer/product/size)`);
  }
}
console.log(`✓ Orders done`);

// ─── 6. REVIEWS ───────────────────────────────────────────────────────────────

const reviewDefs = [
  // buyer1 (Neha)
  {
    product: aeroStride._id,
    buyer: buyer1._id,
    rating: 5,
    comment:
      "Incredibly lightweight! My pace improved noticeably during my morning 10k. The mesh breathes really well.",
  },
  {
    product: execOxford._id,
    buyer: buyer1._id,
    rating: 4,
    comment:
      "Stunning craftsmanship. Needed a week to break in but now they are the most comfortable formal shoes I own.",
  },
  {
    product: beachWalk._id,
    buyer: buyer1._id,
    rating: 5,
    comment:
      "Perfect for Goa! Dried quickly after getting wet and the straps held firmly all day.",
  },

  // buyer2 (Karan)
  {
    product: cloudWalk._id,
    buyer: buyer2._id,
    rating: 5,
    comment:
      "The responsive midsole is a game-changer for my track sessions. Highly recommend to any serious runner.",
  },
  {
    product: powerFlex._id,
    buyer: buyer2._id,
    rating: 4,
    comment:
      "Excellent court grip and the ankle support saved me on a couple of sharp cuts. Slightly narrow toe box.",
  },
  {
    product: slimMonk._id,
    buyer: buyer2._id,
    rating: 3,
    comment:
      "Good quality leather but the tan shade is darker than the photos. Still wearable for office use.",
  },

  // buyer3 (Anjali)
  {
    product: urbanStep._id,
    buyer: buyer3._id,
    rating: 4,
    comment:
      "Cute design, true to size, and very comfortable for college all day. Great value for money.",
  },
  {
    product: slipOn._id,
    buyer: buyer3._id,
    rating: 5,
    comment:
      "I bought two pairs. The memory foam is incredibly soft and slipping them on every morning is such a joy.",
  },
  {
    product: sunTrek._id,
    buyer: buyer3._id,
    rating: 4,
    comment:
      "Good arch support for long walks. The cork footbed moulds to your foot after a few days.",
  },

  // buyer4 (Vikram)
  {
    product: gymPulse._id,
    buyer: buyer4._id,
    rating: 5,
    comment:
      "Handles squats, deadlifts, and HIIT without slipping. The wide toe box is a blessing for deadlifts.",
  },

  // buyer5 (Sneha)
  {
    product: hikeMaster._id,
    buyer: buyer5._id,
    rating: 5,
    comment:
      "Wore these on a 3-day Himachal trek — not a single blister! Waterproofing held up through stream crossings.",
  },
  {
    product: winterBoot._id,
    buyer: buyer5._id,
    rating: 4,
    comment:
      "Super warm and the side zip makes them easy to pull on. The lug sole is solid on wet pavements.",
  },
];

for (const def of reviewDefs) {
  const existing = await Review.findOne({
    product: def.product,
    buyer: def.buyer,
  });
  if (!existing) {
    await Review.create(def);
    console.log(
      `  ✓ Review: product=${def.product} buyer=${def.buyer} ★${def.rating}`
    );
  } else {
    console.log(`  · Review already exists (product/buyer)`);
  }
}
console.log(`✓ Reviews done`);

// Update averageRating and reviewCount on each product
for (const prod of products) {
  const reviews = await Review.find({ product: prod._id });
  if (reviews.length === 0) continue;
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await Product.findByIdAndUpdate(prod._id, {
    averageRating: Math.round(avg * 10) / 10,
    reviewCount: reviews.length,
  });
  console.log(
    `  ✓ "${prod.name}" → ★${Math.round(avg * 10) / 10} (${reviews.length} review${reviews.length > 1 ? "s" : ""})`
  );
}
console.log(`✓ Product ratings updated`);

// ─── DONE ─────────────────────────────────────────────────────────────────────

await mongoose.disconnect();
console.log("\n✓ Seed complete. Disconnected from MongoDB.");
console.log(`\nAll seed accounts use password: ${PASSWORD_PLAIN}`);
console.log("  admin@shoes.com    (admin)");
console.log("  seller1@shoes.com  (seller — Arjun Mehta)");
console.log("  seller2@shoes.com  (seller — Priya Sharma)");
console.log("  seller3@shoes.com  (seller — Rohan Verma)");
console.log("  buyer1@shoes.com   (buyer  — Neha Kapoor)");
console.log("  buyer2@shoes.com   (buyer  — Karan Singh)");
console.log("  buyer3@shoes.com   (buyer  — Anjali Patel)");
console.log("  buyer4@shoes.com   (buyer  — Vikram Nair)");
console.log("  buyer5@shoes.com   (buyer  — Sneha Reddy)");
