# Disclaimer

**Read this before installing or using Clipform.**

By downloading, installing, or running Clipform you acknowledge and agree to everything below. If you do not agree, do not install or use the plugin.

---

## 1. Experimental software

Clipform is **experimental, pre-1.0 software**, distributed as a hobbyist / personal project. It has not been independently audited, security-reviewed, or production-hardened.

- APIs, data formats stored in your Figma file (`pluginData`), the plugin window, the hidden library page, and the behavior of every feature **may change without notice** between versions.
- Bugs exist. Some bugs may affect the contents of your Figma file, including but not limited to: corrupting reference frames, mis-writing tokens, accidentally deleting or modifying nodes, or filling local storage.
- Visual similarity search, AI tagging, color extraction, palette suggestions and any other AI-derived output **are approximations and may be wrong, biased, or misleading.** Do not rely on them for any decision that matters.

If the absence of stability or correctness guarantees is unacceptable for your work, **do not use this plugin.**

## 2. No warranty

This software is provided **"AS IS"**, without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, non-infringement, accuracy, completeness, security, or uninterrupted availability.

The complete license text is in [LICENSE](LICENSE).

## 3. Limitation of liability

To the maximum extent permitted by applicable law, **in no event shall the author(s) or contributors of Clipform be liable for any claim, damages or other liability**, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.

This includes (without limiting the generality of the above):

- Loss, corruption, or modification of any Figma file or its contents
- Loss of design work, references, time, or revenue
- Unintended deletion or alteration of variables, styles, frames, or layers
- Charges incurred against any third-party API key supplied by the user
- Any consequence of an AI-generated tag, color, embedding, or arrangement
- Any consequence of clicking a source URL stored in a reference
- Any security or privacy incident resulting from the use of the plugin

## 4. Do Your Own Research (DYOR)

Before installing or using Clipform, **you are responsible for reviewing the source code, the manifest, and the network domains the plugin uses.**

The entire plugin is three files:

- `manifest.json` (declares permissions and allowed network domains)
- `code.js` (sandbox-side code)
- `ui.html` (UI-side code)

It takes a focused engineer well under an hour to read them all. If you cannot or do not want to do this review, **do not install the plugin.** "I assumed someone else read it" is not a defense if something goes wrong on your end.

## 5. You are responsible for your own data

- **Back up your Figma files** before installing or running Clipform. The plugin creates and modifies content in your file (a hidden page named `📌 Clipform Library` and `pluginData` on the frames within it). Bugs or version migrations may damage that content.
- **Test in a throwaway file first.** Do not run the plugin for the first time on a production design file.
- **Verify every AI output** — tags, color palettes, extracted tokens, similar-ref rankings, layouts. Treat them as a starting point, not as truth.
- **Manage your own OpenAI API key.** The BYOK auto-tagging feature sends your key only to `api.openai.com`, but you, not the plugin author, are liable for any charges, abuse, or leakage of that key. The key is stored only in `figma.clientStorage` on your machine; it is your responsibility to keep it secret and to rotate it.
- **Source URLs are user-supplied data.** Clicking a `↗ host.com` chip opens an external URL in a new browser tab. The plugin makes no judgment about whether that URL is safe to visit.
- **You are responsible for the images you save.** The plugin does not check copyright, licensing, or content moderation. If saving an image into your Figma file would infringe someone else's rights, do not save it.

## 6. Third parties and trademarks

Clipform is **not affiliated with, endorsed by, or sponsored by** Figma, Figma Inc., OpenAI, Hugging Face, jsDelivr, images.weserv.nl, or any other company, product, service, or individual mentioned in the source code or documentation.

- "Figma" is a trademark of Figma, Inc. Use of the plugin requires Figma desktop, which is subject to its own [Terms of Service](https://www.figma.com/tos/).
- "OpenAI" and "GPT" are trademarks of OpenAI. The optional BYOK feature relies on OpenAI's API; use of that API is subject to [OpenAI's Terms](https://openai.com/policies/terms-of-use).
- The CLIP model is downloaded from third-party CDNs (jsDelivr serves the JavaScript runtime; the model files are fetched as the runtime requests them). The author of Clipform does not host, audit, or guarantee the integrity of those files.
- `images.weserv.nl` is a third-party image proxy used as a CORS fallback. The author of Clipform has no control over its availability, content moderation, or data handling.

All trademarks are the property of their respective owners. Their inclusion here is **purely nominative** (for the unavoidable purpose of describing what the plugin connects to or runs on) and does **not** imply any partnership, endorsement, or sponsorship.

## 7. Network behavior

The plugin manifest declares `networkAccess.allowedDomains: ["*"]` because users may drag images from arbitrary websites. The plugin will only make a network request when **you take an explicit action that requires one**, namely:

- Dragging an image from a browser tab (one request to the source host; one optional fallback to `images.weserv.nl`)
- First-time plugin open (download of the Transformers.js runtime + CLIP model from `cdn.jsdelivr.net`)
- Adding a reference while a BYOK key is set in settings (one request to `api.openai.com` per added reference)

There is no analytics, telemetry, crash reporting, usage tracking, or "phone-home" code in the plugin. **However:** because the source code is public and `networkAccess` is `*`, you should not rely on this statement — you should read `code.js` and `ui.html` yourself to confirm. See section 4.

## 8. No support obligation

This is a hobby project. There is **no obligation** on the author or any contributor to respond to issues, fix bugs, accept pull requests, maintain compatibility with future Figma releases, or provide any form of support. Issues opened on GitHub may go unanswered indefinitely.

If your use of Clipform requires guaranteed availability or response times, **do not use this plugin.**

## 9. Forward-incompatible changes

Any commit may break compatibility with libraries created by prior versions of the plugin. Any release may rename or remove `pluginData` fields. There is no migration tool, no deprecation period, no LTS.

If you build something on top of Clipform's data model (for example, parsing the hidden library page yourself), you do so **at your own risk and with no guarantee of compatibility going forward.**

## 10. Jurisdiction and severability

If any provision of this disclaimer is held to be unenforceable in your jurisdiction, the remaining provisions remain in full force and effect. Nothing in this document waives any right that cannot be waived under your local consumer-protection law.

This disclaimer is governed by the same MIT License under which the source code is distributed.

---

## TL;DR

> Experimental hobby plugin. AS IS. No warranty. No support. May break or corrupt your Figma file. Use at your own risk. Read the source before installing. Back up your work. Verify every AI output. Not affiliated with Figma, OpenAI, or anyone. The author is not liable for anything that happens.

If any part of that summary is unacceptable to you for your intended use, **do not install or use Clipform.**
