import { Fd, File, Directory, PreopenDirectory, WASI, strace, OpenDirectory } from "./wasi/index";

export async function initInterpreter(): Promise<Interpreter> {
  const miri = await WebAssembly.compileStreaming(cached_or_fetch("/wasm-rustc/bin/miri.wasm"));

  const stdin = new Stdio();
  const stdout = new Stdio();
  const stderr = new Stdio();
  const tmp = new PreopenDirectory("/tmp", []);
  const sysroot = await buildSysroot();
  const root = new PreopenDirectory("/", [
    ["main.rs", new File([])],
  ]);

  const fds: [Stdio, Stdio, Stdio, OpenDirectory, OpenDirectory, OpenDirectory] = [stdin, stdout, stderr, tmp, sysroot, root];

  const env = [];
  const args = ["miri", "--sysroot", "/sysroot", "main.rs", "--target", "x86_64-unknown-linux-gnu"];
  const wasi = new WASI(args, env, fds, { debug: false });

  return new Interpreter(miri, wasi, fds, stdin, stdout, stderr);
}

export class Interpreter {
  readonly miri: WebAssembly.Module;
  readonly wasi: WASI;
  readonly fds: [Stdio, Stdio, Stdio, OpenDirectory, OpenDirectory, OpenDirectory];
  readonly stdin: Stdio;
  readonly stdout: Stdio;
  readonly stderr: Stdio;
  next_thread_id: number;

  constructor(
    miri: WebAssembly.Module,
    wasi: WASI,
    fds: [Stdio, Stdio, Stdio, OpenDirectory, OpenDirectory, OpenDirectory],
    stdin: Stdio,
    stdout: Stdio,
    stderr: Stdio,
  ) {
    this.miri = miri;
    this.wasi = wasi;
    this.stdin = stdin;
    this.stdout = stderr;
    this.stderr = stdout;
    this.fds = fds;
    this.next_thread_id = 1;
  }

  public async run(code: string): Promise<string> {
    this.stdin.clear();
    this.stdout.clear();
    this.stderr.clear();

    this.fds[5].dir.get_file("main.rs")!.data = new TextEncoder().encode(`fn main() {\n${code}\n}`);
    
    const inst = await WebAssembly.instantiate(this.miri, {
      "env": { memory: new WebAssembly.Memory({ initial: 256, maximum: 1024 * 4, shared: true }) },
      "wasi": {
        "thread-spawn": function (start_arg) {
          let thread_id = this.next_thread_id++;
          // @ts-ignore
          inst.exports.wasi_thread_start(thread_id, start_arg); 
          return thread_id;
        }
      },
      "wasi_snapshot_preview1": strace(this.wasi.wasiImport, ["fd_prestat_get"]),
    });

    try {
      // @ts-ignore
      this.wasi.start(inst);
    } catch (e) {
      return this.stderr.text() || this.stdout.text() || e.message;
    };

    console.log({ stdout: this.stdout, stderr: this.stderr, stdin: this.stdin });
    return this.stdout.text() || this.stderr.text();
  }
}

class Stdio extends Fd {
  private out: Uint8Array
  
  constructor() {
    super();
    this.out = new Uint8Array();
  }

  fd_write(data: Uint8Array): { ret: number, nwritten: number } {
    console.log({data, out: this.out})
    this.out = new Uint8Array(this.out.length + data.length);
    this.out.set(this.out);
    this.out.set(data, this.out.length);

    return { ret: 0, nwritten: data.byteLength };
  }

  clear() {
    this.out = new Uint8Array();
  }

  text(): string {
    return new TextDecoder("utf-8").decode(this.out);
  }
}

async function load_external_file(path: string) {
  return new File(
    await cached_or_fetch(path).then(b => b.blob()).then(b => b.arrayBuffer())
  );
}

async function cached_or_fetch(path: string) {
  if (window.caches === undefined) {
    return await fetch(path);
  }

  const cache = await caches.open("rust-quest");
  const cached = await cache.match(path);
  if (cached) {
    console.log(`Loading from cache: ${path}`);
    return cached;
  }
  
  const file = await fetch(path);
  cache.put(path, file.clone());
  return file;
}

async function buildSysroot(): Promise<PreopenDirectory> {
  return new PreopenDirectory("/sysroot", [
    ["lib", new Directory([
      ["rustlib", new Directory([
        ["wasm32-wasi", new Directory([
          ["lib", new Directory([])],
        ])],
        ["x86_64-unknown-linux-gnu", new Directory([
          ["lib", new Directory(await (async function () {
            let dir = new Map();
            let files = [
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
            ].map(async (file) => {
              dir.set(file, await load_external_file("/wasm-rustc/lib/rustlib/x86_64-unknown-linux-gnu/lib/" + file));
            });
            await Promise.all(files);
            return dir;
          })())],
        ])],
      ])],
    ])],
  ])
}