/**
 * Responsive-overflow guard — a real-browser regression test for the bug class
 * jsdom structurally cannot catch: horizontal overflow on narrow viewports.
 *
 * The console's session-era bugs ("the content area can be swiped sideways",
 * "the table is too wide") are all latent *horizontal scroll containers*: a box
 * with `overflow-y: auto` has its x-axis computed to `auto` per the CSS overflow
 * spec, so any content wider than the viewport becomes sideways-swipeable even
 * though the page edge is clipped. vitest/jsdom never lays out CSS, so only a
 * real browser at a real viewport finds these.
 *
 * For each route × mobile viewport this asserts:
 *   1. the document itself does not scroll horizontally, and
 *   2. no element is a horizontal scroll container (overflow-x auto/scroll with
 *      scrollWidth > clientWidth) — that is exactly the "swipe" the user feels.
 *
 * Runs against the console booted in full mock mode (KUMBUKA_API_MOCK=1 +
 * KUMBUKA_API_MOCK_SESSION=1) so it needs no backend or Keycloak. On failure it
 * prints the offending route, viewport, and the elements at fault.
 *
 * Run: `node e2e/responsive-overflow.mjs` with the app already serving at
 * BASE_URL (default http://127.0.0.1:3000). Designed for the official
 * mcr.microsoft.com/playwright container, where `playwright` resolves globally.
 */
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";

const ROUTES = [
  "/overview",
  "/scopes",
  "/scopes/global",
  "/scopes/atlas-web",
  "/settings",
  "/team",
  "/account",
];

// width × height. Covers small phones up to a small tablet / landscape phone,
// including the 720–900 band where the per-element mobile rules don't yet apply.
const VIEWPORTS = [
  { w: 320, h: 850 },
  { w: 360, h: 850 },
  { w: 390, h: 850 },
  { w: 414, h: 900 },
  { w: 768, h: 1024 },
];

// Class fragments for elements whose horizontal scroll is intentional (e.g. the
// entry type-filter chip strip is a deliberately swipeable row).
const ALLOW_XSCROLL = ["typefilters"];

/** Returns { docOverflow, scrollers } for the current page. */
async function probe(page) {
  return page.evaluate((allow) => {
    const doc = document.documentElement;
    const describe = (el) => {
      const cls = typeof el.className === "string" ? el.className.trim() : "";
      const id = el.id ? `#${el.id}` : "";
      return `${el.tagName.toLowerCase()}${id}${cls ? "." + cls.split(/\s+/).join(".") : ""}`;
    };
    const scrollers = [];
    for (const el of Array.from(document.querySelectorAll("*"))) {
      const cs = getComputedStyle(el);
      const ox = cs.overflowX;
      const scrollable = ox === "auto" || ox === "scroll";
      const overhang = el.scrollWidth - el.clientWidth;
      if (scrollable && overhang > 1) {
        const cls = typeof el.className === "string" ? el.className : "";
        if (allow.some((a) => cls.includes(a))) continue;
        scrollers.push({ el: describe(el), scrollW: el.scrollWidth, clientW: el.clientWidth });
      }
    }
    return {
      docOverflow: doc.scrollWidth - doc.clientWidth,
      docScrollW: doc.scrollWidth,
      docClientW: doc.clientWidth,
      scrollers,
    };
  }, allow_xscroll());
}

// playwright's evaluate serialises args; pass the allowlist through a thunk so
// the closure above stays a single expression.
function allow_xscroll() {
  return ALLOW_XSCROLL;
}

async function main() {
  const browser = await chromium.launch();
  const failures = [];
  let checks = 0;

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await context.newPage();
    for (const route of ROUTES) {
      const url = `${BASE_URL}${route}`;
      try {
        const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
        if (resp && resp.status() >= 400) {
          failures.push(`${route} @${vp.w}px → HTTP ${resp.status()}`);
          continue;
        }
      } catch (err) {
        failures.push(`${route} @${vp.w}px → navigation error: ${err.message}`);
        continue;
      }
      // Let layout settle (fonts, async content).
      await page.waitForTimeout(250);
      const { docOverflow, docScrollW, docClientW, scrollers } = await probe(page);
      checks++;

      if (docOverflow > 1) {
        failures.push(
          `${route} @${vp.w}px → document scrolls horizontally (scrollWidth=${docScrollW} > clientWidth=${docClientW})`,
        );
      }
      for (const s of scrollers) {
        failures.push(
          `${route} @${vp.w}px → swipeable element ${s.el} (scrollWidth=${s.scrollW} > clientWidth=${s.clientW})`,
        );
      }
    }
    await context.close();
  }

  await browser.close();

  console.log(`\nresponsive-overflow: ${checks} route×viewport checks against ${BASE_URL}`);
  if (failures.length > 0) {
    console.error(`\n✗ ${failures.length} horizontal-overflow issue(s):\n`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("✓ no horizontal overflow on any route × viewport\n");
}

main().catch((err) => {
  console.error("responsive-overflow harness crashed:", err);
  process.exit(1);
});
