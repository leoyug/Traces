---
target: 更新后的 V0.3 Figma 页面
total_score: 16
max_score: 28
na_heuristics: 5,9,10
p0_count: 0
p1_count: 4
timestamp: 2026-08-31T21-09-34Z
slug: feekmpfsp2azpy-e4-b8-aa-e4-ba-ba-e7-bd-91-e7-ab-99
---
Method: dual-agent (A: assessment_a_v03_sep01 · B: assessment_b)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 2/4 | Current page is only a 3px dot in a navigation control that appears at the document end. |
| 2 | Match System / Real World | 2/4 | Project detail uses article reading-time and word-count semantics. |
| 3 | User Control and Freedom | 2/4 | Photo detail has no visible exit or adjacent-photo controls in the design. |
| 4 | Consistency and Standards | 3/4 | The 640px axis and visual system are coherent, but detail behaviors diverge. |
| 5 | Error Prevention | n/a | No input, deletion, or submission task is represented. |
| 6 | Recognition Rather Than Recall | 2/4 | Five icon-only navigation choices require recall. |
| 7 | Flexibility and Efficiency | 2/4 | Cross-section navigation is delayed to the document end. |
| 8 | Aesthetic and Minimalist Design | 3/4 | The design is restrained, but low contrast and empty tail space remove information. |
| 9 | Error Recovery | n/a | No error state is represented. |
| 10 | Help and Documentation | n/a | A personal publication does not need a separate help system. |
| **Total** |  | **16/28** | **Acceptable; key discovery paths need correction.** |

## Design Specificity Verdict

The Leo mark, original-ratio photography, deep canvas, and document-end pill give the design a real authorial signature. Remove those assets, however, and the 640px dark portfolio structure is still readily interchangeable with many designer sites. The long-term archive model is not yet visible enough in navigation, project evidence, or content relationships.

The deterministic Figma inspection found nine primary frames: the previous five index pages plus Resume, Article Detail, Project Detail, and Photo Detail. No mobile frames or keyboard/focus/error variants were added. The Article Detail and Project Detail use the same placeholder body and the same number/date/duration/word-count model despite different domains. Detector scanning was correctly skipped because the critique target is a remote Figma URL; nine node contexts, metadata, and screenshots were the fallback signal. No reliable browser overlay was available because no browser backend was exposed.

## Overall Impression

The update is more complete as a sitemap and retains a calm, authored visual world. Its biggest opportunity is to stop hiding orientation and professional proof: a first-time visitor should see where to go and why Leo's work matters before scrolling to the end.

## What's Working

1. Photography remains content-led: images keep their ratios and the detail frame gives the photograph the stage.
2. The 640px reading axis, restrained type scale, and dark neutral palette are coherent across nine frames.
3. The homepage sequence—introduction, writing, work, photography, contact—supports a personal publication rather than a generic marketing landing page.

## Priority Issues

### [P1] Primary navigation is hidden at the document end

- **Why it matters:** First-time visitors cannot discover the five sections without scrolling through long blank tails, and icon-only choices increase recall and accessibility costs.
- **Fix:** Keep the pill as an authored ending, add a quiet text directory in the first viewport, preserve 44px hit areas, visible focus, and text-identifiable states.
- **Suggested command:** `$impeccable clarify`

### [P1] The professional path has insufficient emphasis

- **Why it matters:** Recruiters cannot identify the primary next step within seconds; inline underlined text does not meet the product requirement for a prominent work entry.
- **Fix:** Add an explicit “查看工作” action and a secondary online-resume route directly after the introduction.
- **Suggested command:** `$impeccable layout`

### [P1] Project, article, and photo detail structures do not express their domains

- **Why it matters:** The project frame cannot prove design judgment, while the photo frame cannot support continuous browsing or a visible exit.
- **Fix:** Use project-specific background/role/tradeoff/result sections; retain article publishing semantics; add return, previous/next, description, album/tag, and safe public metadata for photography.
- **Suggested command:** `$impeccable shape`

### [P1] No responsive evidence exists

- **Why it matters:** The design cannot validate mobile navigation, three-column photography, resume skill cards, detail side rails, or 44px controls.
- **Fix:** Define representative 390px states for home, article, photography, photo detail, and resume, then verify the implementation at both desktop and mobile widths.
- **Suggested command:** `$impeccable adapt`

### [P2] Low-contrast metadata is overused

- **Why it matters:** `#808080` on `#191918` is about 4.45:1 and is especially weak at 12px; borders at `#232323` barely separate controls.
- **Fix:** Promote important secondary copy to the existing `#9e9792` token and reserve the weaker tone for expendable metadata.
- **Suggested command:** `$impeccable colorize`

## Persona Red Flags

- **Jordan (first-time visitor):** Cannot see the site directory in the first viewport and must interpret five unlabelled icons at the end.
- **Sam (keyboard/low-vision visitor):** The Figma frames do not prove 44px targets, focus-visible treatment, or a photo-detail exit; 12px `#808080` copy is marginal.
- **Recruiting manager:** The homepage lacks a clear work action, and the project-detail frame shows reading time and word count instead of role, constraints, decisions, and results.

## Minor Observations

- The updated About page removes duplicated paragraphs and fills former empty media/status placeholders.
- The About copy contains “出去自己的兴趣”, likely a typo for “出于自己的兴趣”.
- The Resume frame lists Codex in both “常用” and “了解”; the taxonomy should be mutually exclusive.
- Contact sets differ across pages; website, email, GitHub, and RSS should be normalized from the resume source.
- The deep canvas is now coherent with the current V0.3 documentation, but dark-neutral borders need stronger functional contrast.

## Questions to Consider

1. Should the first viewport prioritize “查看工作” with “在线履历” secondary, or give both equal weight?
2. Should the text directory remain visible on all pages or only on index pages while detail pages use a clear back path?
3. Is the Resume intended as a public truth source now, or should any unverified work-history fields remain explicitly marked as drafts?
