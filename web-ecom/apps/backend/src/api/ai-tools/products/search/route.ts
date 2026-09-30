import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import {
  authorizeAiTool,
  getProductVndPrices,
  getQueryString,
  loadAvailability,
  loadCatalog,
  normalizeText,
  parseLimit,
  parseOptionalAmount,
  presentProduct,
  productSearchText,
} from "../../_shared";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  if (!authorizeAiTool(req, res)) {
    return;
  }

  const queryText = normalizeText(getQueryString(req.query.q));
  const category = normalizeText(getQueryString(req.query.category));
  const brand = normalizeText(getQueryString(req.query.brand));
  const minimum = parseOptionalAmount(req.query.min_price);
  const maximum = parseOptionalAmount(req.query.max_price);
  const limit = parseLimit(req.query.limit);

  const validationError = minimum.error ?? maximum.error ?? limit.error;
  if (validationError) {
    res.status(400).json({
      error: { code: "invalid_query", message: validationError },
    });
    return;
  }

  if (
    minimum.value !== undefined &&
    maximum.value !== undefined &&
    minimum.value > maximum.value
  ) {
    res.status(400).json({
      error: {
        code: "invalid_price_range",
        message: "min_price không được lớn hơn max_price.",
      },
    });
    return;
  }

  const products = await loadCatalog(req);
  const filtered = products.filter((product) => {
    const searchText = productSearchText(product);
    const metadataBrand = normalizeText(product.metadata?.brand);
    const categoryNames = normalizeText(
      (product.categories ?? []).map((item) => item.name ?? "").join(" "),
    );
    const vndPrices = getProductVndPrices(product);
    const minimumProductPrice = vndPrices.length ? Math.min(...vndPrices) : null;

    return (
      (!queryText || searchText.includes(queryText)) &&
      (!category || categoryNames.includes(category)) &&
      (!brand || metadataBrand.includes(brand)) &&
      (minimum.value === undefined ||
        (minimumProductPrice !== null && minimumProductPrice >= minimum.value)) &&
      (maximum.value === undefined ||
        (minimumProductPrice !== null && minimumProductPrice <= maximum.value))
    );
  });
  const selected = filtered.slice(0, limit.value);
  const availability = await loadAvailability(req, selected);

  res.json({
    query: {
      q: getQueryString(req.query.q) || null,
      category: getQueryString(req.query.category) || null,
      brand: getQueryString(req.query.brand) || null,
      min_price: minimum.value ?? null,
      max_price: maximum.value ?? null,
      limit: limit.value,
    },
    count: selected.length,
    total_matches: filtered.length,
    products: selected.map((product) => presentProduct(product, availability)),
  });
}
