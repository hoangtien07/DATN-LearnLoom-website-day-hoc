export async function handle({ event, resolve }) {
  if (
    event.url.pathname === "/.well-known/appspecific/com.chrome.devtools.json"
  ) {
    return new Response(null, { status: 204 });
  }

  const response = await resolve(event);
  return response;
}
