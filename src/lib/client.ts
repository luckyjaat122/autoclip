"use client";

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-json */
  }
  if (!res.ok || (data && data.ok === false)) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data as T;
}

export function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
