import { Arch } from "../arch";
import { IInstruction } from "../iinstruction";
import { ILogger } from "../loggers/ilogger";
import { OpKey as DependencyKey, DependencyLog, DependencyOpExtension } from "../loggers/dependencylog";
import { IOperand, VoidOperand } from "../operands/ioperand";
import { NumberOp } from "../operands/constant";

export namespace Programs {
  export interface IProgram<T extends Arch> {
    addr: { [key: string]: () => number },
    memory: number[],
    program: (arch: T) => IInstruction[],
  }

  export interface IInstrCmd<T extends Arch> {
    (arch: T, offset: number): IInstruction[];
  }

  export interface IBuildCmd<T extends Arch> {
    (arch: T, cmds: IInstrCmd<T>[]): IInstruction[];
  }

  export interface ICodeObject<T extends Arch> {
    (arch: T, linker: Linker<T>): IInstrCmd<T>[];
  }

  class LinkDependency<T extends Arch> extends DependencyOpExtension<LinkOperand<T>> {
    constant() {
      return true;
    }
  }

  class LinkOperand<T extends Arch> extends VoidOperand<LinkOperand<T>> {
    constructor(private linker: Linker<T>, private name: string) {
      super();
      this.join(new LinkDependency());
    }

    clone() {
      return new LinkOperand(this.linker, this.name);
    }

    get(): number {
      return this.linker.get(this.name);
    }

    string(): string {
      return `#${this.get()} (${this.name})`;
    }
  }

  export class Linker<T extends Arch> {
    private map = new Map<string, number>();
    private codeObjects: ICodeObject<T>[];

    constructor(private arch: T, private buildFn: IBuildCmd<T>, ...codeObjects: ICodeObject<T>[]) {
      this.codeObjects = codeObjects;
    }

    get(name: string) {
      return this.map.get(name);
    }

    label(name: string): (arch: Arch, offset: number) => IInstruction[] {
      return (arch: Arch, offset: number) => {
        this.map.set(name, offset);
        return [];
      };
    }

    link(name: string): IOperand {
      const self = this;
      return new LinkOperand(this, name);
    }

    compile(cmds: IInstrCmd<T>[]): IInstruction[] {
      const objects: IInstrCmd<T>[][] = [];
      this.codeObjects.forEach((code) => {
        objects.push(code(this.arch, this));
      });
      const full = [].concat([], ...objects, cmds);
      return this.buildFn(this.arch, full);
    }
  }
}