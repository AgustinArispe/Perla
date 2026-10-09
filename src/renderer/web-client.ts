import type { BochaApi, Result, SystemStatus } from "../shared/contracts";
import { AppErrorSchema } from "../shared/contracts";
import type { WebSession, WebLogin } from "../shared/web";
let csrfToken: string | null = null;
async function readResult<T>(response: Response): Promise<Result<T>> {
  if (response.status === 401) {
    csrfToken = null;
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("bocha-session-expired"));
  }
  const invalidResponse = () =>
    new Error(
      "No se pudo leer la respuesta del servidor. Revisá el resultado antes de reintentar.",
    );
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw invalidResponse();
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw invalidResponse();
  const result = raw as Record<string, unknown>;
  if (result.ok === true && response.ok && Object.hasOwn(result, "value"))
    return { ok: true, value: result.value as T };
  if (result.ok === false) {
    const error = AppErrorSchema.safeParse(result.error);
    if (error.success) return { ok: false, error: error.data };
  }
  throw invalidResponse();
}
function headers(method: string, binary = false): Record<string, string> {
  return {
    ...(method !== "GET"
      ? {
          "content-type": binary
            ? "application/octet-stream"
            : "application/json",
        }
      : {}),
    ...(method !== "GET" && csrfToken ? { "x-csrf-token": csrfToken } : {}),
  };
}
export async function webRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<Result<T>> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      credentials: "same-origin",
      headers: headers(method),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error(
      "Se perdió la conexión. Revisá el resultado antes de reintentar.",
    );
  }
  const result = await readResult<T>(response);
  if (result.ok && (path === "/auth/session" || path === "/auth/login"))
    csrfToken = (result.value as WebSession | WebLogin).csrfToken;
  if (
    result.ok &&
    ["/auth/logout", "/auth/password", "/backups/restore"].includes(path)
  )
    csrfToken = null;
  return result;
}
export async function webValue<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const result = await webRequest<T>(path, method, body);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}
export async function webUpload<T>(path: string, file: File): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: headers("POST", true),
    body: file,
  });
  const result = await readResult<T>(response);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}
export async function downloadFile(
  path: string,
  filename: string,
): Promise<void> {
  const response = await fetch(`/api/v1${path}`, {
    credentials: "same-origin",
  });
  if (!response.ok) {
    const result = await readResult<never>(response);
    if (!result.ok) throw new Error(result.error.message);
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function queryString(input: object): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(input))
    if (value !== undefined && value !== null) query.set(key, String(value));
  return query.toString();
}
const get = <T>(path: string, input?: object) =>
  webRequest<T>(path + (input ? "?" + queryString(input) : ""));
const post = <T>(path: string, input: unknown = {}) =>
  webRequest<T>(path, "POST", input);
