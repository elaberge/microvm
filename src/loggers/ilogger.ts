import { Arch } from "../arch";
import { IInstruction } from "../iinstruction";
import { IOperand } from "../operands/ioperand";

export interface ILoggerBase {
  onFetch(pc: IOperand): void;
  onDecode(instr: IInstruction): void;
  beforeExecute(arch: Arch): void;
  afterExecute(arch: Arch, running: boolean): void;
}

export interface ILoggerExtension extends ILoggerBase {
  key: string;
  logger: ILogger;
}

export interface ILogger extends ILoggerBase {
  ext<T extends ILoggerExtension>(id: string): T;
  join<T extends ILoggerExtension>(id: string, ext: T): void;
  keys(): string[];
}

export class LoggerExtension implements ILoggerExtension {
  logger: ILogger;

  constructor(public key:string) { }

  onFetch(pc: IOperand): void { }
  onDecode(instr: IInstruction): void { }
  beforeExecute(arch: Arch): void { }
  afterExecute(arch: Arch, running: boolean): void { }
}

export class Logger implements ILogger {
  private _extensions = new Map<string, ILoggerExtension>();

  private onEach(cb: (l:ILoggerBase) => void) {
    this._extensions.forEach(cb);
  }

  onFetch(pc: IOperand): void { this.onEach((l) => l.onFetch(pc)); }
  onDecode(instr: IInstruction): void { this.onEach((l) => l.onDecode(instr)); }
  beforeExecute(arch: Arch): void { this.onEach((l) => l.beforeExecute(arch)); }
  afterExecute(arch: Arch, running: boolean): void { this.onEach((l) => l.afterExecute(arch, running)); }

  ext<T extends ILoggerExtension>(id: string) {
    return <T>this._extensions.get(id);
  }

  join<T extends ILoggerExtension>(id: string, ext: T) {
    ext.logger = this;
    this._extensions.set(id, ext);
  }

  keys() {
    return [...this._extensions.keys()];
  }
}