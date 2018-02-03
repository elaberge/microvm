import { IInstruction } from "./iinstruction";
import { ILogger } from "./loggers/ilogger";
import { OpKey as DependencyKey, DependencyLog, IDependencyOpExtension } from "./loggers/dependencylog";
import { IOperand } from "./operands/ioperand";
import { InputOperand } from "./operands/input";
import { OutputOperand } from "./operands/output";
import { Register } from "./operands/register";

export interface ArchConfig {
  registers?: string[],
  output?: (channel: number, x: number) => void,
  nbOut?: number,
  input?: (channel: number, peek: boolean) => number,
  nbIn?: number,
  mem?: number,
  memVal?: number[],
}

export class Arch {
  program: IInstruction[];

  private regPC = new Register("PC");
  private namedRegisters = new Map<string, Register>();
  private out: OutputOperand[] = [];
  private in: InputOperand[] = [];
  private mem: Register[] = [];

  private registers = new Map<string, IOperand>();

  private memValues: number[];

  constructor(config: ArchConfig = {}) {
    config.registers = config.registers || [];
    config.output = config.output || (() => { });
    config.nbOut = config.nbOut || 0;
    config.input = config.input || (() => 0);
    config.nbIn = config.nbIn || 0;
    config.mem = config.mem || 0;
    config.memVal = config.memVal || [];

    this.memValues = config.memVal;

    this.registers.set("PC", this.getPCReg());

    config.registers.forEach((name) => {
      const newReg = new Register(name);
      this.namedRegisters.set(name, newReg);
      this.registers.set(name, newReg);
    });

    for (let i = 0; i < config.nbOut; ++i) {
      const newOut = new OutputOperand(i, config.output);
      this.out.push(newOut);
      this.registers.set(newOut.string(), newOut);
    }
    for (let i = 0; i < config.nbIn; ++i) {
      const newIn = new InputOperand(i, config.input);
      this.in.push(newIn);
      this.registers.set(newIn.string(), newIn);
    }
    for (let i = 0; i < config.mem; ++i) {
      const newMem = new Register(`MEM${i}`);
      this.mem.push(newMem);
      this.registers.set(newMem.string(), newMem);
    }
  }

  init(logger: ILogger) {
    this.mem.forEach((m, index) => {
      if (index < this.memValues.length) {
        m.set(this.memValues[index]);
      }
    });
  }

  curInstr() {
    return this.program[this.regPC.get()];
  }

  dump() {
    const regCopy = new Map<string, IOperand>();
    this.registers.forEach((val, key) => {
      regCopy.set(key, val.clone());
    });
    return regCopy;
  }

  status() {
    return new Map(this.registers);
  }

  getPCReg() {
    return this.regPC;
  }

  getReg(name: string) {
    return this.namedRegisters.get(name);
  }

  getMem(addr: number) {
    return this.mem[addr];
  }

  getOut(channel: number) {
    return this.out[channel];
  }

  getIn(channel: number) {
    return this.in[channel];
  }
}