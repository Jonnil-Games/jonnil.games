import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    ["GET", "HEAD"].includes(route.request().method())
      ? route.continue()
      : route.abort()
  );
});

async function shot(page, info, label) {
  const folder = process.env.BLOG_SCREENSHOTS;
  if (!folder) return;
  await fs.mkdir(folder, { recursive: true });
  await page.screenshot({
    path: path.join(
      folder,
      `${info.project.name}-${info.titlePath.join("-").replace(/[^a-z0-9-]/gi, "_")}-${label}.png`
    ),
    fullPage: true,
  });
}

for (const colorScheme of ["light", "dark"]) {
  for (const width of [390, 1440]) {
    test.describe(`${colorScheme}-${width}`, () => {
      test.use({ colorScheme, viewport: { width, height: 900 } });

      test("same-day posts follow publication time without changing displayed dates", async ({
        page,
      }, info) => {
        await page.goto("/blog/");
        const titles = await page
          .locator(".post-card .post-title:not([hidden])")
          .allTextContents();
        for (const suffix of ["119", "123"]) {
          const sticky = titles.findIndex((title) =>
            title.includes(`Sticky Paws 2026.10.${suffix}`)
          );
          const online = titles.findIndex((title) =>
            title.includes(`Jonnil Online 2026.10.${suffix}`)
          );
          expect(sticky).toBeGreaterThanOrEqual(0);
          expect(online).toBeGreaterThan(sticky);
        }
        for (const [slug, day] of [
          ["sticky-paws-2026-10-1192308-patch-notes", "19"],
          ["jonnil-online-2026-10-1191941-patch-notes", "19"],
          ["sticky-paws-2026-10-1232355-patch-notes", "23"],
        ]) {
          const date = page
            .locator(".post-card")
            .filter({ has: page.locator(`a[href='/blog/${slug}/']`) })
            .locator("time");
          await expect(date).toHaveAttribute("datetime", `2026-10-${day}`);
          await expect(date).toHaveText(`October ${day}, 2026`);
        }
        const feed = await (
          await page.request.get("/blog/recent-posts.json")
        ).json();
        const urls = await page
          .locator(".post-card .post-title:not([hidden])")
          .evaluateAll((links) =>
            links.map((link) => link.getAttribute("href"))
          );
        expect(feed.length).toBeGreaterThan(0);
        expect(feed.map((post) => post.url)).toEqual(
          urls.slice(0, feed.length)
        );
        await shot(page, info, "ordered");
      });

      for (const reducedMotion of ["reduce", "no-preference"]) {
        test(`category filtering removes gaps and unreachable links, ${reducedMotion}`, async ({
          page,
        }, info) => {
          await page.emulateMedia({ reducedMotion });
          await page.goto("/blog/");
          const cards = page.locator(".post-card");
          const total = await cards.count();
          const expected = await cards.evaluateAll(
            (nodes) =>
              nodes.filter((node) => node.dataset.categoryKey === "sticky paws")
                .length
          );
          expect(expected).toBeGreaterThan(0);
          expect(expected).toBeLessThan(total);
          await page.locator("#category-filter").selectOption("sticky paws");
          await expect(page.locator(".post-card:visible")).toHaveCount(
            expected
          );
          expect(
            await cards.evaluateAll((nodes) =>
              nodes.every((node) =>
                node.dataset.categoryKey === "sticky paws"
                  ? !node.hidden &&
                    !node.inert &&
                    getComputedStyle(node).opacity === "1"
                  : node.hidden &&
                    node.inert &&
                    getComputedStyle(node).display === "none" &&
                    node.getClientRects().length === 0
              )
            )
          ).toBe(true);
          const first = await page
            .locator(".post-card:visible")
            .first()
            .boundingBox();
          const grid = await page.locator(".post-grid").boundingBox();
          expect(Math.abs(first.x - grid.x)).toBeLessThan(2);
          expect(Math.abs(first.y - grid.y)).toBeLessThan(2);
          await shot(page, info, "filtered");
          await page.locator("#category-filter").focus();
          for (let i = 0; i < 10; i += 1) {
            await page.keyboard.press("Tab");
            expect(
              await page.evaluate(() =>
                Boolean(
                  document.activeElement.closest(".post-card") &&
                  document.activeElement.closest(".post-card").dataset
                    .categoryKey !== "sticky paws"
                )
              )
            ).toBe(false);
          }
          await page.locator("#category-filter").selectOption("news");
          await page.locator("#category-filter").selectOption("sticky paws");
          await expect(page.locator(".post-card:visible")).toHaveCount(
            expected
          );
          await page.locator("#category-filter").selectOption("");
          await expect(page.locator(".post-card:visible")).toHaveCount(total);
          await page.locator("#author-filter").selectOption("cyan");
          const byCyan = await cards.evaluateAll(
            (nodes) =>
              nodes.filter((node) => node.dataset.authorKey === "cyan").length
          );
          expect(byCyan).toBeLessThan(total);
          await expect(page.locator(".post-card:visible")).toHaveCount(byCyan);
          await page.locator("#author-filter").selectOption("");
          await page
            .locator("#blog-search")
            .fill("no-such-post-jonnil-regression");
          await expect(page.locator(".post-card:visible")).toHaveCount(0);
          await page.locator("#blog-search").fill("");
          await expect(page.locator(".post-card:visible")).toHaveCount(total);
        });
      }
    });
  }
}
