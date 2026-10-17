# Deploying to Vercel

**Status:** not deployed. There is no verified preview URL yet, because deployment needs your Vercel account.

## Steps (GitHub → Vercel)

1. Push the branch:
   ```bash
   git push -u origin build/v1
   ```
2. On vercel.com, choose **Add New → Project**, import `cyzeng29/snailpost`, and keep the detected Next.js settings. The build command is `npm run build`, and Node 22 or newer is required.
3. **Environment variables.** Optional for the local-only experience; required for links. Add the four values from `.env.example` (see [supabase-setup.md](supabase-setup.md)). Mark `SUPABASE_SERVICE_ROLE_KEY` as server-only, which is Vercel's default for variables without the `NEXT_PUBLIC_` prefix.
4. Deploy. Vercel builds a preview URL for `build/v1`. Set `PUBLIC_SITE_URL` to the final production domain so QR codes point there.

## Check the deployment

- Open `/today`, add a photo, refresh: the photo is still there.
- Open `/demo` on a phone, open the postcard, play the voice, turn the card, print.
- Open `/p/anything`. It should say "This postcard is no longer available", and the response headers should include `Cache-Control: private, no-store`, `X-Robots-Tag: noindex` and `Referrer-Policy: no-referrer`.
- If links are configured, run the steps in [supabase-setup.md](supabase-setup.md) against the deployed URL.

Microphone recording needs HTTPS. Vercel provides it; plain `http://` LAN addresses will show the upload fallback instead.
