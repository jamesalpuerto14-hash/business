"use strict";

const STORAGE_KEY = "product-profit-calculator.products.v1";

const form = document.getElementById("product-form");
const liveResult = document.getElementById("live-result");
const tableBody = document.getElementById("product-table-body");
const searchInput = document.getElementById("product-search");
const typeFilter = document.getElementById("type-filter");
const sortSelect = document.getElementById("sort-products");
const exportButton = document.getElementById("export-csv");
const toastRegion = document.getElementById("toast-region");

const totalProducts = document.getElementById("total-products");
const totalCostValue = document.getElementById("total-cost-value");
const totalProfitValue = document.getElementById("total-profit-value");
const averageRoi = document.getElementById("average-roi");
const totalCostDisplay = document.getElementById("total-cost-display");

const nameInput = document.getElementById("item-name");
const typeInput = document.getElementById("item-type");
const priceInput = document.getElementById("price-per-pack");
const packsInput = document.getElementById("number-of-packs");
const itemsInput = document.getElementById("items-per-pack");
const markupInput = document.getElementById("markup");

let products = loadProducts();

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const money = value => pesoFormatter.format(Number(value) || 0);

function loadProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (!Array.isArray(saved)) return [];
    return saved.filter(product => product && typeof product.id === "string");
  } catch {
    return [];
  }
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function createId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return `product-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function calculate(data) {
  const totalCost = data.pricePerPack * data.numberOfPacks;
  const totalItems = data.numberOfPacks * data.itemsPerPack;
  const costPerItem = totalItems > 0 ? totalCost / totalItems : 0;
  const sellingPrice = Math.ceil(costPerItem * (1 + data.markup / 100));
  const profitPerItem = sellingPrice - costPerItem;
  const totalProfit = profitPerItem * totalItems;

  return {
    ...data,
    totalCost,
    totalItems,
    costPerItem,
    sellingPrice,
    profitPerItem,
    totalProfit,
    roi: totalCost > 0 ? (totalProfit / totalCost) * 100 : 0
  };
}

function getFormData() {
  return {
    id: createId(),
    name: nameInput.value.trim(),
    type: typeInput.value,
    pricePerPack: Number(priceInput.value),
    numberOfPacks: Number(packsInput.value),
    itemsPerPack: Number(itemsInput.value),
    markup: Number(markupInput.value),
    createdAt: new Date().toISOString()
  };
}

function isValidProduct(product) {
  return (
    product.name.length > 0 &&
    product.type !== "" &&
    product.pricePerPack >= 1 &&
    Number.isInteger(product.numberOfPacks) &&
    product.numberOfPacks >= 1 &&
    Number.isInteger(product.itemsPerPack) &&
    product.itemsPerPack >= 1 &&
    product.markup >= 10 &&
    product.markup <= 100
  );
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  toastRegion.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("visible"));

  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function escapeText(text) {
  const element = document.createElement("span");
  element.textContent = text;
  return element.innerHTML;
}

function getVisibleProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedType = typeFilter.value;
  const sortValue = sortSelect.value;

  let visible = products.filter(product => {
    const matchesQuery =
      !query ||
      `${product.name} ${product.type}`.toLowerCase().includes(query);

    const matchesType = !selectedType || product.type === selectedType;

    return matchesQuery && matchesType;
  });

  const sorters = {
    newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    name: (a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
    "cost-desc": (a, b) => b.totalCost - a.totalCost,
    "profit-desc": (a, b) => b.totalProfit - a.totalProfit,
    "roi-desc": (a, b) => b.roi - a.roi
  };

  return visible.sort(sorters[sortValue] || sorters.newest);
}

function renderTypeFilter() {
  const current = typeFilter.value;
  const types = [...new Set(products.map(product => product.type))].sort();

  typeFilter.innerHTML =
    '<option value="">All types</option>' +
    types
      .map(type => `<option value="${escapeText(type)}">${escapeText(type)}</option>`)
      .join("");

  if (types.includes(current)) typeFilter.value = current;
}

function render() {
  renderTypeFilter();

  const visibleProducts = getVisibleProducts();
  tableBody.innerHTML = "";

  if (!visibleProducts.length) {
    const emptyRow = document.createElement("tr");
    const emptyCell = document.createElement("td");

    emptyCell.colSpan = 11;
    emptyCell.className = "empty-message";
    emptyCell.textContent = products.length
      ? "No matching products found."
      : "No products saved yet.";

    emptyRow.appendChild(emptyCell);
    tableBody.appendChild(emptyRow);
  }

  visibleProducts.forEach(product => {
    const row = document.createElement("tr");

    const values = [
      product.name,
      product.type,
      product.numberOfPacks,
      product.totalItems,
      money(product.totalCost),
      money(product.costPerItem),
      money(product.sellingPrice),
      money(product.profitPerItem),
      money(product.totalProfit),
      `${product.roi.toFixed(2)}%`
    ];

    values.forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    const actionCell = document.createElement("td");
    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "Delete";
    deleteButton.dataset.id = product.id;
    deleteButton.setAttribute(
      "aria-label",
      `Delete ${product.name}`
    );

    actionCell.appendChild(deleteButton);
    row.appendChild(actionCell);
    tableBody.appendChild(row);
  });

  const totalCost = products.reduce(
    (sum, product) => sum + Number(product.totalCost),
    0
  );

  const totalProfit = products.reduce(
    (sum, product) => sum + Number(product.totalProfit),
    0
  );

  const averageROI = products.length
    ? products.reduce((sum, product) => sum + Number(product.roi), 0) /
      products.length
    : 0;

  totalProducts.textContent = products.length;
  totalCostValue.textContent = money(totalCost);
  totalProfitValue.textContent = money(totalProfit);
  averageRoi.textContent = `${averageROI.toFixed(2)}%`;
}

function updatePreview() {
  const product = getFormData();

  totalCostDisplay.textContent = money(
    product.pricePerPack * product.numberOfPacks
  );

  if (!isValidProduct(product)) {
    liveResult.classList.add("hidden");
    liveResult.innerHTML = "";
    return;
  }

  const calculation = calculate(product);

  liveResult.classList.remove("hidden");
  liveResult.innerHTML = `
    <h3>Automatic calculation</h3>
    <p><strong>Item:</strong> ${escapeText(calculation.name)}</p>
    <p><strong>Total items:</strong> ${calculation.totalItems}</p>
    <p><strong>Total purchase price:</strong> ${money(calculation.totalCost)}</p>
    <p><strong>Cost per item:</strong> ${money(calculation.costPerItem)}</p>
    <p><strong>Selling price per item:</strong> ${money(calculation.sellingPrice)}</p>
    <p><strong>Expected total profit:</strong> ${money(calculation.totalProfit)}</p>
    <p><strong>ROI:</strong> ${calculation.roi.toFixed(2)}%</p>
  `;
}

function exportCsv() {
  if (!products.length) {
    showToast("Add at least one product before exporting.", "error");
    return;
  }

  const headers = [
    "Name",
    "Type",
    "Packs",
    "Items per pack",
    "Total items",
    "Total cost",
    "Cost per item",
    "Selling price",
    "Profit per item",
    "Total profit",
    "ROI (%)"
  ];

  const rows = products.map(product => [
    product.name,
    product.type,
    product.numberOfPacks,
    product.itemsPerPack,
    product.totalItems,
    product.totalCost.toFixed(2),
    product.costPerItem.toFixed(2),
    product.sellingPrice.toFixed(2),
    product.profitPerItem.toFixed(2),
    product.totalProfit.toFixed(2),
    product.roi.toFixed(2)
  ]);

  const csv = [headers, ...rows]
    .map(row =>
      row
        .map(value => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8;"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "product-cost-profit-report.csv";
  link.click();
  URL.revokeObjectURL(link.href);

  showToast("CSV report downloaded.");
}

[
  nameInput,
  typeInput,
  priceInput,
  packsInput,
  itemsInput,
  markupInput
].forEach(input => {
  input.addEventListener("input", updatePreview);
  input.addEventListener("change", updatePreview);
});

form.addEventListener("submit", event => {
  event.preventDefault();

  const product = getFormData();

  if (!isValidProduct(product)) {
    showToast("Please complete all fields with valid values.", "error");
    return;
  }

  const duplicate = products.some(
    existing =>
      existing.name.toLowerCase() === product.name.toLowerCase() &&
      existing.type === product.type
  );

  if (duplicate) {
    showToast("A product with the same name and type already exists.", "error");
    return;
  }

  products.push(calculate(product));

  saveProducts();
  render();
  form.reset();
  markupInput.value = "10";
  totalCostDisplay.textContent = money(0);
  liveResult.classList.add("hidden");
  liveResult.innerHTML = "";

  showToast(`${product.name} was added.`);
  nameInput.focus();
});

form.addEventListener("reset", () => {
  setTimeout(() => {
    markupInput.value = "10";
    totalCostDisplay.textContent = money(0);
    liveResult.classList.add("hidden");
    liveResult.innerHTML = "";
  });
});

searchInput.addEventListener("input", render);
typeFilter.addEventListener("change", render);
sortSelect.addEventListener("change", render);
exportButton.addEventListener("click", exportCsv);

tableBody.addEventListener("click", event => {
  const button = event.target.closest(".delete-btn");

  if (!button) return;

  const productId = button.dataset.id;
  const product = products.find(item => item.id === productId);

  if (!product) return;

  const confirmed = window.confirm(
    `Delete “${product.name}”? This cannot be undone.`
  );

  if (!confirmed) return;

  products = products.filter(item => item.id !== productId);

  saveProducts();
  render();
  showToast(`${product.name} was deleted.`);
});

render();