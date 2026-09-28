import "dotenv/config";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env before seeding`);
  return value;
}

const products = [
  { name: "Kanchipuram silk saree", description: "Pure silk with zari border, maroon and gold.", pricePaise: 1249900, stock: 5 },
  { name: "Chettinad cotton saree", description: "Handwoven cotton, checked pattern.", pricePaise: 189900, stock: 12 },
  { name: "Veshti with jari border", description: "Traditional dhoti, 4 metres.", pricePaise: 79900, stock: 30 },
  { name: "Silk pavadai set (kids)", description: "Skirt and blouse set for ages 4 to 6.", pricePaise: 149900, stock: 8 },
];

async function main() {
  const platformAdmin = await db.user.upsert({
    where: { email: required("SEED_PLATFORM_ADMIN_EMAIL") },
    update: {},
    create: {
      email: required("SEED_PLATFORM_ADMIN_EMAIL"),
      name: "Platform Admin",
      passwordHash: await hashPassword(required("SEED_PLATFORM_ADMIN_PASSWORD")),
      isPlatformAdmin: true,
    },
  });

  const owner = await db.user.upsert({
    where: { email: required("SEED_SHOP_OWNER_EMAIL") },
    update: {},
    create: {
      email: required("SEED_SHOP_OWNER_EMAIL"),
      name: "Ravi Kumar",
      passwordHash: await hashPassword(required("SEED_SHOP_OWNER_PASSWORD")),
    },
  });

  const shop = await db.shop.upsert({
    where: { slug: "ravi-textiles" },
    update: {},
    create: { slug: "ravi-textiles", name: "Ravi Textiles", supportPhone: "9876543210", paymentProvider: "testpay" },
  });

  await db.membership.upsert({
    where: { shopId_userId: { shopId: shop.id, userId: owner.id } },
    update: {},
    create: { shopId: shop.id, userId: owner.id, role: "SUPER_ADMIN" },
  });

  if ((await db.product.count({ where: { shopId: shop.id } })) === 0) {
    await db.product.createMany({ data: products.map((product) => ({ ...product, shopId: shop.id })) });
  }

  await db.coupon.upsert({
    where: { shopId_code: { shopId: shop.id, code: "WELCOME10" } },
    update: {},
    create: { shopId: shop.id, code: "WELCOME10", type: "PERCENT", value: 10, maxDiscountPaise: 50000 },
  });

  console.log(`Seeded platform admin ${platformAdmin.email} and shop ${shop.slug} (owner ${owner.email})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
