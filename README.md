# Rubri - The Rust Browser Interpreter

> [See it in action.](https://garriga.dev/rubri)

Rubri is a proof-of-concept wrapper for [Miri](https://github.com/rust-lang/miri) that runs in the browser.

This allows for extremely fast iterative development, as it avoids compiling the code, which is known to be slow even when done natively.

Execution speed is pretty slow though, probably worse than the `1000x` Miri claims.  
Output is especially demanding, a simple loop of 2000 prints takes between 2 and 3 seconds.

The project has been made possible thanks to the work of [bjorn3](https://github.com/bjorn3) on [Cranelift](https://github.com/rust-lang/rustc_codegen_cranelift), [compiling Miri to WASM](https://github.com/rust-lang/miri/issues/722#issuecomment-1960849880) and the [Browser WASI shim](https://github.com/bjorn3/browser_wasi_shim).  
All credits are for them, this is just a wrapper I wanted to make to see if Rust could really run in the browser.


## Usage
See the [`index.astro`](./src/pages/index.astro) file for an example on how Miri can be used from javascript.  
This example has been made with `Vite` or `Astro` in mind, if you don't use any of them you can still run the code by removing the `import.meta.env` directives and adapting the fetch paths.

The [`public/wasm-rustc`](./public/wasm-rustc/) folder is needed, as it contains the compiled Miri and the necessary `.rlib` libraries.  
You can build your own `wasm-rustc` files by following the instructions in [this issue comment](https://github.com/rust-lang/miri/issues/722#issuecomment-1961278711).


## Limitations
All of them!

Seriously though, this is extremely experimental at the moment.  
It doesn't support multiple files, using crates, input/output operations, etc.

Everything not supported by Miri or WASM is not supported by Rubri.

If you have any knowledge on how to improve this, feel free to open a PR!


## How it works
`rustc` is tricky to compile to WASM because linkers are not supported.  
Miri though does not need linking, so it can be used to interpret the mid-level intermediate representation Rust uses in its compiling process.  

This wrapper loads Miri and the necessary libraries via a Web Worker and invokes it with the provided code.  
To improve execution speed, Miri's code has been modified slightly and all checks are disabled (does not check for UB, only runs the code).  

All the libraries are cached the first time they are downloaded, ensuring fast load times.

## License
Licensed under MIT license (LICENSE or http://opensource.org/licenses/MIT).