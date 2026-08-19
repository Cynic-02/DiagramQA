/**
 * The scroll beat for the hero graph.
 *
 * A plain module singleton on purpose. The landing page writes to it
 * inside a rAF as the page scrolls; GraphEngine reads it once per
 * frame. Neither side re-renders React, so scrolling the landing page
 * costs zero reconciliation — which is the whole point of moving the
 * hero off a scroll-linked component tree.
 *
 * 0 HERO · 1 PROOF · 2 PIPELINE · 3 CTA
 */
export const graphBeat = { value: 0 }
