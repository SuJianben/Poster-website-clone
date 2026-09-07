/*
 * SpotlightPick is a native theme custom element.  Its DrawerComponent base
 * already binds every [aria-controls] trigger, manages the open/active
 * transition, focus trap, overlay and Escape key.  This file used to bind a
 * second click handler to the same trigger, so every click opened and closed
 * the drawer in the same event loop (especially noticeable on collection
 * pages).  Keep this asset as a compatibility no-op; the custom element is
 * the single source of truth for the spotlight drawer lifecycle.
 */
