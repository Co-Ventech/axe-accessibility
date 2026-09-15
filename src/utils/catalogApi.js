const { apiBaseUrl } = require('../config');

async function fetchFirstInStockProductId() {
  const response = await fetch(`${apiBaseUrl}/products`);
  if (!response.ok) {
    throw new Error(`Products API failed with ${response.status}`);
  }

  const body = await response.json();
  const products = Array.isArray(body) ? body : body.data;
  if (!Array.isArray(products)) {
    throw new Error('Products API returned an unexpected payload');
  }

  const inStock = products.find((product) => product.in_stock);
  if (!inStock) {
    throw new Error('No in-stock product returned from API');
  }

  return inStock.id;
}

module.exports = { fetchFirstInStockProductId };
