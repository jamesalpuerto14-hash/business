"use strict";

(() => {
  const STORAGE_KEY = "products";

  const form = document.getElementById("productForm");
  const table = document.getElementById("productTable");
  const search = document.getElementById("search");

  const itemName = document.getElementById("itemName");
  const itemType = document.getElementById("itemType");
  const pricePerPack = document.getElementById("pricePerPack");
  const numberOfPacks = document.getElementById("numberOfPacks");
  const itemsPerPack = document.getElementById("itemsPerPack");
  const markup = document.getElementById("markup");

  const totalCost = document.getElementById("totalCost");
  const sellingPricePreview = document.getElementById(
    "sellingPricePreview"
  );
  const profitPerItemPreview = document.getElementById(
    "profitPerItemPreview"
  );

  const totalProducts = document.getElementById("totalProducts");
  const totalCostValue = document.getElementById("totalCostValue");
  const totalProfitValue = document.getElementById("totalProfitValue");
  const averageRoi = document.getElementById("averageRoi");

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
      : `product-${Date.now()}-${Math.random()
          .toString(16)
          .slice(2)}`;
  }

  function getNumber(input) {
    const value = Number(input.value);
    return Number.isFinite(value) ? value : 0;
  }

  function isValidProduct(product) {
    return (
      typeof product.name === "string" &&
      product.name.trim().length > 0 &&
      typeof product.type === "string" &&
      product.type.trim().length > 0 &&
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

  function calculate(product) {
    const totalCostValue =
      product.pricePerPack * product.numberOfPacks;

    const totalItems =
      product.numberOfPacks * product.itemsPerPack;

    const costPerItem =
      totalItems > 0 ? totalCostValue / totalItems : 0;

    const unroundedPrice =
      costPerItem * (1 + product.markup / 100);

    // Avoid rounding up solely because of floating-point noise.
    const nearestInteger = Math.round(unroundedPrice);
    const tolerance =
      Number.EPSILON *
      Math.max(1, Math.abs(unroundedPrice)) *
      4;

    const sellingPrice =
      Math.abs(unroundedPrice - nearestInteger) <= tolerance
        ? nearestInteger
        : Math.ceil(unroundedPrice);

    const profitPerItem = sellingPrice - costPerItem;
    const totalProfit = profitPerItem * totalItems;

    const roi =
      totalCostValue > 0
        ? (totalProfit / totalCostValue) * 100
        : 0;

    return {
      ...product,
      totalCostValue,
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
        .map(product =>
          calculate({
            ...product,
            id: String(product.id || createId()),
            name: product.name.trim(),
            type: product.type.trim()
          })
        )
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

  function getFormData() {
    return {
      id: createId(),
      name: itemName.value.trim(),
      type: itemType.value,
      pricePerPack: getNumber(pricePerPack),
      numberOfPacks: getNumber(numberOfPacks),
      itemsPerPack: getNumber(itemsPerPack),
      markup: getNumber(markup)
    };
  }

  function clearPreview() {
    totalCost.textContent = money(0);
    sellingPricePreview.textContent = money(0);
    profitPerItemPreview.textContent = money(0);
  }

  function updatePreview() {
    const product = getFormData();

    const purchaseTotal =
      product.pricePerPack * product.numberOfPacks;

    totalCost.textContent = money(purchaseTotal);

    const validNumbers =
      product.pricePerPack >= 0.01 &&
      Number.isSafeInteger(product.numberOfPacks) &&
      product.numberOfPacks >= 1 &&
      Number.isSafeInteger(product.itemsPerPack) &&
      product.itemsPerPack >= 1 &&
      product.markup >= 10 &&
      product.markup <= 100;

    if (!validNumbers) {
      sellingPricePreview.textContent = money(0);
      profitPerItemPreview.textContent = money(0);
      return;
    }

    const result = calculate(product);

    if (!hasValidResults(result)) {
      clearPreview();
      return;
    }

    sellingPricePreview.textContent = money(
      result.sellingPrice
    );

    profitPerItemPreview.textContent = money(
      result.profitPerItem
    );
  }

  function render() {
    const query = search.value.trim().toLowerCase();

    const filteredProducts = products.filter(product =>
      product.name.toLowerCase().includes(query) ||
      product.type.toLowerCase().includes(query)
    );

    table.replaceChildren();

    if (filteredProducts.length === 0) {
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

    filteredProducts.forEach(product => {
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
      const deleteButton = document.createElement("button");

      deleteButton.type = "button";
      deleteButton.className = "delete";
      deleteButton.dataset.id = product.id;
      deleteButton.textContent = "Delete";
      deleteButton.setAttribute(
        "aria-label",
        `Delete ${product.name}`
      );

      actionCell.appendChild(deleteButton);
      row.appendChild(actionCell);
      table.appendChild(row);
    });

    const costSum = products.reduce(
      (sum, product) => sum + product.totalCostValue,
      0
    );

    const profitSum = products.reduce(
      (sum, product) => sum + product.totalProfit,
      0
    );

    const average = products.length
      ? products.reduce(
          (sum, product) => sum + product.roi,
          0
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
        "Please complete all fields correctly. " +
        "Pack quantities must be whole numbers, and " +
        "markup must be between 10% and 100%."
      );
      return;
    }

    const duplicate = products.some(existing =>
      existing.name.toLowerCase() ===
        product.name.toLowerCase() &&
      existing.type.toLowerCase() ===
        product.type.toLowerCase()
    );

    if (duplicate) {
      alert(
        "A product with the same name and type already exists."
      );
      return;
    }

    const calculatedProduct = calculate(product);

    if (!hasValidResults(calculatedProduct)) {
      alert("The values are too large. Please enter smaller amounts.");
      return;
    }

    const nextProducts = [...products, calculatedProduct];

    const totalsAreFinite = [
      nextProducts.reduce(
        (sum, entry) => sum + entry.totalCostValue,
        0
      ),
      nextProducts.reduce(
        (sum, entry) => sum + entry.totalProfit,
        0
      ),
      nextProducts.reduce(
        (sum, entry) => sum + entry.roi,
        0
      )
    ].every(Number.isFinite);

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

    const confirmed = window.confirm(
      `Delete "${product.name}"? This cannot be undone.`
    );

    if (!confirmed) return;

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
