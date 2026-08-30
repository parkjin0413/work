import { isAdminUser } from "./isAdminUser";

export type MiddlewareSession = { email: string | null | undefined } | null;

const PUBLIC_PATHS = ["/login"];

export function resolveRedirect(pathname: string, session: MiddlewareSession): string | null {
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isAuthorized = session !== null && isAdminUser(session.email);

  if (!isAuthorized && !isPublicPath) {
    return "/login";
  }

  if (isAuthorized && isPublicPath) {
    return "/";
  }

  return null;
}
