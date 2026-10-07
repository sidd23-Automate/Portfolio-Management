import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.accept());
await page.goto("http://127.0.0.1:4173/Portfolio-Management/");
await page.getByRole("button", { name: "Settings", exact: true }).click();
await page.getByRole("button", { name: "Load demo portfolio" }).click();
await page.getByRole("button", { name: "Overview", exact: true }).click();
await page.locator(".recharts-pie-sector").first().waitFor();
await page.screenshot({ path: "/tmp/holdings-desktop.png", fullPage: true });
await page.reload();
await page.locator(".stat.feature strong").waitFor();
if ((await page.locator(".stat.feature strong").textContent()) !== "₹19,20,000")
  throw Error("Production persistence failed");
if (errors.length) throw Error(errors.join("; "));
console.log("Production base path, charts and refresh persistence passed");
await browser.close();
