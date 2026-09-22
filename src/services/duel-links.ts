const DUO_CODE = /^[A-Z0-9]{8}$/;

export function duoCodeFromLocation(value = location.href): string | null {
  const code = new URL(value).searchParams.get("duo")?.toUpperCase() ?? "";
  return DUO_CODE.test(code) ? code : null;
}

export function duoLink(code: string, value = location.href): string {
  const normalized = code.trim().toUpperCase();
  if (!DUO_CODE.test(normalized)) throw new Error("invalid-duo-code");
  const url = new URL(value);
  url.search = "";
  url.hash = "";
  url.searchParams.set("account", "1");
  url.searchParams.set("duo", normalized);
  return url.toString();
}
