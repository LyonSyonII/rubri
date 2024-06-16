import { defineConfig } from 'astro/config';
import compress from "astro-compress";

import compressor from "astro-compressor";

// https://astro.build/config
export default defineConfig({
  // site: "https://garriga.dev",
  // base: "/rubri",
  integrations: [compress(), compressor({
    brotli: false,
    fileExtensions: [".css", ".js", ".html", ".xml", ".cjs", ".mjs", ".svg", ".txt"]
  })]
});