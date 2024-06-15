export class Interpreter {
  private readonly worker: Worker
  private onrun: (() => void)[];
  private onresult: ((result: string) => void)[]
  private onloaded: (() => void)[];
  
  constructor() {
    // base.pathname = import.meta.env.BASE_URL + base.pathname;
    console.log({url: import.meta.url});
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    this.onrun = [];
    this.onresult = [];
    this.onloaded = [];

    this.worker.onmessage = ({ data }: { data: { loaded?: boolean, result?: string } } ) => {
      if (data.result !== undefined) {
        for (const ev of this.onresult) {
          ev(data.result)
        }
      } else if (data.loaded !== undefined) {
        for (const ev of this.onloaded) {
          ev()
        }
      }
    };
  }

  public run(code: string) {
    for (const ev of this.onrun) {
      ev()
    }
    this.worker.postMessage(code);
  }

  public onRun(onrun: () => void) {
    this.onrun.push(onrun);
  }

  public onResult(onresult: (result: string) => void) {
    this.onresult.push(onresult);
  }

  public onLoaded(onloaded: () => void) {
    this.onloaded.push(onloaded);
  }
}