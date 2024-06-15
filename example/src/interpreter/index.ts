export class Interpreter {
  private readonly worker: Worker
  private onrun: (() => void)[];
  private onresult: ((result: string) => void)[]
  private ondownloaded: ((name: string) => void)[];
  private onloaded: (() => void)[];
  
  constructor() {
    // base.pathname = import.meta.env.BASE_URL + base.pathname;
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    this.onrun = [];
    this.onresult = [];
    this.onloaded = [];
    this.ondownloaded = [];

    this.worker.onmessage = ({ data }: { data: { downloaded?: string, loaded?: boolean, result?: string } } ) => {
      if (data.result !== undefined) {
        for (const ev of this.onresult) {
          ev(data.result)
        }
      } else if (data.loaded !== undefined) {
        for (const ev of this.onloaded) {
          ev()
        }
      } else if (data.downloaded !== undefined) {
        for (const ev of this.ondownloaded) {
          ev(data.downloaded)
        }
      } else {
        console.log(`Received message`, data)
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

  public onAssetDownloaded(ondownloaded: (name: string) => void) {
    this.ondownloaded.push(ondownloaded);
  }

  public onLoaded(onloaded: () => void) {
    this.onloaded.push(onloaded);
  }
}