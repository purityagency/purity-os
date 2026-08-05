import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBaseUrl() {
  let url = process.env.PORTAL_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://app.purity-agency.be";
  
  if (process.env.NODE_ENV === "production" && url.includes("localhost")) {
    url = "https://app.purity-agency.be";
  }
  
  return url.replace(/\/+$/, "");
}
