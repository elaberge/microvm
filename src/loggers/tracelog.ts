import { Arch } from "../arch";
import { IInstruction } from "../iinstruction";
import { Logger, LoggerExtension } from "./ilogger";
import { IOperand } from "../operands/ioperand";

export class TraceLogItem {
  pc: number;
  instr: IInstruction;
  running: boolean;
  before: Map<string, IOperand>;
  after: Map<string, IOperand>;

  getString() {
    return this.instr.getString();
  }
}

export class TraceLog extends LoggerExtension {
  private currentItem: TraceLogItem = null;

  constructor(private append: (item: TraceLogItem) => void) {
    super("TraceLog");
  }

  onFetch(pc: IOperand): void {
    this.currentItem = new TraceLogItem();
    this.currentItem.pc = pc.get();
  }

  onDecode(instr: IInstruction): void {
    this.currentItem.instr = instr;
  }

  beforeExecute(arch: Arch): void {
    this.currentItem.before = arch.dump();
  }

  afterExecute(arch: Arch, running: boolean): void {
    this.currentItem.running = running;
    this.currentItem.after = arch.dump();

    this.append(this.currentItem);
    this.currentItem = null;
  }
}