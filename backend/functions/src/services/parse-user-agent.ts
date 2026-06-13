export type ParsedUserAgent = {
  device: "Mobile" | "Tablet" | "Desktop" | "Unknown";
  browser: string;
};

export function parseUserAgent(raw: unknown): ParsedUserAgent {
  const ua = String(raw || "").trim();
  if (!ua || ua === "unknown") {
    return { device: "Unknown", browser: "Unknown" };
  }

  let device: ParsedUserAgent["device"] = "Desktop";
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) {
    device = "Tablet";
  } else if (
    /Mobile|iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      ua,
    )
  ) {
    device = "Mobile";
  }

  let browser = "Other";
  if (/Edg\//i.test(ua)) {
    browser = "Edge";
  } else if (/OPR\/|Opera/i.test(ua)) {
    browser = "Opera";
  } else if (/SamsungBrowser\//i.test(ua)) {
    browser = "Samsung Internet";
  } else if (/Firefox\//i.test(ua)) {
    browser = "Firefox";
  } else if (/CriOS\//i.test(ua)) {
    browser = "Chrome";
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    browser = /; wv\)/i.test(ua) ? "Chrome WebView" : "Chrome";
  } else if (/Safari\//i.test(ua)) {
    browser = "Safari";
  }

  return { device, browser };
}
