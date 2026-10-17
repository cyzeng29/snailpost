# Snailpost: demo script (6:45)

**Setup before recording:**
- Run a production build (`npm run build && npx next start`) or use the deployed preview.
- Use a phone-sized browser window for the sender and a second, clean browser profile for the recipient.
- Clear site data so Today starts empty.
- Have four photos ready. The bundled `public/sample/*.jpg` illustrations work; say they're illustrations.

**Honesty rules for the video:**
- Alex and Grandma are fictional.
- Say "this is the sample" whenever showing `/demo`.
- Unless Supabase has been configured and tested (see `docs/supabase-setup.md`), say that links between devices are not switched on in this build, and show the recipient experience through the sample link.
- Never say a postcard was "delivered" or "read".

---

## 0:00–0:40: The human problem

> "I talk to my family. But they still miss the ordinary parts of my life: what I ate, the walk to class, the bit of practice that went well. Calls need both of us free at the same time, across a time difference. Photos arrive scattered, without a beginning or an end. And an ordinary day feels too small to bother sharing."

*On screen:* `/today`, empty state. "Nothing big has to happen. Breakfast counts."

## 0:40–1:10: Who it's for, and what it isn't

> "We started with students living far from home, sharing with a parent or grandparent in another time zone, often someone who'd rather not learn a new social app. That's a starting hypothesis, not research we've done yet.
>
> The job: when our schedules don't line up, turn a few ordinary moments into something personal they can open, hear, and keep, without arranging a call or performing for a feed.
>
> So it isn't a photo album, which has no voice and no ending, and it isn't another messenger. It's one small postcard a day, sent through the apps you already use."

## 1:10–3:10: The ritual (sender)

1. **Collect.** Tap *Add a little moment*, then *Choose from your photos*. Caption: "Tried your eggs. Still not as good as yours." Add three more. Point out the scraps fanning out, the time labels, and the envelope filling.
2. **Arrange.** Use *Move moment 3 up*. Say: "Every action has a button. Dragging is optional."
3. **Refresh the page.** Everything is still there: "Saved for later, on this device."
4. **Compose.** *Make today's postcard*, then *Your note*. The title is suggested from the count ("Four little things from…"); it never invents what happened. Type the note and show the 280-character counter.
5. **Voice.** *Record*, speak for about 10 seconds, *Stop*, *Listen back*. Choose *A short summary, in my words* and type one line. Say: "We only call it a transcript if it's word for word."
6. **Stamp.** Pick *Breakfast Club*.
7. **Preview.** The card turn: the card lifts, pivots, its shadow travels, and it settles. Use the button *Read the back*, not a gesture. Then *Read as a letter*.
8. **Ready to share.** That exact version is now frozen. Show the honest link note (or a real link, if configured), *Copy link*, and *Print a keepsake*.

## 3:10–4:05: The recipient

*Second browser, no account:* open the link, or `/demo` with "this is our sample".

- "A little of Alex's day, for you." Tap *Open postcard*: one short opening, and a repeat visit skips it.
- The calm Easy Reading look: 19 px text, big labeled buttons, nothing playing on its own.
- *Play Alex's voice*, then pause. Turn the card. *Read as a letter*. *Use larger text*.
- *Print this postcard*: open the PDF, two 6 × 4 pages, front then back.
- **Back on the sender's side, in Keepsakes:** *Browse postcards*, pick one, it rises out of the pile, *Read the back*, then *Back to keepsakes*, and it settles back where it was. "A handful of days, choose one, turn it over, put it back."

## 4:05–5:20: Three hard decisions (show the actual revisions)

1. **Tactile versus accessible.** The turn is real CSS 3D with real DOM text, so it's never mirrored and screen readers can read it. The hidden side is `inert`, so keyboard focus can't land on the back of a card you can't see. Reduced motion swaps the faces with a short fade. Every gesture also has a labeled button, and the letter view carries everything. The ticket-card reference uses a three.js canvas; we chose not to, to keep the text accessible.
2. **Playful to make, calm to read.** It's one brand with two presentations over the same content: Postcard Studio (peach, stamps, tape) and Easy Reading (cream, moss, 19 px). Shared links open in Easy Reading. *Show Settings switching the look.*
3. **A pile, not a grid, without hiding anything.** On phones a pile can leave only slivers of cards to tap. Fixes:
   - every card is a full-size labeled button when browsing;
   - Previous/Next is separate from turning the card over;
   - there's a plain List view.

   *Show `docs/evidence/exploration/pile-v1-cards-hidden.jpg`:* in our first pile the cards underneath were invisible, so we widened the fan.

**Other real revisions to mention (all in the build log):**
- The snail mark's spiral collided with the envelope flap, so it became a wax seal (`mark-v1…` → `mark-v3…`).
- The handwriting font printed as a single "A" in the PDF until we stopped subsetting it.
- Safari private browsing couldn't save photos, so we changed how they're stored.

## 5:20–6:10: What works, how we know, the honest limits

- **Tests:**
  - lint and type-check clean;
  - 43 unit tests (layout engine, local store, PDF pages, fonts, QR decoding, server-side validation, cluster state machine);
  - 120 end-to-end tests across Chromium desktop, Chromium on a Pixel 7 profile, and WebKit on an iPhone 14 profile. They add, reorder and refresh real photos, deny the microphone, turn the card by keyboard, open and return cards from the pile, test share cancel and clipboard failure, download and inspect the PDF, and run axe scans.
- **Limits, said plainly:**
  - Cross-device links need the backend we've prepared but not yet switched on. Those tests are written and marked BLOCKED.
  - Emulated phones aren't real phones: the real share sheet, microphone and in-app messaging browsers still need testing on a device.
  - There's no translation, voice cloning, scheduling or physical mail, by design.

## 6:10–6:45: Close

> "Next we'd like to run a small pilot with a few student–relative pairs. Can a sender make one without help? Can a recipient open, listen and read without coaching? Does it feel like a more coherent day than scattered photos? Does either of them want to keep it, or get another?
>
> A day that felt too ordinary to share became something worth keeping."

*End on the postcard's back: "Love, Alex", the stamp and the postmark.*
