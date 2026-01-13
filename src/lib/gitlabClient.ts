import "server-only";

export type Query = Record<string, string | number | boolean | undefined>;

const baseUrl = process.env.GITLAB_BASE_URL;
const token = process.env.GITLAB_TOKEN ?? "";

if (!baseUrl) throw new Error("Missing GITLAB_BASE_URL in .env.local");
if (!token) throw new Error("Missing GITLAB_TOKEN in .env.local");

export class GitlabError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: unknown
  ) {
    super(message);
  }
}

const MAX_RETRIES = 4;
const PER_PAGE = 100;

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const withQuery = (path: string, query?: Query) => {
  const url = new URL(baseUrl + path);

  if (query) {
    for (const [paramName, paramValue] of Object.entries(query)) {
      if (paramValue === undefined) continue;
      url.searchParams.set(paramName, String(paramValue));
    }
  }

  return url.toString();
};

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function readBody(response: Response): Promise<unknown> {
  const responseText = await response.text();
  return responseText ? safeJson(responseText) : null;
}

function retryDelayMs(response: Response): number {
  const retryAfterSeconds = Number(response.headers.get("retry-after") ?? "1");
  return Math.max(0, retryAfterSeconds) * 1000;
}

async function fetchJson<T>(url: string): Promise<T> {
  for (let attemptNumber = 0; attemptNumber <= MAX_RETRIES; attemptNumber += 1) {
    const response = await fetch(url, {
      headers: { "PRIVATE-TOKEN": token },
      cache: "no-store"
    });

    if (response.status === 429 && attemptNumber < MAX_RETRIES) {
      await sleep(retryDelayMs(response));
      continue;
    }

    const responseBody = await readBody(response);

    if (!response.ok) {
      throw new GitlabError(
        response.status,
        `GitLab request failed: ${response.status} ${response.statusText}`,
        responseBody
      );
    }

    return responseBody as T;
  }

  throw new Error("Unreachable");
}

export async function getOne<T>(path: string, query?: Query): Promise<T> {
  return fetchJson<T>(withQuery(path, query));
}

export async function getAllPages<T>(path: string, query?: Query): Promise<T[]> {
  const allItems: T[] = [];
  let pageNumber = 1;

  while (true) {
    const pageItems = await fetchJson<T[]>(
      withQuery(path, { ...query, per_page: PER_PAGE, page: pageNumber })
    );

    allItems.push(...pageItems);

    if (pageItems.length < PER_PAGE) break;
    pageNumber += 1;
  }

  return allItems;
}
