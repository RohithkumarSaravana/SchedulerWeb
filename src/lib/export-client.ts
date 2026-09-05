"use client";

import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

async function nodeToDataUrl(node: HTMLElement): Promise<string> {
  // two passes: fonts/layout can shift after the first capture
  await toPng(node, { pixelRatio: 2, backgroundColor: getComputedBg(node) });
  return toPng(node, { pixelRatio: 2, backgroundColor: getComputedBg(node) });
}

function getComputedBg(node: HTMLElement): string {
  const bg = getComputedStyle(node).backgroundColor;
  return bg && bg !== "rgba(0, 0, 0, 0)" ? bg : "#ffffff";
}

export async function downloadNodeAsPng(node: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await nodeToDataUrl(node);
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function downloadNodeAsPdf(node: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await nodeToDataUrl(node);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not load captured image"));
    img.src = dataUrl;
  });
  const orientation = img.width >= img.height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "pt", format: [img.width, img.height] });
  pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
  pdf.save(filename);
}
