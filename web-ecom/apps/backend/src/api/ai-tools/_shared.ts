import { timingSafeEqual } from "crypto";

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  getVariantAvailability,
} from "@medusajs/framework/utils";

type ProductPrice = {
  amount?: number | null;
  currency_code?: string | null;
};

type ProductVariant = {
  id: string;
  title?: string | null;
  sku?: string | null;
  manage_inventory?: boolean | null;
  allow_backorder?: boolean | null;
  prices?: ProductPrice[] | null;
};

type CatalogProduct = {
  id: string;
  title: string;
  handle: string;
  description?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  categories?: Array<{
    id?: string | null;
    name?: string | null;
    handle?: string | null;
  }> | null;
  variants?: ProductVariant[] | null;
};

type VariantAvailability = Record<
  string,
  {
    availability?: number | null;
  }
>;

export type PresentedProduct = ReturnType<typeof presentProduct>;

const TOOL_KEY_HEADER = "x-ai-tool-key";

const firstHeaderValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const safeKeyEquals = (actual: string, expected: string) => {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
};

export const authorizeAiTool = (
  req: MedusaRequest,
  res: MedusaResponse,
) => {
  const expectedKey = process.env.AI_TOOL_API_KEY?.trim();

  if (!expectedKey) {
    res.status(503).json({
      error: {
        code: "ai_tool_not_configured",
        message: "AI tool access is not configured.",
      },
    });
    return false;
  }

  const actualKey = firstHeaderValue(req.headers[TOOL_KEY_HEADER])?.trim();

  if (!actualKey || !safeKeyEquals(actualKey, expectedKey)) {
    res.status(401).json({
      error: {
        code: "unauthorized",
        message: "A valid X-AI-Tool-Key header is required.",
      },
    });
    return false;
  }

  return true;
};

export const getQueryString = (value: unknown) => {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0].trim() : "";
  }

  return typeof value === "string" ? value.trim() : "";
};

export const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .trim();

export const parseOptionalAmount = (value: unknown) => {
  const text = getQueryString(value);

  if (!text) {
    return { value: undefined as number | undefined };
  }

  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { error: "Giá phải là một số không âm, đơn vị VND." };
  }

  return { value: parsed };
};

export const parseLimit = (value: unknown, defaultValue = 5, maxValue = 10) => {
  const text = getQueryString(value);

  if (!text) {
    return { value: defaultValue };
  }

  const parsed = Number(text);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maxValue) {
    return { error: `limit phải là số nguyên từ 1 đến ${maxValue}.` };
  }

  return { value: parsed };
};

export const formatMoney = (amount: number, currencyCode = "vnd") => {
  if (currencyCode.toLowerCase() === "vnd") {
    return `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
  }).format(amount);
};

const readStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

export const getProductVndPrices = (product: CatalogProduct) =>
  (product.variants ?? [])
    .flatMap((variant) => variant.prices ?? [])
    .filter(
      (price): price is { amount: number; currency_code: string } =>
        typeof price.amount === "number" &&
        typeof price.currency_code === "string" &&
        price.currency_code.toLowerCase() === "vnd",
    )
    .map((price) => price.amount);

export const presentProduct = (
  product: CatalogProduct,
  availability: VariantAvailability,
) => {
  const vndPrices = getProductVndPrices(product);
  const minimumPrice = vndPrices.length ? Math.min(...vndPrices) : null;
  const metadata = product.metadata ?? {};

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    description: product.description ?? null,
    storefront_path: `/vn/products/${product.handle}`,
    brand: typeof metadata.brand === "string" ? metadata.brand : null,
    tags: readStringArray(metadata.ai_tags),
    warranty_months:
      typeof metadata.warranty_months === "number"
        ? metadata.warranty_months
        : null,
    categories: (product.categories ?? [])
      .map((category) => category.name)
      .filter((name): name is string => Boolean(name)),
    minimum_price:
      minimumPrice === null
        ? null
        : {
            amount: minimumPrice,
            currency_code: "vnd",
            formatted: formatMoney(minimumPrice, "vnd"),
          },
    variants: (product.variants ?? []).map((variant) => {
      const quantity = availability[variant.id]?.availability ?? null;
      const vndPrice = (variant.prices ?? []).find(
        (price) => price.currency_code?.toLowerCase() === "vnd",
      );
      const available =
        variant.manage_inventory === false ||
        variant.allow_backorder === true ||
        (typeof quantity === "number" && quantity > 0);

      return {
        id: variant.id,
        title: variant.title ?? null,
        sku: variant.sku ?? null,
        price:
          typeof vndPrice?.amount === "number"
            ? {
                amount: vndPrice.amount,
                currency_code: "vnd",
                formatted: formatMoney(vndPrice.amount, "vnd"),
              }
            : null,
        inventory_quantity: quantity,
        available,
        allow_backorder: variant.allow_backorder === true,
      };
    }),
  };
};

export const loadCatalog = async (req: MedusaRequest) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "description",
      "status",
      "metadata",
      "categories.id",
      "categories.name",
      "categories.handle",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.manage_inventory",
      "variants.allow_backorder",
      "variants.prices.amount",
      "variants.prices.currency_code",
    ],
    filters: {
      status: "published",
    },
    pagination: {
      take: 200,
      order: {
        title: "ASC",
      },
    },
  });

  return data as unknown as CatalogProduct[];
};

export const loadAvailability = async (
  req: MedusaRequest,
  products: CatalogProduct[],
) => {
  const variantIds = products.flatMap((product) =>
    (product.variants ?? []).map((variant) => variant.id),
  );

  if (!variantIds.length) {
    return {} as VariantAvailability;
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
    pagination: { take: 1 },
  });
  const salesChannelId = salesChannels[0]?.id;

  if (!salesChannelId) {
    return {} as VariantAvailability;
  }

  return (await getVariantAvailability(query, {
    variant_ids: variantIds,
    sales_channel_id: salesChannelId,
  })) as VariantAvailability;
};

export const productSearchText = (product: CatalogProduct) => {
  const metadata = product.metadata ?? {};
  const parts = [
    product.title,
    product.handle,
    product.description,
    typeof metadata.brand === "string" ? metadata.brand : "",
    ...readStringArray(metadata.ai_tags),
    ...(product.categories ?? []).map((category) => category.name ?? ""),
    ...(product.variants ?? []).map((variant) => variant.sku ?? ""),
  ];

  return normalizeText(parts.join(" "));
};
