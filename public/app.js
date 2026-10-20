const API_BASE_URL = "https://banking-api-app.onrender.com/api";

const TOKEN_KEY = "cedarBankToken";
const CUSTOMER_KEY = "cedarBankCustomer";

const bvnPage = document.querySelector("#bvn-page");
const bvnForm = document.querySelector("#bvn-form");
const authPage = document.querySelector("#auth-page");
const appShell = document.querySelector("#app-shell");
const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const accountForm = document.querySelector("#account-form");
const accountSetup = document.querySelector("#account-setup");
const accountContent = document.querySelector("#account-content");
const transferDialog = document.querySelector("#transfer-dialog");
const transferForm = document.querySelector("#transfer-form");
const toast = document.querySelector("#toast");

let customer = readSession(CUSTOMER_KEY);
let account = null;
let toastTimeout;
let nameEnquiryTimeout;

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function readSession(key) {
  try {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Unable to read ${key} from session storage`, error);
    return null;
  }
}

function showToast(message, kind = "success") {
  window.clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.toggle("error", kind === "error");
  toast.classList.add("visible");

  toastTimeout = window.setTimeout(
    () => toast.classList.remove("visible"),
    4200,
  );
}

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = sessionStorage.getItem(TOKEN_KEY);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response;

  try {
    const endpoint = `${API_BASE_URL}${path}`;

    response = await fetch(endpoint, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error("API connection error:", error);

    throw new ApiError(
      "Could not connect to Cedar Bank. Check your connection and try again.",
    );
  }

  let data = {};

  try {
    data = await response.json();
  } catch {
    if (response.ok) {
      throw new ApiError(
        "The server returned an unreadable response.",
        response.status,
      );
    }
  }

  if (!response.ok) {
    const validationMessage = Array.isArray(data.errors)
      ? data.errors
          .map((issue) => issue.message)
          .filter(Boolean)
          .join(". ")
      : "";

    throw new ApiError(
      validationMessage ||
        data.message ||
        "The request could not be completed.",
      response.status,
    );
  }

  return data;
}

function setBusy(form, busy, label) {
  const button = form.querySelector('button[type="submit"]');

  if (!button) return;

  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = label;
  } else if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
    delete button.dataset.originalText;
  }

  button.disabled = busy;
}

function setAuthMode(mode) {
  const isRegister = mode === "register";

  loginForm.classList.toggle("hidden", isRegister);
  registerForm.classList.toggle("hidden", !isRegister);

  document.querySelector("#login-tab").classList.toggle("active", !isRegister);
  document
    .querySelector("#register-tab")
    .classList.toggle("active", isRegister);

  document.querySelector("#auth-title").textContent = isRegister
    ? "Start with Cedar"
    : "Welcome back";

  document.querySelector("#auth-description").textContent = isRegister
    ? "Create your account with a few details. Identity verification is required."
    : "Sign in to your account to pick up where you left off.";
}

function formatNaira(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function setCustomerDetails() {
  const name = customer?.fullName || "Customer";
  const firstName = name.trim().split(/\s+/)[0];

  document.querySelector("#header-name").textContent = name;
  document.querySelector("#welcome-name").textContent =
    `Good day, ${firstName}`;
  document.querySelector("#user-avatar").textContent = firstName
    .charAt(0)
    .toUpperCase();

  document.querySelector("#today-date").textContent = new Intl.DateTimeFormat(
    "en-NG",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(new Date());
}

function setAccountDetails() {
  document.querySelector("#account-balance").textContent = formatNaira(
    account.balance,
  );

  document.querySelector("#bank-name").textContent =
    account.bankName || "Cedar Bank";

  document.querySelector("#account-number").textContent = account.accountNumber;

  document.querySelector("#transfer-from").value = account.accountNumber;
}

async function loadAccount() {
  try {
    const data = await apiRequest("/accounts/me");

    account = data.account;

    accountSetup.classList.add("hidden");
    accountContent.classList.remove("hidden");

    setAccountDetails();

    await loadTransactions();
  } catch (error) {
    if (error.status === 404) {
      account = null;
      accountContent.classList.add("hidden");
      accountSetup.classList.remove("hidden");
      return;
    }

    showToast(error.message, "error");
  }
}

function showDashboard() {
  bvnPage.classList.add("hidden");
  authPage.classList.add("hidden");
  appShell.classList.remove("hidden");
  accountSetup.classList.add("hidden");
  accountContent.classList.add("hidden");

  setCustomerDetails();

  void loadAccount();
}

function signOut() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(CUSTOMER_KEY);

  customer = null;
  account = null;

  accountSetup.classList.add("hidden");
  accountContent.classList.add("hidden");

  document.querySelector("#transaction-list").replaceChildren();

  bvnPage.classList.remove("hidden");
  authPage.classList.add("hidden");
  appShell.classList.add("hidden");

  loginForm.reset();
  registerForm.reset();
  bvnForm.reset();
}

function showAuth(mode) {
  bvnPage.classList.add("hidden");
  authPage.classList.remove("hidden");
  setAuthMode(mode);
}

function addTextCell(row, text, className) {
  const cell = document.createElement("td");

  if (className) cell.className = className;

  cell.textContent = text;
  row.append(cell);

  return cell;
}

function renderTransactions(transactions) {
  const list = document.querySelector("#transaction-list");
  const empty = document.querySelector("#empty-transactions");

  list.replaceChildren();

  if (!transactions.length) {
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");

  for (const transaction of transactions) {
    const outgoing = transaction.senderAccount === account.accountNumber;

    const row = document.createElement("tr");
    const kindCell = document.createElement("td");
    const kind = document.createElement("span");
    const icon = document.createElement("span");

    icon.className = "transaction-kind-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = outgoing ? "↗" : "↙";

    kind.className = "transaction-kind";

    kind.append(
      icon,
      document.createTextNode(outgoing ? "Transfer sent" : "Money received"),
    );

    kindCell.append(kind);
    row.append(kindCell);

    addTextCell(row, formatDate(transaction.createdAt));

    const referenceCell = addTextCell(
      row,
      transaction.reference || "—",
      "transaction-reference",
    );

    if (transaction.reference) {
      referenceCell.title = transaction.reference;
    }

    const statusCell = document.createElement("td");
    const status = document.createElement("span");

    const normalizedStatus = String(
      transaction.status || "PENDING",
    ).toLowerCase();

    status.className = `status-pill status-${normalizedStatus}`;
    status.textContent = normalizedStatus;

    statusCell.append(status);

    if (normalizedStatus === "pending" && transaction.reference) {
      const checkButton = document.createElement("button");

      checkButton.className = "status-check";
      checkButton.type = "button";
      checkButton.textContent = "Check";

      checkButton.addEventListener("click", () =>
        refreshTransactionStatus(transaction.reference),
      );

      statusCell.append(checkButton);
    }

    row.append(statusCell);

    const amount = document.createElement("td");

    amount.className = `amount-cell ${outgoing ? "amount-out" : "amount-in"}`;

    amount.textContent = `${
      outgoing ? "−" : "+"
    }${formatNaira(transaction.amount)}`;

    row.append(amount);
    list.append(row);
  }
}

async function loadTransactions() {
  try {
    const data = await apiRequest("/transactions/history");

    renderTransactions(
      Array.isArray(data.transactions) ? data.transactions : [],
    );
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function refreshTransactionStatus(reference) {
  try {
    await apiRequest(`/transactions/${encodeURIComponent(reference)}/status`);

    await loadTransactions();

    showToast("Transaction status updated.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function refreshBalance() {
  if (!account || !customer?.id) return;

  const button = document.querySelector("#refresh-balance");
  button.disabled = true;

  try {
    const data = await apiRequest(
      `/accounts/balance/${encodeURIComponent(account.accountNumber)}?customerId=${encodeURIComponent(customer.id)}`,
    );

    account.balance = data.account.balance;

    setAccountDetails();

    showToast("Your account balance is up to date.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

function openTransfer() {
  if (!account) return;

  transferForm.reset();

  document.querySelector("#transfer-from").value = account.accountNumber;

  document.querySelector("#recipient-preview").classList.add("hidden");

  transferDialog.showModal();
}

async function checkRecipient(accountNumber) {
  const preview = document.querySelector("#recipient-preview");

  if (!/^\d{10}$/.test(accountNumber)) {
    preview.classList.add("hidden");
    return;
  }

  try {
    const result = await apiRequest(
      `/accounts/name-enquiry/${encodeURIComponent(accountNumber)}`,
    );

    const details = result.data || result;

    preview.textContent = details.accountName
      ? `Recipient: ${details.accountName}`
      : "Account verified. Confirm the recipient name before continuing.";

    preview.classList.remove("hidden");
  } catch (error) {
    preview.textContent = error.message;
    preview.classList.remove("hidden");
  }
}

document
  .querySelector("#login-tab")
  .addEventListener("click", () => setAuthMode("login"));

document
  .querySelector("#register-tab")
  .addEventListener("click", () => setAuthMode("register"));

document.querySelector("#bvn-signin").addEventListener("click", () => {
  showAuth("login");
});
document.querySelector("#auth-back").addEventListener("click", () => {
  authPage.classList.add("hidden");
  bvnPage.classList.remove("hidden");
});

document.querySelector("#logout-button").addEventListener("click", signOut);
document
  .querySelector("#open-transfer")
  .addEventListener("click", openTransfer);
document.querySelector("#empty-send").addEventListener("click", openTransfer);

document
  .querySelector("#close-transfer")
  .addEventListener("click", () => transferDialog.close());

document
  .querySelector("#refresh-balance")
  .addEventListener("click", refreshBalance);
document
  .querySelector("#reload-transactions")
  .addEventListener("click", loadTransactions);

bvnForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  setBusy(bvnForm, true, "Creating BVN…");

  const details = Object.fromEntries(new FormData(bvnForm).entries());

  try {
    await apiRequest("/kyc/generate-test-bvn", {
      method: "POST",
      body: JSON.stringify(details),
    });

    showAuth("register");

    registerForm.elements.fullName.value =
      `${details.firstName} ${details.lastName}`.trim();
    registerForm.elements.phoneNumber.value = details.phone;
    registerForm.elements.identityType.value = "BVN";
    registerForm.elements.identityNumber.value = details.bvn;
    registerForm.elements.dateOfBirth.value = details.dob;

    showToast("BVN record created. Complete your account registration.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setBusy(bvnForm, false);
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  setBusy(loginForm, true, "Signing in…");

  const formData = new FormData(loginForm);

  try {
    const data = await apiRequest("/customers/login", {
      method: "POST",
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    sessionStorage.setItem(TOKEN_KEY, data.token);

    customer = data.customer;

    sessionStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));

    showDashboard();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setBusy(loginForm, false);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  setBusy(registerForm, true, "Verifying identity…");

  const formData = new FormData(registerForm);
  const details = Object.fromEntries(formData.entries());

  try {
    await apiRequest("/customers/register", {
      method: "POST",
      body: JSON.stringify(details),
    });

    registerForm.reset();

    setAuthMode("login");

    loginForm.elements.email.value = details.email;

    showToast("Identity verified and account created. Please sign in.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setBusy(registerForm, false);
  }
});

accountForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  setBusy(accountForm, true, "Creating account…");

  const formData = new FormData(accountForm);

  try {
    await apiRequest("/accounts/create", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });

    accountForm.reset();

    showToast("Your account is ready.");

    await loadAccount();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setBusy(accountForm, false);
  }
});

transferForm.elements.to.addEventListener("input", (event) => {
  window.clearTimeout(nameEnquiryTimeout);

  const number = event.target.value.trim();

  nameEnquiryTimeout = window.setTimeout(
    () => void checkRecipient(number),
    350,
  );
});

transferForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(transferForm);

  const recipientNumber = String(formData.get("to")).trim();
  const amount = Number(formData.get("amount"));

  if (!/^\d{10}$/.test(recipientNumber)) {
    showToast(
      "Recipient account number must contain exactly 10 digits.",
      "error",
    );
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    showToast("Enter a valid transfer amount.", "error");
    return;
  }

  const confirmed = window.confirm(
    `Send ${formatNaira(amount)} to account ${recipientNumber}?`,
  );

  if (!confirmed) return;

  setBusy(transferForm, true, "Submitting transfer…");

  try {
    const data = await apiRequest("/transfers", {
      method: "POST",
      body: JSON.stringify({
        from: account.accountNumber,
        to: recipientNumber,
        amount,
      }),
    });

    transferDialog.close();
    transferForm.reset();

    showToast(data.message || "Transfer submitted.");

    await Promise.all([loadTransactions(), refreshBalance()]);
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setBusy(transferForm, false);
  }
});

if (sessionStorage.getItem(TOKEN_KEY) && customer?.id) {
  showDashboard();
} else {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(CUSTOMER_KEY);
  customer = null;
  bvnPage.classList.remove("hidden");
  authPage.classList.add("hidden");
}
