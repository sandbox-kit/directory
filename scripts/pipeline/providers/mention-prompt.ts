import { CAPABILITY_EXTRACT_HINT } from "./capability-prompt.ts";
import { ISOLATION_EXTRACT_HINT } from "./isolation-prompt.ts";
import { DOCS_EXTRACT_HINT } from "./docs-prompt.ts";

/** Extract vendors named on launch posts, blogs, HN threads, tweets — not the host page as a product. */
export const MENTION_EXTRACT_PROMPT =
  "This page may be a launch post, Show HN, blog, tweet thread, or comparison mentioning AI agent sandbox products. " +
  "Extract every distinct vendor/product that offers (or is launching) isolated code execution, browser/computer-use sandboxes, or microVM environments for LLM/coding agents. " +
  "Use the vendor's canonical homepage or GitHub org/repo — not news.ycombinator.com, x.com, medium.com, or ycombinator.com/company pages unless that is the only official URL. " +
  "Include stealth/waitlist launches when clearly described. Skip generic mentions of AWS/GCP unless a named sandbox SKU is offered. " +
  CAPABILITY_EXTRACT_HINT +
  " " +
  ISOLATION_EXTRACT_HINT +
  " " +
  DOCS_EXTRACT_HINT;