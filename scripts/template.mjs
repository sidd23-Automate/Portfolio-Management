import ExcelJS from "exceljs";
const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("Holdings");
sheet.addRow([
  "Holding ID",
  "Category",
  "Institution",
  "Holding Name",
  "Owner",
  "Account Reference",
  "Value INR",
  "Valuation Date",
  "Liquidity Class",
  "Exposure Class",
  "Quantity",
  "Unit Price",
  "Maturity Date",
  "Notes",
  "Custodian / Platform",
  "Equity Allocation %",
  "Premature Withdrawal",
  "Lock-in Details",
]);
sheet.addRow([
  "",
  "Bank",
  "Example Bank",
  "Savings account",
  "",
  "",
  200000,
  "2026-01-01",
  "Liquid",
  "Cash / Deposit",
  "",
  "",
  "",
  "Illustrative example; remove before import",
]);
sheet.getRow(1).font = { bold: true };
sheet.columns.forEach((c) => (c.width = 24));
const notes = workbook.addWorksheet("Read me");
for (const note of [
  "Required: Category, Institution, Holding Name, Value INR OR Quantity and Unit Price.",
  "Default categories: Bank, Cash, FD, Shares, Mutual Fund, Gold, NPS, PPF, Others. Add custom categories in Settings first.",
  "Liquidity: Liquid | Redeemable with conditions | Locked-in | Other / Unclassified",
  "Exposure: Cash / Deposit | Equity | Debt | Gold | Mixed | Other / Unclassified",
  "Dates: YYYY-MM-DD or Excel dates. Blank valuation dates use import date.",
  "Stable Holding IDs match updates and renames. Blank IDs match category + institution + name + owner + reference.",
  "Blank amounts and negatives are rejected. Manual and quantity valuations must agree.",
  "Optional fields can be blank. Imported files remain on your device.",
])
  notes.addRow([note]);
notes.getColumn(1).width = 130;
await workbook.xlsx.writeFile("public/Holdings-template.xlsx");
