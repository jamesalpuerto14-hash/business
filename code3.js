"use strict";

(() => {
  const STORAGE_KEY = "products";
  const get = id => document.getElementById(id);

  const form = get("productForm");
  const table = get("productTable");
  const search = get("search");
  const message = get("message");
  const storageNote = get("storageNote");

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
    try {
      if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
      }
    } catch (error) {
      /* fall through to the simple id below */
    }
    return `product-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  /* ---------- Messages (replaces alert pop-ups) ---------- */

  let messageTimer = null;

  function showMessage(text, type) {
    message.textContent = text;
    message.className = `message ${type || "error"}`;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(clearMessage, 6000);
    if (message.scrollIntoView) message.scrollIntoView({ block: "nearest" });
  }

  function clearMessage() {
    message.textContent = "";
    message.className = "message";
  }

  /* ---------- Storage (works even when the browser blocks it) ---------- */

  let storageAvailable = true;

  function readStorage() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      storageAvailable = false;
      return null;
    }
  }

  function writeStorage(text) {
    try {
      window.localStorage.setItem(STORAGE_KEY, text);
      return true;
    } catch (error) {
      storageAvailable = false;
      return false;
    }
  }

  function updateStorageNote() {
    storageNote.textContent = storageAvailable
      ? "Products are saved in this browser only. " +
        "Clearing browser storage may remove saved products."
      : "This browser is blocking storage here, so products work " +
        "normally but will be lost when you refresh or close this page. " +
        "Open the file directly in Chrome, Edge or Firefox to keep them.";
  }

  /* ---------- Validation and calculation ---------- */

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

  function findProblem(product) {
    if (!product.name) {
      return { field: itemName, text: "Enter an item name." };
    }
    if (!product.type) {
      return { field: itemType, text: "Select an item type." };
    }
    if (!Number.isFinite(product.pricePerPack) || product.pricePerPack < 0.01) {
      return { field: pricePerPack, text: "Price per pack must be at least ₱0.01." };
    }
    if (!Number.isSafeInteger(product.numberOfPacks) || product.numberOfPacks < 1) {
      return { field: numberOfPacks, text: "Number of packs must be a whole number, 1 or more." };
    }
    if (!Number.isSafeInteger(product.itemsPerPack) || product.itemsPerPack < 1) {
      return { field: itemsPerPack, text: "Items per pack must be a whole number, 1 or more." };
    }
    if (!Number.isFinite(product.markup) || product.markup < 10 || product.markup > 100) {
      return { field: markup, text: "Markup must be between 10% and 100%." };
    }
    return null;
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

  /* ---------- Load and save ---------- */

  function loadProducts() {
    try {
      const saved = JSON.parse(readStorage() || "[]");

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

  // Saving never blocks the app: if the browser refuses storage,
  // the product still works for this session.
  function saveProducts(nextProducts) {
    if (writeStorage(JSON.stringify(nextProducts))) {
      storageAvailable = true;
    }
    updateStorageNote();
  }

  /* ---------- Live preview ---------- */

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

  /* ---------- Table and summary ---------- */

  let pendingDeleteId = null;
  let pendingDeleteTimer = null;

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
      const confirming = pendingDeleteId === product.id;

      button.type = "button";
      button.className = confirming ? "delete confirming" : "delete";
      button.dataset.id = product.id;
      button.textContent = confirming ? "Click to confirm" : "Delete";
      button.setAttribute(
        "aria-label",
        confirming
          ? `Confirm deleting ${product.name}`
          : `Delete ${product.name}`
      );

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

  /* ---------- Events ---------- */

  form.addEventListener("submit", event => {
    event.preventDefault();

    const product = getFormData();

    const problem = findProblem(product);

    if (problem) {
      showMessage(problem.text);
      problem.field.focus();
      return;
    }

    if (!isValidProduct(product)) {
      showMessage("Please check the values you entered.");
      return;
    }

    const duplicate = products.some(existing =>
      existing.name.toLowerCase() === product.name.toLowerCase() &&
      existing.type.toLowerCase() === product.type.toLowerCase()
    );

    if (duplicate) {
      showMessage("A product with the same name and type already exists.");
      return;
    }

    const result = calculate(product);

    if (!hasValidResults(result)) {
      showMessage("The values are too large. Please enter smaller amounts.");
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
      showMessage("The combined totals are too large.");
      return;
    }

    products = nextProducts;
    saveProducts(products);
    render();

    form.reset();
    markup.value = "10";
    updatePreview();
    showMessage(`"${result.name}" was added.`, "success");
    itemName.focus();
  });

  search.addEventListener("input", render);

  // Two-step delete: first click asks, second click confirms.
  table.addEventListener("click", event => {
    const button = event.target.closest("button.delete");
    if (!button) return;

    const id = button.dataset.id;
    const product = products.find(entry => entry.id === id);
    if (!product) return;

    clearTimeout(pendingDeleteTimer);

    if (pendingDeleteId !== id) {
      pendingDeleteId = id;
      render();

      pendingDeleteTimer = setTimeout(() => {
        pendingDeleteId = null;
        render();
      }, 4000);
      return;
    }

    pendingDeleteId = null;
    products = products.filter(entry => entry.id !== id);
    saveProducts(products);
    render();
    showMessage(`"${product.name}" was deleted.`, "success");
  });

  [
    pricePerPack,
    numberOfPacks,
    itemsPerPack,
    markup
  ].forEach(input => {
    input.addEventListener("input", updatePreview);
  });

  updateStorageNote();
  render();
  updatePreview();
})();
