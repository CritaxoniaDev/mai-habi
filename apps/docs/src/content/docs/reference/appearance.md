---
title: Appearance
description: Light, dark and system, without a flash or a reset.
---

## Three modes

HABI supports **Light**, **Dark** and **System**, and defaults to System.
System follows `prefers-color-scheme` and changes the moment your operating
system does — no reload, no refresh.

Your choice is stored in this browser. Tabs on the same origin stay in step.

## No flash

The theme is resolved by a small inline script in the document head that runs
before the first paint, ahead of any bundle. There is no moment where a light
frame appears before a dark one.

## Nothing resets

Switching appearance changes a Monaco setting rather than recreating anything.
Your models, undo history, folding, cursor position and open tabs all survive.
So does everything in the console.

## Your project is exempt

The product theme applies to the editor and to the viewer's chrome. It never
reaches your application.

The preview receives no design tokens, no fonts and no theme class. In dark
mode you will see dark editor chrome around a page that looks exactly as you
built it — which is correct. If you want your page to respond to dark mode, use
`prefers-color-scheme` in your own stylesheet.

## Motion

Interface transitions are short, roughly 120–180 ms. If your system asks for
reduced motion, decorative transitions are removed.

Switching theme is deliberately abrupt: transitions are suppressed for one frame
so a dense interface changes cleanly instead of smearing through intermediate
colours.
