import { IOperand, VoidOperand } from "./ioperand";
import { OpKey as DependencyKey, DependencyLog, IDependencyOpExtension, DependencyOpExtension } from "../loggers/dependencylog";

class OutputDepency extends DependencyOpExtension<OutputOperand> {
  private _constant = true;

  link(msg: string, logger: DependencyLog, ...operand: IOperand[]): void {
    this._constant = false;
    logger.link(msg, this.op, ...operand);
  }

  alias(logger: DependencyLog, other: IOperand): void {
    logger.link("copy", this.op, other);
  }

  constant() {
    return this._constant;
  }
}

export class OutputOperand extends VoidOperand<OutputOperand> {
  constructor(private channel: number, private outFn: (channel: number, x: number) => void) {
    super();
    this.join(new OutputDepency());
  }

  hashCode(): number {
    return 0;
  }

  clone() {
    return new OutputOperand(this.channel, this.outFn);
  }

  set(val: number): void {
    this.outFn(this.channel, val);
  }

  get(): number {
    return Number.NaN;
  }

  string(): string {
    return `OUT${this.channel}`;
  }
}