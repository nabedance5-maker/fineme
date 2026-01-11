// Project-wide augmentation: expose our runtime helpers on window without TS errors
export {};

declare global {
  interface Window {
    // returns a user session object or null
    getUserSession?: () => any;
    // signs out the current user
    signOutUser?: () => void;
    // GitHub Pages project base (e.g. '/fineme')
    finemeBase?: string;
  }
}
