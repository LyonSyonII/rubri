import { Fd, File, Directory, PreopenDirectory, WASI, strace } from "./wasi/index";

// import "./coi-serviceworker";

export class Interpreter {
  miri: WebAssembly.Module;
  wasi: WASI;
  stdin: Stdio;
  stdout: Stdio;
  stderr: Stdio;
  fds: Fd[];
  next_thread_id: number;

  constructor() {
    return (async (): Promise<Interpreter> => {
      this.next_thread_id = 1;
      this.miri = await WebAssembly.compileStreaming(fetch("/wasm-rustc/bin/miri.wasm"));

      this.stdin = new Stdio();
      this.stdout = new Stdio();
      this.stderr = new Stdio();
      this.fds = [
        this.stdin,
        this.stdout,
        this.stderr,
        new PreopenDirectory("/tmp", []),
        new PreopenDirectory("/sysroot", [
            ["lib", new Directory([
                ["rustlib", new Directory([
                    ["wasm32-wasi", new Directory([
                        ["lib", new Directory([])],
                    ])],
                    ["x86_64-unknown-linux-gnu", new Directory([
                        ["lib", new Directory(await (async function () {
                            let dir = new Map();
                            for (let file of [
                                "libaddr2line-b8754aeb03c02354.rlib",
                                "libadler-05c3545f6cd12159.rlib",
                                "liballoc-0dab879bc41cd6bd.rlib",
                                "libcfg_if-c7fd2cef50341546.rlib",
                                "libcompiler_builtins-a99947d020d809d6.rlib",
                                "libcore-4b8e8a815d049db3.rlib",
                                "libgetopts-bbb75529e85d129d.rlib",
                                "libgimli-598847d27d7a3cbf.rlib",
                                "libhashbrown-d2ff91fdf93cacb2.rlib",
                                "liblibc-dc63949c664c3fce.rlib",
                                "libmemchr-2d3a423be1a6cb96.rlib",
                                "libminiz_oxide-b109506a0ccc4c6a.rlib",
                                "libobject-7b48def7544c748b.rlib",
                                "libpanic_abort-c93441899b93b849.rlib",
                                "libpanic_unwind-11d9ba05b60bf694.rlib",
                                "libproc_macro-1a7f7840bb9983dc.rlib",
                                "librustc_demangle-59342a335246393d.rlib",
                                "librustc_std_workspace_alloc-552b185085090ff6.rlib",
                                "librustc_std_workspace_core-5d8a121daa7eeaa9.rlib",
                                "librustc_std_workspace_std-97f43841ce452f7d.rlib",
                                "libstd-bdedb7706a556da2.rlib",
                                "libstd-bdedb7706a556da2.so",
                                "libstd_detect-cca21eebc4281add.rlib",
                                "libsysroot-f654e185be3ffebd.rlib",
                                "libtest-f06fa3fbc201c558.rlib",
                                "libunicode_width-19a0dcd589fa0877.rlib",
                                "libunwind-747b693f90af9445.rlib",
                            ]) {
                                dir.set(file, await load_external_file("/wasm-rustc/lib/rustlib/x86_64-unknown-linux-gnu/lib/" + file));
                            }
                            return dir;
                        })())],
                    ])],
                ])],
            ])],
        ]),
        new PreopenDirectory("/", [
            ["main.rs", new File(new TextEncoder("utf-8").encode(`fn main() {
            println!("Hello {name}!"); 
        }`))],
        ]),
      ];

      const env = [];
      const args = ["miri", "--sysroot", "/sysroot", "main.rs", "--target", "x86_64-unknown-linux-gnu"];
      this.wasi = new WASI(args, env, this.fds, { debug: false });

      return this;
    })() as unknown as Interpreter
  }

  public async run(code: string): Promise<string> {
    this.stdin.clear();
    this.stdout.clear();
    this.stderr.clear();
    
    this.fds[5].dir.contents.get("main.rs").data = new TextEncoder().encode(code);

    const inst = await WebAssembly.instantiate(this.miri, {
        "env": { memory: new WebAssembly.Memory({ initial: 256, maximum: 16384, shared: true }) },
        "wasi": {
            "thread-spawn": function (start_arg) {
                let thread_id = this.next_thread_id++;
                inst.exports.wasi_thread_start(thread_id, start_arg);
                return thread_id;
            }
        },
        "wasi_snapshot_preview1": strace(this.wasi.wasiImport, ["fd_prestat_get"]),
    });
    
    try { 
      this.wasi.start(inst);
    } catch (e) { 
      return this.stderr.text() || e.message;
    };

    console.log({stdout: this.stdout, stderr: this.stderr, stdin: this.stdin});
    return this.stdout.text() || this.stderr.text();
  }
}

class Stdio extends Fd {
  out: string[]

  constructor() {
    super();
    this.out = [];
  }

  fd_write(data: Uint8Array): {ret: number, nwritten: number} {
      const text = new TextDecoder("utf-8").decode(data);
      this.out.push(text);
      return { ret: 0, nwritten: data.byteLength };
  }

  clear() {
    this.out = [];
  }

  text(): string {
    return this.out.join("");
  }
}

async function load_external_file(path) {
  return new File(await (await (await fetch(path)).blob()).arrayBuffer());
}