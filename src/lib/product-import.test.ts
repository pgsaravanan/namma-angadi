import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "./csv";
import { parsePriceToPaise, readProductCsv } from "./product-import";

describe("parseCsv", () => {
  it("handles quotes, embedded commas, newlines and a byte-order mark", () => {
    const text = '﻿name,description\r\n"Murukku, 250 g","Crispy\nand fresh"\n"Say ""hi""",x\n';
    expect(parseCsv(text)).toEqual([
      ["name", "description"],
      ["Murukku, 250 g", "Crispy\nand fresh"],
      ['Say "hi"', "x"],
    ]);
  });

  it("round-trips through toCsv", () => {
    const rows = [["a,b", 'c"d'], ["e", "f\ng"]];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});

describe("parsePriceToPaise", () => {
  it("understands Indian price formats", () => {
    expect(parsePriceToPaise("₹1,299.50")).toBe(129950);
    expect(parsePriceToPaise("120.00 INR")).toBe(12000);
    expect(parsePriceToPaise("Rs. 80")).toBe(8000);
    expect(parsePriceToPaise("free")).toBeNull();
  });
});

describe("readProductCsv", () => {
  it("reads our template columns", () => {
    const { products, issues } = readProductCsv("name,price,stock,visible\nMurukku,120,25,yes\nLadoo,90,,no", 10);
    expect(issues).toEqual([]);
    expect(products).toMatchObject([
      { name: "Murukku", pricePaise: 12000, stock: 25, isActive: true, line: 2 },
      { name: "Ladoo", pricePaise: 9000, stock: 10, isActive: false, line: 3 },
    ]);
  });

  it("reads a Meta Commerce Manager export", () => {
    const text =
      "id,title,description,availability,condition,price,image_link\n" +
      "1,Adhirasam,Jaggery sweet,in stock,new,180.00 INR,https://example.com/a.jpg\n" +
      "2,Thattai,Spicy,out of stock,new,60.00 INR,";
    const { products } = readProductCsv(text, 5);
    expect(products).toMatchObject([
      { name: "Adhirasam", pricePaise: 18000, stock: 5, imageUrl: "https://example.com/a.jpg" },
      { name: "Thattai", pricePaise: 6000, stock: 0, imageUrl: null },
    ]);
  });

  it("reports bad rows with their line numbers and keeps the good ones", () => {
    const { products, issues } = readProductCsv("name,price,image_url\nOk item,50,\nX,50,\nBad price,abc,\nLink,50,http://x.com/a.jpg", 1);
    expect(products.map((product) => product.name)).toEqual(["Ok item"]);
    expect(issues.map((issue) => issue.line)).toEqual([3, 4, 5]);
  });

  it("requires name and price columns", () => {
    expect(readProductCsv("foo,bar\n1,2", 1).issues[0].message).toMatch(/name/);
  });
});
