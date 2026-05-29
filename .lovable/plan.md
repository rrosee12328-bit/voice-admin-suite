## Plan

1. **Fix the recording click behavior in the call log**
   - Replace the current recording icon link that opens the raw audio URL in a new tab.
   - Make the recording action open the call detail page where the custom audio player lives.
   - Keep the separate “view details” action, but make both paths reliable for super admins and client users.

2. **Make transcript previews clickable**
   - Turn the transcript preview cell into a clear click target.
   - Clicking transcript text will open the full call detail page and scroll/anchor attention to the transcript area.
   - If there is no transcript, keep the dash/non-clickable state.

3. **Ensure client-context navigation works for super admins**
   - Update the admin client view so “View full call log” opens the call log pre-filtered to that client instead of a generic dashboard route.
   - Add query-param support to the call log so super admins can land on the relevant client’s calls immediately.

4. **Improve the call detail experience**
   - Keep the custom audio player visible at the top of the detail content when a recording exists.
   - Keep full transcripts visible for super admins regardless of the client’s plan.
   - Add an obvious transcript panel with copy support and better readable spacing.

5. **Validate the path**
   - Verify there are no preview/server errors after the change.
   - Confirm the intended user flow: admin client → call log → recording/transcript click → detail page with player and full transcript.