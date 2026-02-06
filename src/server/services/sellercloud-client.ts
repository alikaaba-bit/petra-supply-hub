import { format } from "date-fns";

interface AuthResponse {
  access_token: string;
}

interface PurchaseOrdersResponse {
  Items: any[];
  TotalResults: number;
}

interface InventoryResponse {
  ProductID: number;
  SKU: string;
  QuantityAvailable: number;
  QuantityOnHand: number;
  QuantityReserved: number;
  QuantityOnOrder: number;
  [key: string]: any;
}

interface GetPurchaseOrdersParams {
  pageNumber?: number;
  pageSize?: number;
  pOStatuses?: string[];
  createDateFrom?: Date;
  createDateTo?: Date;
}

export class SellerCloudClient {
  private baseUrl: string;
  private username: string;
  private password: string;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(baseUrl: string, username: string, password: string) {
    this.baseUrl = baseUrl;
    this.username = username;
    this.password = password;
  }

  /**
   * Authenticate with SellerCloud API and store token
   * Token is valid for 60 minutes per SellerCloud docs
   */
  async authenticate(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Username: this.username,
        Password: this.password,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `SellerCloud authentication failed: ${response.status} - ${errorText}`
      );
    }

    const data = (await response.json()) as AuthResponse;
    this.token = data.access_token;
    // Token valid for 60 minutes (3600 seconds)
    this.tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
  }

  /**
   * Check if token needs refresh (< 5 minutes remaining)
   */
  private needsTokenRefresh(): boolean {
    if (!this.token || !this.tokenExpiry) {
      return true;
    }
    const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
    return this.tokenExpiry.getTime() < fiveMinutesFromNow;
  }

  /**
   * Fetch with automatic retry, exponential backoff, and token refresh
   * Handles 429 rate limiting, 401 auth errors, 500/503 server errors
   */
  async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    maxRetries = 3
  ): Promise<Response> {
    // Ensure token is valid before making request
    if (this.needsTokenRefresh()) {
      await this.authenticate();
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
            ...(options.headers || {}),
          },
        });

        // Handle 429 rate limiting with exponential backoff + jitter
        if (response.status === 429) {
          if (attempt < maxRetries) {
            const backoff = Math.min(1000 * Math.pow(2, attempt), 8000);
            const jitter = Math.random() * 1000;
            await new Promise((resolve) =>
              setTimeout(resolve, backoff + jitter)
            );
            continue;
          }
          throw new Error(`Rate limit exceeded after ${maxRetries} retries`);
        }

        // Handle 401 auth errors - re-authenticate once
        if (response.status === 401) {
          if (attempt === 0) {
            await this.authenticate();
            continue;
          }
          throw new Error("Authentication failed after token refresh");
        }

        // Handle 500/503 server errors with backoff
        if (response.status === 500 || response.status === 503) {
          if (attempt < maxRetries) {
            const backoff = Math.min(1000 * Math.pow(2, attempt), 8000);
            await new Promise((resolve) => setTimeout(resolve, backoff));
            continue;
          }
          throw new Error(
            `Server error ${response.status} after ${maxRetries} retries`
          );
        }

        // Return successful response
        if (response.ok) {
          return response;
        }

        // Other errors - throw immediately
        const errorText = await response.text();
        throw new Error(
          `SellerCloud API error: ${response.status} - ${errorText}`
        );
      } catch (error) {
        // Network errors - retry with backoff
        if (attempt < maxRetries) {
          const backoff = Math.min(1000 * Math.pow(2, attempt), 8000);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }
        throw error;
      }
    }

    throw new Error(`Request failed after ${maxRetries} retries`);
  }

  /**
   * Get purchase orders with pagination and optional filters
   * Returns single page of results
   */
  async getPurchaseOrders(
    params: GetPurchaseOrdersParams = {}
  ): Promise<{ items: any[]; totalResults: number }> {
    const queryParams = new URLSearchParams({
      pageNumber: String(params.pageNumber ?? 1),
      pageSize: String(params.pageSize ?? 100),
    });

    // Add status filters
    if (params.pOStatuses?.length) {
      params.pOStatuses.forEach((status) => {
        queryParams.append("pOStatuses", status);
      });
    }

    // Add date range filters with SellerCloud format (MM/dd/yyyy HH:mm)
    if (params.createDateFrom) {
      const formatted = format(params.createDateFrom, "MM/dd/yyyy HH:mm");
      queryParams.set("createDateFrom", formatted);
    }

    if (params.createDateTo) {
      const formatted = format(params.createDateTo, "MM/dd/yyyy HH:mm");
      queryParams.set("createDateTo", formatted);
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/purchaseorders?${queryParams.toString()}`
    );

    const data = (await response.json()) as PurchaseOrdersResponse;

    return {
      items: data.Items ?? [],
      totalResults: data.TotalResults ?? 0,
    };
  }

  /**
   * Get all purchase orders by auto-paginating through results
   * Returns combined array of all items
   */
  async getAllPurchaseOrders(
    params: Omit<GetPurchaseOrdersParams, "pageNumber"> = {}
  ): Promise<any[]> {
    const allItems: any[] = [];
    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const { items, totalResults } = await this.getPurchaseOrders({
        ...params,
        pageNumber: currentPage,
        pageSize: params.pageSize ?? 100,
      });

      allItems.push(...items);

      const pageSize = params.pageSize ?? 100;
      hasMorePages = currentPage * pageSize < totalResults;
      currentPage++;
    }

    return allItems;
  }

  /**
   * Get inventory details for a product
   * Uses POST endpoint to avoid special character issues per research docs
   */
  async getInventoryForProduct(productId: string): Promise<InventoryResponse> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/Inventory/Details`,
      {
        method: "POST",
        body: JSON.stringify({ ProductID: productId }),
      }
    );

    return (await response.json()) as InventoryResponse;
  }
}

/**
 * Singleton factory for SellerCloud client
 * Reuses single instance across requests
 */
let clientInstance: SellerCloudClient | null = null;

export function getSellerCloudClient(): SellerCloudClient {
  if (!clientInstance) {
    const baseUrl = process.env.SELLERCLOUD_BASE_URL;
    const username = process.env.SELLERCLOUD_USERNAME;
    const password = process.env.SELLERCLOUD_PASSWORD;

    if (!baseUrl || !username || !password) {
      throw new Error(
        "SellerCloud credentials not configured. Set SELLERCLOUD_BASE_URL, SELLERCLOUD_USERNAME, SELLERCLOUD_PASSWORD in .env"
      );
    }

    clientInstance = new SellerCloudClient(baseUrl, username, password);
  }

  return clientInstance;
}