function selectCsv(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}
const health = () => get<SystemStatus>("/health");
export const webApi: BochaApi = {
  auth: {
    status: () => get("/auth/session"),
    bootstrap: async () => ({
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "La cuenta inicial debe configurarla el administrador.",
        retryable: false,
      },
    }),
    login: async (input) => {
      const r = await post<WebLogin>("/auth/login", input);
      return r.ok ? { ok: true, value: r.value.user } : r;
    },
    logout: () => post("/auth/logout"),
    changePassword: (input) => post("/auth/password", input),
    unlockUser: (input) => post("/auth/unlock-user", input),
  },
  system: { health, reconnect: health },
  dashboard: {
    monthly: (month) => get("/dashboard/monthly", { month }),
    compare: (input) => get("/dashboard/comparison", input),
  },
  notifications: {
    list: () => get("/notifications"),
    markRead: (input) => post("/notifications/read", input),
  },
  users: {
    list: () => get("/users"),
    save: (input) => post("/users", input),
    unlockUser: (input) => post("/auth/unlock-user", input),
  },
  products: {
    get: (id) => get("/products/" + encodeURIComponent(id)),
    search: (input) => get("/products", input),
    save: (input) => post("/products", input),
    setActive: (input) => post("/products/active", input),
    taxonomy: (input) => get("/products/taxonomy", input),
    saveCategory: (input) => post("/products/categories", input),
    saveBrand: (input) => post("/products/brands", input),
    findByBarcode: (code) => get("/barcodes/" + encodeURIComponent(code)),
    proposeInternalBarcode: () => post("/products/internal-barcode"),
    labels: (input) => get("/products/labels", input),
    createLabel: (input) => post("/products/labels", input),
    markLabelPrinted: (input) => post("/products/labels/printed", input),
    previewImport: async () => {
      const file = await selectCsv();
      if (!file) return { ok: true, value: null };
      if (file.size > 10 * 1024 * 1024)
        throw new Error("El archivo supera los 10 MB.");
      return post("/products/import/preview", {
        content: await file.text(),
        sourceName: file.name,
      });
    },
    applyImport: (input) => post("/products/import/apply", input),
  },
  pricing: {
    preview: (input) => post("/pricing/preview", input),
    confirm: (input) => post("/pricing/confirm", input),
  },
  promotions: {
    list: () => get("/promotions"),
    get: (id) => get("/promotions/" + encodeURIComponent(id)),
    save: (input) => post("/promotions", input),
  },
  checkout: {
    getDraft: () => get("/checkout/draft"),
    saveDraft: (input) => webRequest("/checkout/draft", "PUT", input),
    cancelDraft: (expectedRevision) =>
      post("/checkout/cancel", { expectedRevision }),
  },
  sales: {
    quote: (input) => post("/sales/quote", input),
    complete: (input) => post("/sales", input),
    findByCheckoutKey: (key) => get("/sales/by-key/" + encodeURIComponent(key)),
    detail: (id) => get("/sales/" + encodeURIComponent(id)),
    list: (input) => get("/sales", input),
    previewVoid: (id) =>
      get("/sales/" + encodeURIComponent(id) + "/void-preview"),
    void: (input) => post("/sales/void", input),
    previewReturn: (id) =>
      get("/sales/" + encodeURIComponent(id) + "/return-preview"),
    returnSale: (input) => post("/sales/returns", input),
    returns: (id) => get("/sales/" + encodeURIComponent(id) + "/returns"),
  },
  stock: {
    operation: (key) => get("/stock/operations/" + encodeURIComponent(key)),
    get: (id) => get("/stock/" + encodeURIComponent(id)),
    search: (input) => get("/stock", input),
    opening: (input) => post("/stock/opening", input),
    count: (input) => post("/stock/count", input),
    record: (input) => post("/stock/movement", input),
    listLow: (input) => get("/stock/low", input),
    movements: (input) => {
      const { productId, ...query } = input;
      return get(
        "/stock/" + encodeURIComponent(productId) + "/movements",
        query,
      );
    },
  },
  lots: {
    status: (id) => get("/products/" + encodeURIComponent(id) + "/lots"),
    enable: (id) =>
      post("/products/" + encodeURIComponent(id) + "/lots/enable"),
    reconcile: (input) =>
      post(
        "/products/" + encodeURIComponent(input.productId) + "/lots/reconcile",
        input,
      ),
    setBlocked: (input) =>
      post("/lots/" + encodeURIComponent(input.lotId) + "/status", input),
  },
  receipts: {
    create: (input) => post("/receipts", input),
    list: (input) => get("/receipts", input),
    markPrinted: (input) => post("/receipts/printed", input),
  },
  suppliers: {
    get: (id) => get("/suppliers/" + encodeURIComponent(id)),
    search: (input) => get("/suppliers", input),
    save: (input) => post("/suppliers", input),
    setActive: (input) => post("/suppliers/active", input),
  },
  supplierAccounts: {
    detail: (id) => get("/suppliers/" + encodeURIComponent(id) + "/account"),
    pay: (input) => post("/supplier-payments", input),
  },
  customers: {
    get: (id) => get("/customers/" + encodeURIComponent(id)),
    search: (input) => get("/customers", input),
    save: (input) => post("/customers", input),
    setActive: (input) => post("/customers/active", input),
    setCredit: (input) => post("/customers/credit", input),
  },
  customerAccounts: {
    detail: (id) => get("/customers/" + encodeURIComponent(id) + "/account"),
    collect: (input) => post("/customer-collections", input),
  },
  locations: {
    list: () => get("/locations"),
    save: (input) => post("/locations", input),
    assignTerminal: (input) => post("/locations/terminal", input),
    inventory: (input) => get("/locations/inventory", input),
    summary: (month) => get("/locations/summary", { month }),
  },
  transfers: {
    list: (input) => get("/transfers", input),
    detail: (id) => get("/transfers/" + encodeURIComponent(id)),
    dispatch: (input) => post("/transfers", input),
    receive: (input) => post("/transfers/receive", input),
    cancel: (input) => post("/transfers/cancel", input),
  },
  purchases: {
    getDraft: () => get("/purchases/draft"),
    saveDraft: (input) => webRequest("/purchases/draft", "PUT", input),
    cancelDraft: (expectedRevision) =>
      post("/purchases/draft/cancel", { expectedRevision }),
    receive: (input) => post("/purchases", input),
    findByReceiptKey: (key) =>
      get("/purchases/by-key/" + encodeURIComponent(key)),
    detail: (id) => get("/purchases/" + encodeURIComponent(id)),
    list: (input) => get("/purchases", input),
    previewVoid: (id) =>
      get("/purchases/" + encodeURIComponent(id) + "/void-preview"),
    void: (input) => post("/purchases/void", input),
    lastCost: (id) => get("/products/" + encodeURIComponent(id) + "/last-cost"),
  },
  costs: {
    get: (id) => get("/products/" + encodeURIComponent(id) + "/cost"),
    setReference: (input) =>
      webRequest(
        "/products/" + encodeURIComponent(input.productId) + "/cost",
        "PUT",
        input,
      ),
  },
};

export async function downloadExcel(input: {dataset:import('../shared/excel').ExcelDataset;filters:import('../shared/excel').ExcelFilters}) {
 const response=await fetch('/api/v1/exports/excel',{method:'POST',credentials:'same-origin',headers:headers('POST'),body:JSON.stringify(input)});
 if(!response.ok){const result=await readResult<never>(response);if(!result.ok)throw new Error(result.error.message);}
 const filename=response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1]??`perla-negra-${input.dataset}.xlsx`;
 const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
