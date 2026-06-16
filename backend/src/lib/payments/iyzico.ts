// iyzico Checkout Form provider (no SDK dependency — REST + node crypto).
//
// Auth: iyzico "IYZWSv2" HmacSHA256 scheme.
//   randomKey  = `${ms}${random}`
//   payload    = randomKey + uriPath + requestBody
//   signature  = HMAC_SHA256(payload, secretKey) as hex
//   authString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`
//   Authorization: `IYZWSv2 ${base64(authString)}`
//
// Only invoked when IYZICO_API_KEY / IYZICO_SECRET_KEY are present (guarded by
// shopConfig.isCardConfigured). All amounts are sent as decimal strings in TRY.

import crypto from "node:crypto";

export interface IyzicoBuyer {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  address: string;
}

export interface IyzicoBasketItem {
  id: string;
  name: string;
  category: string;
  price: string; // decimal string
}

export interface InitCheckoutInput {
  conversationId: string; // our order number
  price: string; // basket total (sum of item prices), decimal string
  paidPrice: string; // amount actually charged (incl. shipping), decimal string
  callbackUrl: string;
  buyer: IyzicoBuyer;
  basketItems: IyzicoBasketItem[];
}

export interface InitCheckoutResult {
  status: "success" | "failure";
  token?: string;
  paymentPageUrl?: string;
  errorMessage?: string;
}

export interface RetrieveResult {
  status: "success" | "failure";
  paymentStatus?: string; // "SUCCESS" when paid
  paymentId?: string;
  conversationId?: string;
  errorMessage?: string;
}

function baseUrl(): string {
  return process.env.IYZICO_BASE_URL?.trim() || "https://sandbox-api.iyzipay.com";
}

function credentials(): { apiKey: string; secretKey: string } {
  const apiKey = process.env.IYZICO_API_KEY?.trim() ?? "";
  const secretKey = process.env.IYZICO_SECRET_KEY?.trim() ?? "";
  return { apiKey, secretKey };
}

function authHeaders(uriPath: string, body: string): Record<string, string> {
  const { apiKey, secretKey } = credentials();
  const randomKey = `${Date.now()}${crypto.randomBytes(4).toString("hex")}`;
  const payload = randomKey + uriPath + body;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(payload, "utf8")
    .digest("hex");
  const authString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`;
  const authorization = `IYZWSv2 ${Buffer.from(authString).toString("base64")}`;
  return {
    Authorization: authorization,
    "x-iyzi-rnd": randomKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function post<T>(uriPath: string, payload: unknown): Promise<T> {
  const body = JSON.stringify(payload);
  const res = await fetch(`${baseUrl()}${uriPath}`, {
    method: "POST",
    headers: authHeaders(uriPath, body),
    body,
  });
  return (await res.json()) as T;
}

export async function initCheckoutForm(
  input: InitCheckoutInput,
): Promise<InitCheckoutResult> {
  const uriPath = "/payment/iyzipos/checkoutform/initialize/auth/ecom";
  const payload = {
    locale: "tr",
    conversationId: input.conversationId,
    price: input.price,
    paidPrice: input.paidPrice,
    currency: "TRY",
    basketId: input.conversationId,
    paymentGroup: "PRODUCT",
    callbackUrl: input.callbackUrl,
    enabledInstallments: [1, 2, 3, 6, 9],
    buyer: {
      id: input.buyer.id,
      name: input.buyer.name,
      surname: input.buyer.surname,
      email: input.buyer.email,
      gsmNumber: input.buyer.phone,
      identityNumber: "11111111111",
      registrationAddress: input.buyer.address,
      city: input.buyer.city,
      country: input.buyer.country,
      ip: "0.0.0.0",
    },
    shippingAddress: {
      contactName: `${input.buyer.name} ${input.buyer.surname}`,
      city: input.buyer.city,
      country: input.buyer.country,
      address: input.buyer.address,
    },
    billingAddress: {
      contactName: `${input.buyer.name} ${input.buyer.surname}`,
      city: input.buyer.city,
      country: input.buyer.country,
      address: input.buyer.address,
    },
    basketItems: input.basketItems.map((it) => ({
      id: it.id,
      name: it.name,
      category1: it.category,
      itemType: "PHYSICAL",
      price: it.price,
    })),
  };

  try {
    const result = await post<{
      status: string;
      token?: string;
      paymentPageUrl?: string;
      errorMessage?: string;
    }>(uriPath, payload);
    if (result.status === "success") {
      return {
        status: "success",
        token: result.token,
        paymentPageUrl: result.paymentPageUrl,
      };
    }
    return { status: "failure", errorMessage: result.errorMessage ?? "init_failed" };
  } catch (err) {
    return {
      status: "failure",
      errorMessage: err instanceof Error ? err.message : "init_error",
    };
  }
}

export async function retrieveCheckoutResult(token: string): Promise<RetrieveResult> {
  const uriPath = "/payment/iyzipos/checkoutform/auth/ecom/detail";
  try {
    const result = await post<{
      status: string;
      paymentStatus?: string;
      paymentId?: string;
      conversationId?: string;
      errorMessage?: string;
    }>(uriPath, { locale: "tr", token });
    return {
      status: result.status === "success" ? "success" : "failure",
      paymentStatus: result.paymentStatus,
      paymentId: result.paymentId,
      conversationId: result.conversationId,
      errorMessage: result.errorMessage,
    };
  } catch (err) {
    return {
      status: "failure",
      errorMessage: err instanceof Error ? err.message : "retrieve_error",
    };
  }
}
