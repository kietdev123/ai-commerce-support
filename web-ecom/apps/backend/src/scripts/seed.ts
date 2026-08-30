import { dirname } from "path";
import { mkdirSync, writeFileSync } from "fs";

import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createCartWorkflow,
  createCollectionsWorkflow,
  createCustomersWorkflow,
  createInventoryLevelsWorkflow,
  createOrderWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

const seedMarkerHandle = "ai-commerce-laptop-pro-14";
const seedCompletionHandle = "phase-1-seed-complete";
const publishableKeyTitle = "AI Commerce Storefront";

// VND has no fractional unit, so these values are already in major units.
const vnd = (amount: number) => amount;

type CatalogProduct = {
  title: string;
  handle: string;
  category: string;
  description: string;
  sku: string;
  price: number;
  usdPrice: number;
  brand: string;
  tags: string[];
};

const catalog: CatalogProduct[] = [
  {
    title: "Laptop Pro 14",
    handle: seedMarkerHandle,
    category: "Laptops",
    description:
      "Laptop 14 inch cho lập trình và công việc sáng tạo, RAM 16GB, SSD 512GB, màn hình 2.8K và pin 14 giờ.",
    sku: "LAP-PRO14",
    price: vnd(24990000),
    usdPrice: 999,
    brand: "NovaTech",
    tags: ["coding", "portable", "creator"],
  },
  {
    title: "Laptop Gaming X16",
    handle: "ai-commerce-laptop-gaming-x16",
    category: "Laptops",
    description:
      "Laptop gaming 16 inch 165Hz, GPU rời, RAM 16GB và hệ thống tản nhiệt hai quạt cho game và đồ họa 3D.",
    sku: "LAP-X16",
    price: vnd(32990000),
    usdPrice: 1299,
    brand: "NovaTech",
    tags: ["gaming", "gpu", "performance"],
  },
  {
    title: "Ultrabook Air 13",
    handle: "ai-commerce-ultrabook-air-13",
    category: "Laptops",
    description:
      "Ultrabook 13 inch nặng 1.1kg, RAM 16GB, SSD 512GB, phù hợp người thường xuyên di chuyển.",
    sku: "LAP-AIR13",
    price: vnd(19990000),
    usdPrice: 799,
    brand: "NovaTech",
    tags: ["office", "lightweight", "travel"],
  },
  {
    title: "Workstation Studio 15",
    handle: "ai-commerce-workstation-studio-15",
    category: "Laptops",
    description:
      "Máy trạm di động 15 inch với RAM 32GB, SSD 1TB và GPU chuyên dụng cho dựng phim, CAD và AI local.",
    sku: "LAP-STUDIO15",
    price: vnd(45990000),
    usdPrice: 1799,
    brand: "NovaTech",
    tags: ["workstation", "ai", "video-editing"],
  },
  {
    title: "Phone Pro Max 512",
    handle: "ai-commerce-phone-pro-max-512",
    category: "Phones & Tablets",
    description:
      "Điện thoại flagship màn hình OLED 120Hz, camera tele 5x, bộ nhớ 512GB và kháng nước IP68.",
    sku: "PHN-PROMAX",
    price: vnd(29990000),
    usdPrice: 1199,
    brand: "Orbit",
    tags: ["flagship", "camera", "oled"],
  },
  {
    title: "Phone Lite 5G",
    handle: "ai-commerce-phone-lite-5g",
    category: "Phones & Tablets",
    description:
      "Điện thoại 5G tầm trung, màn hình AMOLED 6.5 inch, pin 5000mAh và sạc nhanh 45W.",
    sku: "PHN-LITE5G",
    price: vnd(8990000),
    usdPrice: 349,
    brand: "Orbit",
    tags: ["5g", "battery", "value"],
  },
  {
    title: "Tablet Canvas 11",
    handle: "ai-commerce-tablet-canvas-11",
    category: "Phones & Tablets",
    description:
      "Máy tính bảng 11 inch kèm bút cảm ứng, loa bốn hướng và pin 12 giờ cho ghi chú và giải trí.",
    sku: "TAB-CANVAS11",
    price: vnd(12990000),
    usdPrice: 499,
    brand: "Orbit",
    tags: ["tablet", "stylus", "student"],
  },
  {
    title: "Tablet Mini 8",
    handle: "ai-commerce-tablet-mini-8",
    category: "Phones & Tablets",
    description:
      "Máy tính bảng nhỏ gọn 8 inch, bộ nhớ 128GB, hỗ trợ 4G và chế độ đọc sách bảo vệ mắt.",
    sku: "TAB-MINI8",
    price: vnd(7490000),
    usdPrice: 299,
    brand: "Orbit",
    tags: ["tablet", "compact", "reading"],
  },
  {
    title: "Headphone Silence 45",
    handle: "ai-commerce-headphone-silence-45",
    category: "Audio & Wearables",
    description:
      "Tai nghe chụp tai chống ồn chủ động, pin 45 giờ, hỗ trợ kết nối hai thiết bị và âm thanh Hi-Res.",
    sku: "AUD-SILENCE45",
    price: vnd(4990000),
    usdPrice: 199,
    brand: "Sonic",
    tags: ["anc", "headphone", "travel"],
  },
  {
    title: "Earbuds Air Pro",
    handle: "ai-commerce-earbuds-air-pro",
    category: "Audio & Wearables",
    description:
      "Tai nghe true wireless chống ồn, chuẩn IPX5, đàm thoại rõ và tổng thời lượng pin 30 giờ.",
    sku: "AUD-AIRPRO",
    price: vnd(2990000),
    usdPrice: 119,
    brand: "Sonic",
    tags: ["earbuds", "anc", "sport"],
  },
  {
    title: "Smartwatch Active S",
    handle: "ai-commerce-smartwatch-active-s",
    category: "Audio & Wearables",
    description:
      "Đồng hồ thông minh GPS hai băng tần, theo dõi giấc ngủ, nhịp tim và hơn 100 môn thể thao.",
    sku: "WEAR-ACTIVES",
    price: vnd(5990000),
    usdPrice: 239,
    brand: "Pulse",
    tags: ["watch", "gps", "fitness"],
  },
  {
    title: "Smart Speaker Home Mini",
    handle: "ai-commerce-smart-speaker-home-mini",
    category: "Audio & Wearables",
    description:
      "Loa thông minh nhỏ gọn với micro trường xa, âm thanh 360 độ và điều khiển thiết bị nhà thông minh.",
    sku: "AUD-HOMEMINI",
    price: vnd(1490000),
    usdPrice: 59,
    brand: "Sonic",
    tags: ["speaker", "smart-home", "voice"],
  },
  {
    title: "Monitor Vision 27 4K",
    handle: "ai-commerce-monitor-vision-27-4k",
    category: "Accessories",
    description:
      "Màn hình IPS 27 inch 4K, phủ màu DCI-P3 95%, USB-C 90W dành cho thiết kế và văn phòng.",
    sku: "ACC-VISION27",
    price: vnd(9990000),
    usdPrice: 399,
    brand: "NovaView",
    tags: ["monitor", "4k", "usb-c"],
  },
  {
    title: "Monitor UltraWide 34",
    handle: "ai-commerce-monitor-ultrawide-34",
    category: "Accessories",
    description:
      "Màn hình cong 34 inch tỉ lệ 21:9, độ phân giải WQHD và tần số quét 144Hz.",
    sku: "ACC-UW34",
    price: vnd(13990000),
    usdPrice: 549,
    brand: "NovaView",
    tags: ["monitor", "ultrawide", "gaming"],
  },
  {
    title: "Keyboard Mechanical K87",
    handle: "ai-commerce-keyboard-mechanical-k87",
    category: "Accessories",
    description:
      "Bàn phím cơ TKL hot-swap, kết nối USB-C, Bluetooth và 2.4GHz, pin 4000mAh.",
    sku: "ACC-K87",
    price: vnd(2190000),
    usdPrice: 89,
    brand: "KeyLab",
    tags: ["keyboard", "mechanical", "wireless"],
  },
  {
    title: "Mouse Flow MX",
    handle: "ai-commerce-mouse-flow-mx",
    category: "Accessories",
    description:
      "Chuột công thái học không dây, cảm biến 8000 DPI, con lăn điện từ và kết nối ba thiết bị.",
    sku: "ACC-FLOWMX",
    price: vnd(1890000),
    usdPrice: 75,
    brand: "KeyLab",
    tags: ["mouse", "ergonomic", "wireless"],
  },
  {
    title: "Webcam Clear 4K",
    handle: "ai-commerce-webcam-clear-4k",
    category: "Accessories",
    description:
      "Webcam 4K tự động lấy nét, cân bằng sáng HDR, micro kép và màn che riêng tư.",
    sku: "ACC-CLEAR4K",
    price: vnd(2690000),
    usdPrice: 109,
    brand: "NovaView",
    tags: ["webcam", "4k", "meeting"],
  },
  {
    title: "USB-C Hub 10-in-1",
    handle: "ai-commerce-usb-c-hub-10-in-1",
    category: "Accessories",
    description:
      "Hub USB-C nhôm với HDMI 4K, Ethernet, đầu đọc thẻ, USB 10Gbps và sạc pass-through 100W.",
    sku: "ACC-HUB10",
    price: vnd(1590000),
    usdPrice: 65,
    brand: "LinkPro",
    tags: ["hub", "usb-c", "office"],
  },
  {
    title: "Portable SSD Swift 2TB",
    handle: "ai-commerce-portable-ssd-swift-2tb",
    category: "Accessories",
    description:
      "SSD di động 2TB tốc độ đọc 2000MB/s, vỏ chống sốc và tương thích USB-C.",
    sku: "ACC-SSD2TB",
    price: vnd(4290000),
    usdPrice: 169,
    brand: "DataPeak",
    tags: ["ssd", "storage", "creator"],
  },
  {
    title: "Wi-Fi 6 Router Mesh AX3000",
    handle: "ai-commerce-router-mesh-ax3000",
    category: "Accessories",
    description:
      "Router Wi-Fi 6 băng thông AX3000, hỗ trợ mesh, WPA3 và quản lý thiết bị bằng ứng dụng.",
    sku: "ACC-AX3000",
    price: vnd(2490000),
    usdPrice: 99,
    brand: "LinkPro",
    tags: ["router", "wifi-6", "mesh"],
  },
  {
    title: "Power Bank 20000 PD",
    handle: "ai-commerce-power-bank-20000-pd",
    category: "Accessories",
    description:
      "Pin dự phòng 20000mAh, sạc nhanh USB-C PD 65W, có thể sạc laptop và ba thiết bị cùng lúc.",
    sku: "ACC-PB20K",
    price: vnd(1390000),
    usdPrice: 55,
    brand: "Volt",
    tags: ["power-bank", "pd", "travel"],
  },
  {
    title: "GaN Charger 100W",
    handle: "ai-commerce-gan-charger-100w",
    category: "Accessories",
    description:
      "Củ sạc GaN 100W ba cổng USB-C và một cổng USB-A, hỗ trợ PD 3.0 và PPS.",
    sku: "ACC-GAN100",
    price: vnd(1690000),
    usdPrice: 69,
    brand: "Volt",
    tags: ["charger", "gan", "usb-c"],
  },
  {
    title: "Action Camera Trail 5K",
    handle: "ai-commerce-action-camera-trail-5k",
    category: "Accessories",
    description:
      "Camera hành động quay 5K, chống rung điện tử, chống nước 10m và kèm hai pin.",
    sku: "ACC-TRAIL5K",
    price: vnd(6990000),
    usdPrice: 279,
    brand: "Orbit",
    tags: ["camera", "action", "travel"],
  },
  {
    title: "Desk Lamp Focus Pro",
    handle: "ai-commerce-desk-lamp-focus-pro",
    category: "Accessories",
    description:
      "Đèn bàn chống chói với cảm biến ánh sáng, điều chỉnh nhiệt độ màu và cổng sạc USB-C.",
    sku: "ACC-FOCUSPRO",
    price: vnd(1990000),
    usdPrice: 79,
    brand: "Lumina",
    tags: ["lamp", "desk", "eye-care"],
  },
];

