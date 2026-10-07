import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("browser persistence, snapshots, editing, Excel and responsive navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Load demo portfolio" }).click();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.locator(".stat.feature strong")).toHaveText("₹19,20,000");
  await page.reload();
  await expect(page.locator(".stat.feature strong")).toHaveText("₹19,20,000");
  await page
    .getByRole("button", { name: "Save Portfolio Snapshot", exact: true })
    .click();
  await page.getByLabel("Note", { exact: true }).fill("Before edit");
  await page
    .getByRole("button", { name: "Save snapshot", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Holdings", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  await page.getByLabel("Holding nickname").fill("Renamed savings");
  await page.getByLabel("Value INR", { exact: true }).fill("250000");
  await page.getByRole("button", { name: "Save holding" }).click();
  await expect(
    page.getByText("Renamed savings", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save Portfolio Snapshot", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save snapshot", exact: true })
    .click();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Renamed", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Bank holding → Renamed savings")).toBeVisible();
  await page
    .getByRole("button", { name: "Import / Export", exact: true })
    .click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Excel workbook" }).click();
  const file = await downloaded;
  const path = await file.path();
  await page.getByLabel("Excel or CSV file").setInputFiles({
    name: "Holdings-export.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: await readFile(path!),
  });
  await page.getByRole("button", { name: "Preview records" }).click();
  await expect(
    page.getByText("0 new · 0 updated · 8 unchanged · 0 ambiguous · 0 invalid"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm and apply import" }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Holdings", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(8);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.locator(".stat.feature strong")).toHaveText("₹19,70,000");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/holdings-mobile.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("add, duplicate, delete and filter update balances", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await page.goto("./");
  await page
    .getByRole("button", { name: "+ Add Holding", exact: true })
    .click();
  await page.getByLabel("Institution / holding party").fill("Test Bank");
  await page.getByLabel("Holding nickname").fill("Savings one");
  await page.getByLabel("Value INR", { exact: true }).fill("1000");
  await page.getByRole("button", { name: "Save holding" }).click();
  await expect(page.locator(".stat.feature strong")).toHaveText("₹1,000");
  await page.getByRole("button", { name: "Holdings", exact: true }).click();
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await page.getByLabel("Holding nickname").fill("Savings two");
  await page.getByRole("button", { name: "Save holding" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Delete", exact: true })
    .first()
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("Cash");
  await expect(page.locator(".stat.feature strong")).toHaveText("₹0");
});
