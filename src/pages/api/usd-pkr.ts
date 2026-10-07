import type { APIRoute } from "astro";
import { getCache } from "@vercel/functions";

export const prerender = false;

const CACHE_KEY = "usd-pkr-rate-v1";
const FRESH_FOR_MS = 24 * 60 * 60 * 1000;
const RETAIN_FOR_SECONDS = 7 * 24 * 60 * 60;
const FALLBACK_RATE = 277;
const RATE_ENDPOINT = "https://open.er-api.com/v6/latest/USD";
const RATE_SOURCE = "ExchangeRate-API";
const RATE_SOURCE_URL = "https://www.exchangerate-api.com";

type CacheStatus = "hit" | "miss" | "stale" | "fallback";

interface CachedRate {
	rate: number;
	fetchedAt: string;
	updatedAt: string;
	source: string;
	sourceUrl: string;
}

interface ExchangeRateResponse {
	result?: string;
	time_last_update_unix?: number;
	rates?: {
		PKR?: number;
	};
}

function isCachedRate(value: unknown): value is CachedRate {
	if (!value || typeof value !== "object") return false;

	const rate = value as Partial<CachedRate>;

	return (
		typeof rate.rate === "number" &&
		Number.isFinite(rate.rate) &&
		rate.rate > 0 &&
		typeof rate.fetchedAt === "string" &&
		Number.isFinite(Date.parse(rate.fetchedAt)) &&
		typeof rate.updatedAt === "string" &&
		typeof rate.source === "string" &&
		typeof rate.sourceUrl === "string"
	);
}

function json(rate: CachedRate, cacheStatus: CacheStatus) {
	return Response.json(
		{
			base: "USD",
			quote: "PKR",
			...rate,
			cacheStatus,
		},
		{
			headers: {
				"Cache-Control": "no-store",
				"X-Rate-Cache": cacheStatus,
			},
		},
	);
}

export const GET: APIRoute = async () => {
	const cache = getCache({ namespace: "calculators" });
	let cachedRate: CachedRate | null = null;

	try {
		const cached = await cache.get(CACHE_KEY);
		if (isCachedRate(cached)) cachedRate = cached;
	} catch (error) {
		console.error("Unable to read the USD/PKR rate cache.", error);
	}

	if (
		cachedRate &&
		Date.now() - Date.parse(cachedRate.fetchedAt) < FRESH_FOR_MS
	) {
		return json(cachedRate, "hit");
	}

	try {
		const response = await fetch(RATE_ENDPOINT, {
			headers: { Accept: "application/json" },
			signal: AbortSignal.timeout(5_000),
		});

		if (!response.ok) {
			throw new Error(`Exchange-rate request failed with ${response.status}.`);
		}

		const data = (await response.json()) as ExchangeRateResponse;
		const rate = data.rates?.PKR;

		if (data.result !== "success" || !rate || !Number.isFinite(rate)) {
			throw new Error("Exchange-rate response did not include a valid PKR rate.");
		}

		const fetchedAt = new Date().toISOString();
		const updatedAt = data.time_last_update_unix
			? new Date(data.time_last_update_unix * 1000).toISOString()
			: fetchedAt;
		const freshRate: CachedRate = {
			rate,
			fetchedAt,
			updatedAt,
			source: RATE_SOURCE,
			sourceUrl: RATE_SOURCE_URL,
		};

		try {
			await cache.set(CACHE_KEY, freshRate, {
				name: "USD to PKR exchange rate",
				tags: ["exchange-rates", "usd-pkr"],
				ttl: RETAIN_FOR_SECONDS,
			});
		} catch (error) {
			console.error("Unable to cache the USD/PKR rate.", error);
		}

		return json(freshRate, "miss");
	} catch (error) {
		console.error("Unable to refresh the USD/PKR rate.", error);

		if (cachedRate) return json(cachedRate, "stale");

		const now = new Date().toISOString();
		return json(
			{
				rate: FALLBACK_RATE,
				fetchedAt: now,
				updatedAt: now,
				source: "Built-in fallback",
				sourceUrl: RATE_SOURCE_URL,
			},
			"fallback",
		);
	}
};