const customers = Array.from({ length: 20 }, (_, index) => ({
  first_name: ["An", "Bình", "Chi", "Dũng", "Giang"][index % 5],
  last_name: ["Nguyễn", "Trần", "Lê", "Phạm"][index % 4],
  email: `customer${String(index + 1).padStart(2, "0")}@example.com`,
  phone: `090${String(1000000 + index)}`,
  metadata: {
    source: "phase-1-seed",
    segment: index % 3 === 0 ? "vip" : "retail",
  },
}));

function writePublishableKey(token: string) {
  const keyFile = process.env.STOREFRONT_API_KEY_FILE;

  if (!keyFile) {
    return;
  }

  mkdirSync(dirname(keyFile), { recursive: true });
  writeFileSync(keyFile, `${token}\n`, { mode: 0o600 });
}

export default async function seed({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT,
  );

  const { data: completionMarkers } = await query.graph({
    entity: "product_collection",
    fields: ["id"],
    filters: { handle: seedCompletionHandle },
  });

  if (completionMarkers.length) {
    const { data: existingKeys } = await query.graph({
      entity: "api_key",
      fields: ["token"],
      filters: { title: publishableKeyTitle },
    });

    if (existingKeys[0]?.token) {
      writePublishableKey(existingKeys[0].token);
    }

    logger.info("Phase 1 demo data already exists; skipping seed.");
    return;
  }

  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: { handle: seedMarkerHandle },
  });

  if (existingProducts.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A previous Phase 1 seed did not finish. Run `docker compose down -v` and start again.",
    );
  }

  logger.info("Seeding sales channel, store, region, and API key...");

  const {
    result: [salesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        {
          name: "AI Commerce Web Store",
          description: "Default sales channel for the Phase 1 storefront",
        },
      ],
    },
  });

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: publishableKeyTitle,
          type: "publishable",
          created_by: "",
        },
      ],
    },
  });

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [salesChannel.id],
    },
  });
  writePublishableKey(publishableApiKey.token);

  await createStoresWorkflow(container).run({
    input: {
      stores: [
        {
          name: "AI Commerce Store",
          supported_currencies: [
            { currency_code: "vnd", is_default: true },
            { currency_code: "usd", is_default: false },
          ],
          default_sales_channel_id: salesChannel.id,
        },
      ],
    },
  });

  const {
    result: [region],
  } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Vietnam",
          currency_code: "vnd",
          countries: ["vn"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });

  await createTaxRegionsWorkflow(container).run({
    input: [{ country_code: "vn", provider_id: "tp_system" }],
  });

  logger.info("Seeding warehouse and shipping options...");

  const {
    result: [stockLocation],
  } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: "Ho Chi Minh Warehouse",
          address: {
            address_1: "1 Nguyen Hue",
            city: "Ho Chi Minh City",
            country_code: "VN",
          },
        },
      ],
    },
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const shippingProfile = shippingProfiles[0];

  if (!shippingProfile) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Default shipping profile was not created by migrations",
    );
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Vietnam delivery",
    type: "shipping",
    service_zones: [
      {
        name: "Vietnam",
        geo_zones: [{ country_code: "vn", type: "country" }],
      },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  const { result: shippingOptions } = await createShippingOptionsWorkflow(
    container,
  ).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Giao hàng trong 2-4 ngày làm việc.",
          code: "standard",
        },
        prices: [
          { currency_code: "vnd", amount: vnd(30000) },
          { currency_code: "usd", amount: 2 },
          { region_id: region.id, amount: vnd(30000) },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
      {
        name: "Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Giao hàng trong ngày tại khu vực hỗ trợ.",
          code: "express",
        },
        prices: [
          { currency_code: "vnd", amount: vnd(80000) },
          { currency_code: "usd", amount: 4 },
          { region_id: region.id, amount: vnd(80000) },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  });

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: stockLocation.id, add: [salesChannel.id] },
  });

  logger.info(`Seeding ${catalog.length} products and inventory...`);

  const { result: categories } = await createProductCategoriesWorkflow(
    container,
  ).run({
    input: {
      product_categories: [
        { name: "Laptops", is_active: true },
        { name: "Phones & Tablets", is_active: true },
        { name: "Audio & Wearables", is_active: true },
        { name: "Accessories", is_active: true },
      ],
    },
  });

  const {
    result: [featuredCollection],
  } = await createCollectionsWorkflow(container).run({
    input: {
      collections: [
        {
          title: "AI Commerce Picks",
          handle: "ai-commerce-picks",
        },
      ],
    },
  });

  const {
    result: [modelOption],
  } = await createProductOptionsWorkflow(container).run({
    input: {
      product_options: [
        {
          title: "Model",
          values: ["Standard", "Pro"],
        },
      ],
    },
  });

  await createProductsWorkflow(container).run({
    input: {
      products: catalog.map((product) => ({
        title: product.title,
        handle: product.handle,
        description: product.description,
        status: ProductStatus.PUBLISHED,
        shipping_profile_id: shippingProfile.id,
        category_ids: [
          categories.find((category) => category.name === product.category)!.id,
        ],
        collection_id: featuredCollection.id,
        metadata: {
          brand: product.brand,
          ai_tags: product.tags,
          warranty_months: 24,
          seed: "phase-1",
        },
        options: [{ id: modelOption.id }],
        variants: [
          {
            title: "Standard",
            sku: `${product.sku}-STD`,
            options: { Model: "Standard" },
            prices: [
              { amount: product.price, currency_code: "vnd" },
              { amount: product.usdPrice, currency_code: "usd" },
            ],
          },
          {
            title: "Pro",
            sku: `${product.sku}-PRO`,
            options: { Model: "Pro" },
            prices: [
              {
                amount: Math.round(product.price * 1.25),
                currency_code: "vnd",
              },
              {
                amount: Math.round(product.usdPrice * 1.25),
                currency_code: "usd",
              },
            ],
          },
        ],
        sales_channels: [{ id: salesChannel.id }],
      })),
    },
  });

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryItems.map((item) => ({
        location_id: stockLocation.id,
        stocked_quantity: 500,
        inventory_item_id: item.id,
      })),
    },
  });

  logger.info(`Seeding ${customers.length} customers and sample carts...`);

  const { result: createdCustomers } = await createCustomersWorkflow(
    container,
  ).run({
    input: { customersData: customers },
  });

  const catalogByHandle = new Map(
    catalog.map((product) => [product.handle, product]),
  );
  const { data: allVariants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "title",
      "sku",
      "product.id",
      "product.title",
      "product.handle",
      "product.description",
    ],
  });
  const variants = allVariants.filter(
    (variant) =>
      variant.product?.handle && catalogByHandle.has(variant.product.handle),
  );

  for (let index = 0; index < 8; index++) {
    const customer = createdCustomers[index];
    const firstVariant = variants[(index * 3) % variants.length];
    const secondVariant = variants[(index * 3 + 1) % variants.length];

    await createCartWorkflow(container).run({
      input: {
        region_id: region.id,
        sales_channel_id: salesChannel.id,
        customer_id: customer.id,
        email: customer.email,
        items: [
          { variant_id: firstVariant.id, quantity: 1 },
          { variant_id: secondVariant.id, quantity: (index % 2) + 1 },
        ],
        metadata: {
          seed: "phase-1",
          scenario: "abandoned-cart",
        },
      },
    });
  }

  logger.info("Seeding 30 historical orders...");

  const orderStatuses = ["pending", "completed", "canceled"];
  const standardShipping = shippingOptions[0];

  for (let index = 0; index < 30; index++) {
    const customer = createdCustomers[index % createdCustomers.length];
    const variant = variants[(index * 5) % variants.length];
    const variantProduct = variant.product;

    if (!variantProduct?.handle) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Variant ${variant.id} is missing its product relation`,
      );
    }

    const product = catalogByHandle.get(variantProduct.handle);

    if (!product) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Missing catalog data for ${variantProduct.handle}`,
      );
    }

    const isPro = variant.title === "Pro";
    const unitPrice = isPro ? Math.round(product.price * 1.25) : product.price;
    const quantity = (index % 3) + 1;
    const shippingAmount = 30000;

    await createOrderWorkflow(container).run({
      input: {
        region_id: region.id,
        sales_channel_id: salesChannel.id,
        customer_id: customer.id,
        email: customer.email,
        currency_code: "vnd",
        status: orderStatuses[index % orderStatuses.length],
        shipping_address: {
          first_name: customer.first_name,
          last_name: customer.last_name,
          address_1: `${index + 10} Nguyen Trai`,
          city: "Ho Chi Minh City",
          country_code: "vn",
          postal_code: "700000",
          phone: customer.phone,
        },
        billing_address: {
          first_name: customer.first_name,
          last_name: customer.last_name,
          address_1: `${index + 10} Nguyen Trai`,
          city: "Ho Chi Minh City",
          country_code: "vn",
          postal_code: "700000",
          phone: customer.phone,
        },
        items: [
          {
            title: variantProduct.title,
            product_id: variantProduct.id,
            product_title: variantProduct.title,
            product_handle: variantProduct.handle,
            product_description: variantProduct.description ?? undefined,
            variant_id: variant.id,
            variant_sku: variant.sku ?? undefined,
            variant_title: variant.title,
            quantity,
            unit_price: unitPrice,
          },
        ],
        shipping_methods: [
          {
            name: "Standard Shipping",
            amount: shippingAmount,
            shipping_option_id: standardShipping.id,
          },
        ],
        transactions: [
          {
            amount: unitPrice * quantity + shippingAmount,
            currency_code: "vnd",
            reference: "seed-payment",
            reference_id: `PAY-${String(index + 1).padStart(4, "0")}`,
          },
        ],
        metadata: {
          seed: "phase-1",
          order_reference: `DH${String(index + 1).padStart(4, "0")}`,
          simulated_age_days: 30 - index,
        },
      },
    });
  }

  await createCollectionsWorkflow(container).run({
    input: {
      collections: [
        {
          title: "Phase 1 Seed Complete",
          handle: seedCompletionHandle,
        },
      ],
    },
  });

  logger.info(
    `Phase 1 seed complete: ${catalog.length} products, ${inventoryItems.length} inventory items, ${customers.length} customers, 8 carts, and 30 orders.`,
  );
}
