<script>
"use strict";

(() => {
  const STORAGE_KEY = "products";
  const get = id => document.getElementById(id);

  const form = get("productForm");
  const table = get("productTable");
  const search = get("search");

  const itemName = get("itemName");
  const itemType = get("itemType");
  const pricePerPack = get("pricePerPack");
  const numberOfPacks = get("numberOfPacks");
  const itemsPerPack = get("itemsPerPack");
  const markup = get("markup");

  const totalCost = get("totalCost");
  const sellingPricePreview = get("sellingPricePreview");
  const profitPerItemPreview = get("profitPerItemPreview");

  const totalProducts = get("totalProducts");
  const totalCostValue = get("totalCostValue");
  const totalProfitValue = get("totalProfitValue");
  const averageRoi = get("averageRoi");

  const formatter = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function money(value) {
    return formatter.format(Number.isFinite(value) ? value : 0);
  }

  function createId() {
    return window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `product-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getFormData() {
    return {
      id: createId(),
      name: itemName.value.trim(),
      type: itemType.value,
      pricePerPack: Number(pricePerPack.value),
      numberOfPacks: Number(numberOfPacks.value),
      itemsPerPack: Number(itemsPerPack.value),
      markup: Number(markup.value)
    };
  }

  function validNumbers(product) {
    return (
      Number.isFinite(product.pricePerPack) &&
      product.pricePerPack >= 0.01 &&
      Number.isSafeInteger(product.numberOfPacks) &&
      product.numberOfPacks >= 1 &&
      Number.isSafeInteger(product.itemsPerPack) &&
      product.itemsPerPack >= 1 &&
      Number.isFinite(product.markup) &&
      product.markup >= 10 &&
      product.markup <= 100
    );
  }

  function isValidProduct(product) {
    return (
      typeof product.name === "string" &&
      product.name.trim() !== "" &&
      typeof product.type === "string" &&
      product.type.trim() !== "" &&
      validNumbers(product)
    );
  }

  function calculate(product) {
    const purchaseCost =
      product.pricePerPack * product.numberOfPacks;

    const totalItems =
      product.numberOfPacks * product.itemsPerPack;

    const costPerItem = purchaseCost / totalItems;
    const rawPrice = costPerItem * (1 + product.markup / 100);

    const nearestInteger = Math.round(rawPrice);
    const tolerance =
      Number.EPSILON * Math.max(1, Math.abs(rawPrice)) * 4;

    const sellingPrice =
      Math.abs(rawPrice - nearestInteger) <= tolerance
        ? nearestInteger
        : Math.ceil(rawPrice);

    const profitPerItem = sellingPrice - costPerItem;
    const totalProfit = profitPerItem * totalItems;
    const roi = (totalProfit / purchaseCost) * 100;

    return {
      ...product,
      totalCostValue: purchaseCost,
      totalItems,
      costPerItem,
      sellingPrice,
      profitPerItem,
      totalProfit,
      roi
    };
  }

  function hasValidResults(product) {
    return (
      Number.isSafeInteger(product.totalItems) &&
      [
        product.totalCostValue,
        product.costPerItem,
        product.sellingPrice,
        product.profitPerItem,
        product.totalProfit,
        product.roi
      ].every(Number.isFinite)
    );
  }

  function loadProducts() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      if (!Array.isArray(saved)) return [];

      return saved
        .filter(product => product && isValidProduct(product))
        .map(product => calculate({
          ...product,
          id: String(product.id || createId()),
          name: product.name.trim(),
          type: product.type.trim()
        }))
        .filter(hasValidResults);
    } catch (error) {
      console.warn("Could not load saved products:", error);
      return [];
    }
  }

  let products = loadProducts();

  function saveProducts(nextProducts) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(nextProducts)
      );
      return true;
    } catch (error) {
      console.error("Could not save products:", error);
      alert(
        "Your browser could not save the products. " +
        "Please check whether browser storage is available."
      );
      return false;
    }
  }

  function updatePreview() {
    const product = getFormData();

    totalCost.textContent = money(
      product.pricePerPack * product.numberOfPacks
    );

    if (!validNumbers(product)) {
      sellingPricePreview.textContent = money(0);
      profitPerItemPreview.textContent = money(0);
      return;
    }

    const result = calculate(product);

    if (!hasValidResults(result)) {
      totalCost.textContent = money(0);
      sellingPricePreview.textContent = money(0);
      profitPerItemPreview.textContent = money(0);
      return;
    }

    sellingPricePreview.textContent = money(result.sellingPrice);
    profitPerItemPreview.textContent = money(result.profitPerItem);
  }

  function render() {
    const query = search.value.trim().toLowerCase();

    const visible = products.filter(product =>
      product.name.toLowerCase().includes(query) ||
      product.type.toLowerCase().includes(query)
    );

    table.replaceChildren();

    if (!visible.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");

      cell.colSpan = 11;
      cell.className = "empty-message";
      cell.textContent = products.length
        ? "No matching products found."
        : "No products saved yet.";

      row.appendChild(cell);
      table.appendChild(row);
    }

    visible.forEach(product => {
      const row = document.createElement("tr");

      const values = [
        product.name,
        product.type,
        product.numberOfPacks,
        product.totalItems,
        money(product.totalCostValue),
        money(product.costPerItem),
        money(product.sellingPrice),
        money(product.profitPerItem),
        money(product.totalProfit),
        `${product.roi.toFixed(2)}%`
      ];

      values.forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.appendChild(cell);
      });

      const actionCell = document.createElement("td");
      const button = document.createElement("button");

      button.type = "button";
      button.className = "delete";
      button.dataset.id = product.id;
      button.textContent = "Delete";
      button.setAttribute("aria-label", `Delete ${product.name}`);

      actionCell.appendChild(button);
      row.appendChild(actionCell);
      table.appendChild(row);
    });

    const costSum = products.reduce(
      (sum, product) => sum + product.totalCostValue, 0
    );

    const profitSum = products.reduce(
      (sum, product) => sum + product.totalProfit, 0
    );

    const average = products.length
      ? products.reduce(
          (sum, product) => sum + product.roi, 0
        ) / products.length
      : 0;

    totalProducts.textContent = String(products.length);
    totalCostValue.textContent = money(costSum);
    totalProfitValue.textContent = money(profitSum);
    averageRoi.textContent = `${average.toFixed(2)}%`;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const product = getFormData();

    if (!isValidProduct(product)) {
      alert(
        "Please complete all fields correctly. Pack quantities " +
        "must be whole numbers and markup must be 10%–100%."
      );
      return;
    }

    const duplicate = products.some(existing =>
      existing.name.toLowerCase() === product.name.toLowerCase() &&
      existing.type.toLowerCase() === product.type.toLowerCase()
    );

    if (duplicate) {
      alert("A product with the same name and type already exists.");
      return;
    }

    const result = calculate(product);

    if (!hasValidResults(result)) {
      alert("The values are too large. Please enter smaller amounts.");
      return;
    }

    const nextProducts = [...products, result];

    const totalsAreFinite = [
      "totalCostValue",
      "totalProfit",
      "roi"
    ].every(key =>
      Number.isFinite(
        nextProducts.reduce((sum, entry) => sum + entry[key], 0)
      )
    );

    if (!totalsAreFinite) {
      alert("The combined totals are too large.");
      return;
    }

    if (!saveProducts(nextProducts)) return;

    products = nextProducts;
    render();
    form.reset();
    markup.value = "10";
    updatePreview();
    itemName.focus();
  });

  search.addEventListener("input", render);

  table.addEventListener("click", event => {
    const button = event.target.closest("button.delete");
    if (!button) return;

    const product = products.find(
      entry => entry.id === button.dataset.id
    );

    if (!product) return;

    if (!window.confirm(
      `Delete "${product.name}"? This cannot be undone.`
    )) return;

    const nextProducts = products.filter(
      entry => entry.id !== product.id
    );

    if (!saveProducts(nextProducts)) return;

    products = nextProducts;
    render();
  });

  [
    pricePerPack,
    numberOfPacks,
    itemsPerPack,
    markup
  ].forEach(input => {
    input.addEventListener("input", updatePreview);
  });

  render();
  updatePreview();
})();
</script>
