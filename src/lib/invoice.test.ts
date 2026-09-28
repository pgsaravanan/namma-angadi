import { describe, expect, it } from "vitest";
import { buildInvoice, financialYear, invoiceNumberText, rupeesInWords } from "./invoice";

describe("rupeesInWords", () => {
  it("uses the Indian number system", () => {
    expect(rupeesInWords(160000)).toBe("One Thousand Six Hundred Rupees Only");
    expect(rupeesInWords(1234567_89)).toBe("Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Rupees and Eighty Nine Paise Only");
    expect(rupeesInWords(2_00_00_000_00)).toBe("Two Crore Rupees Only");
  });
});

describe("invoice numbers", () => {
  it("follow the April–March financial year in India", () => {
    expect(financialYear(new Date("2026-03-31T20:00:00Z"))).toBe("2026-27");
    expect(financialYear(new Date("2026-03-31T10:00:00Z"))).toBe("2025-26");
    expect(invoiceNumberText({ invoiceNumber: 7, paidAt: new Date("2026-09-28T10:00:00Z") })).toBe("INV/2026-27/0007");
  });
});

const baseOrder = {
  discountPaise: 0,
  deliveryFeePaise: 0,
  totalPaise: 10500,
  state: "Tamil Nadu",
  deliveryMethod: "delivery",
  sellerGstin: "33ABCDE1234F1Z5",
  invoiceNumber: 1,
  paidAt: new Date("2026-09-28T10:00:00Z"),
  items: [{ name: "Rasa podi (500 g)", hsnCode: "0910", quantity: 1, unitPricePaise: 10500, gstRate: 5 }],
};

describe("buildInvoice", () => {
  it("splits inclusive GST into CGST and SGST within the state", () => {
    const invoice = buildInvoice(baseOrder, { shopState: "Tamil Nadu", defaultGstRate: 5 });
    expect(invoice.title).toBe("Tax Invoice");
    expect(invoice.lines[0]).toMatchObject({ taxablePaise: 10000, cgstPaise: 250, sgstPaise: 250, igstPaise: 0 });
  });

  it("uses IGST for delivery to another state", () => {
    const invoice = buildInvoice({ ...baseOrder, state: "Kerala" }, { shopState: "Tamil Nadu", defaultGstRate: 5 });
    expect(invoice.lines[0]).toMatchObject({ igstPaise: 500, cgstPaise: 0 });
  });

  it("spreads a discount across lines and adds delivery", () => {
    const invoice = buildInvoice(
      {
        ...baseOrder,
        discountPaise: 1000,
        deliveryFeePaise: 4000,
        totalPaise: 23000,
        items: [
          { name: "A", hsnCode: null, quantity: 1, unitPricePaise: 10000, gstRate: 5 },
          { name: "B", hsnCode: null, quantity: 1, unitPricePaise: 10000, gstRate: 5 },
        ],
      },
      { shopState: "Tamil Nadu", defaultGstRate: 5 },
    );
    expect(invoice.lines.map((line) => line.totalPaise)).toEqual([9500, 9500, 4000]);
    expect(invoice.lines.reduce((sum, line) => sum + line.totalPaise, 0)).toBe(23000);
  });

  it("is a bill of supply without tax when the seller has no GSTIN", () => {
    const invoice = buildInvoice({ ...baseOrder, sellerGstin: null }, { shopState: "Tamil Nadu", defaultGstRate: 5 });
    expect(invoice.title).toBe("Bill of Supply");
    expect(invoice.lines[0]).toMatchObject({ taxablePaise: 10500, cgstPaise: 0, rate: 0 });
  });
});
