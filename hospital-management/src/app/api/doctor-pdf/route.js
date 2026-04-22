import puppeteer from "puppeteer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const sanitizeFilename = (name) => {
  const base = String(name || "Doctor").trim() || "Doctor";
  return base
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
};

export async function GET(request) {
  const url = new URL(request.url);
  const prefill = url.searchParams.get("prefill");
  const companyId = url.searchParams.get("company_id") || "";

  if (!prefill) {
    return new Response("Missing prefill", { status: 400 });
  }

  let parsedPrefill = null;
  try {
    parsedPrefill = JSON.parse(prefill);
  } catch {
    return new Response("Invalid prefill", { status: 400 });
  }

  const rawHost =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const normalizedHost = rawHost
    ? rawHost.replace(/^0\.0\.0\.0(?=:\d+)?/, "127.0.0.1")
    : null;
  if (!normalizedHost) {
    return new Response("Missing host", { status: 400 });
  }

  const candidateOrigins = [
    `${proto}://${normalizedHost}`,
    "http://127.0.0.1:3012",
    "http://localhost:3012",
    "http://127.0.0.1:93",
    "http://localhost:93",
    "http://0.0.0.0:93",
  ];

  const buildTargetUrl = (origin) => {
    const target = new URL(`${origin}/hospital-management/signup_pdf/`);
    target.searchParams.set("prefill", JSON.stringify(parsedPrefill));
    if (companyId) {
      target.searchParams.set("company_id", companyId);
    }
    target.searchParams.set("auto_print", "false");
    return target.toString();
  };

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
    const page = await browser.newPage();

    let lastStatus = null;
    let loadedUrl = null;

    for (const origin of candidateOrigins) {
      const targetUrl = buildTargetUrl(origin);
      const response = await page.goto(targetUrl, {
        waitUntil: "domcontentloaded",
      });
      const status = response?.status() ?? null;
      lastStatus = status;
      loadedUrl = targetUrl;
      if (status && status < 400) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        break;
      }
    }

    if (lastStatus && lastStatus >= 400) {
      throw new Error(
        `Signup PDF page returned ${lastStatus} from ${loadedUrl}`,
      );
    }

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    const filename = `${sanitizeFilename(parsedPrefill?.fullName)}.pdf`;

    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    const message =
      error && typeof error.message === "string"
        ? `Failed to generate PDF: ${error.message}`
        : "Failed to generate PDF";
    return new Response(message, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
