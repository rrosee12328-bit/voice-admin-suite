const RESET_KEYS = ["token_hash", "code", "access_token", "refresh_token"];

export function getPasswordResetUrl(location: Location) {
  const search = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const hasResetKey = RESET_KEYS.some((key) => search.has(key) || hash.has(key));
  const type = search.get("type") || hash.get("type");

  if (!hasResetKey && type !== "recovery" && type !== "invite") return null;

  const target = new URL("/set-password", location.origin);
  search.forEach((value, key) => target.searchParams.set(key, value));
  hash.forEach((value, key) => target.searchParams.set(key, value));

  if (!target.searchParams.has("type")) {
    target.searchParams.set("type", "recovery");
  }

  return `${target.pathname}${target.search}${target.hash}`;
}

export function routePasswordResetIfPresent(location: Location) {
  const resetUrl = getPasswordResetUrl(location);
  if (!resetUrl || location.pathname === "/set-password") return false;
  window.location.replace(resetUrl);
  return true;
}
