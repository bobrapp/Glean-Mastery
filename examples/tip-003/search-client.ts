/**
 * Minimal, dependency-free typed Glean search client (tip-003).
 *
 * Illustrative example for the curriculum. Verified against: retrieval_basics.
 * The token is read from the environment — never hard-code credentials.
 */

export interface SearchOptions {
  /** The user's query string. */
  query: string;
  /** Max results to return (default 10). */
  pageSize?: number;
  /** Optional datasource filter, e.g. ["drive", "confluence"]. */
  sources?: string[];
  /** Opaque cursor for paging through results. */
  cursor?: string;
}

export interface SearchResultItem {
  id: string;
  title: string;
  url: string;
  snippet?: string;
}

export interface SearchResponse {
  results: SearchResultItem[];
  /** Present when more results are available. */
  cursor?: string;
}

export interface GleanSearchClientConfig {
  /** Bearer token. Defaults to process.env.GLEAN_API_TOKEN. */
  token?: string;
  /** API base URL. Defaults to process.env.GLEAN_API_BASE. */
  baseUrl?: string;
  /** Injectable fetch (for tests). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

export class GleanSearchClient {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: GleanSearchClientConfig = {}) {
    this.token = config.token ?? process.env.GLEAN_API_TOKEN ?? "";
    this.baseUrl =
      config.baseUrl ??
      process.env.GLEAN_API_BASE ??
      "https://your-domain-be.glean.com/rest/api/v1";
    this.fetchImpl = config.fetchImpl ?? fetch;

    if (!this.token) {
      throw new Error("GLEAN_API_TOKEN is required (do not hard-code it).");
    }
  }

  async search(opts: SearchOptions): Promise<SearchResponse> {
    const res = await this.fetchImpl(`${this.baseUrl}/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: opts.query,
        pageSize: opts.pageSize ?? 10,
        ...(opts.sources ? { requestOptions: { datasourceFilter: opts.sources } } : {}),
        ...(opts.cursor ? { cursor: opts.cursor } : {}),
      }),
    });

    if (!res.ok) {
      throw new Error(`Glean search failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as { results?: unknown[]; cursor?: string };

    return {
      results: (data.results ?? []).map((raw) => {
        const r = raw as Record<string, any>;
        const doc = (r.document ?? {}) as Record<string, any>;
        return {
          id: String(r.id ?? doc.id ?? ""),
          title: String(r.title ?? doc.title ?? ""),
          url: String(r.url ?? doc.url ?? ""),
          snippet: r.snippet ?? r.snippets?.[0]?.text,
        };
      }),
      cursor: data.cursor,
    };
  }
}
