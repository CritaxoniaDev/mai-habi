import { driver, type DriveStep } from 'driver.js';

// The tour stylesheets (driver.js and our overrides) are global CSS, which Next
// only allows to be imported from `_app`; they are loaded there instead.

import { markTourSeen } from './onboarding';

/**
 * The guided product tour.
 *
 * Steps target `data-tour` anchors rather than class names or structure, so the
 * inner markup of each panel can be refactored without silently breaking the
 * tour. Anchors live on the durable chrome: the file tree, the editor, the
 * bottom panel and the two primary header actions.
 */
const STEPS: DriveStep[] = [
  {
    element: '[data-tour="files"]',
    popover: {
      title: 'Your files',
      description:
        'Every file in the project lives here. Add one with the + buttons, or drag to reorganise the tree.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="editor"]',
    popover: {
      title: 'The editor',
      description:
        'A full editor with type-checking and Emmet. Type an HTML tag and press Tab to expand it into a full element.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="panel"]',
    popover: {
      title: 'Console, problems & preview',
      description:
        'Your project runs live down here. Watch console output, jump to problems, or switch to the Preview tab to see it render.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="viewer"]',
    popover: {
      title: 'Open the viewer',
      description: 'Launch the project full-screen in its own tab, exactly as visitors will see it.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="share"]',
    popover: {
      title: 'Share your work',
      description: 'Publish the project and hand out a link. Nothing leaves your browser until you choose to.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="command"]',
    popover: {
      title: 'Everything else',
      description: 'Press ⌘⇧P any time to search commands — settings, export, themes, and this tour again.',
      side: 'bottom',
      align: 'end',
    },
  },
];

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** An anchor only counts if it is actually laid out — not collapsed or hidden. */
function isVisible(selector: string): boolean {
  const element = document.querySelector(selector);
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Launches the product tour. Steps whose anchor is absent or hidden — a
 * collapsed panel, a narrow layout that swaps views — are dropped rather than
 * shown over an empty stage, so the tour adapts to whatever is on screen.
 */
export function startProductTour(): void {
  markTourSeen();

  const steps = STEPS.filter(
    (step) => typeof step.element === 'string' && isVisible(step.element),
  );
  if (steps.length === 0) return;

  driver({
    steps,
    showProgress: true,
    animate: !prefersReducedMotion(),
    smoothScroll: true,
    allowClose: true,
    overlayColor: '#0a0a0a',
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 8,
    popoverClass: 'mai-habi-tour',
    popoverOffset: 12,
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
  }).drive();
}
