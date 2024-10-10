import { getSession } from "$lib/js/api";
import { fetchUser } from "./stores/auth";

export async function handle({ event, resolve }) {
  await fetchUser();

  const response = await resolve(event);
  return response;
}
