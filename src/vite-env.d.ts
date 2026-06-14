/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** UI version injected at build time (set by CI from the image tag). */
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
