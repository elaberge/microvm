import { VoidOperand } from "./ioperand";
import { OpKey as DependencyKey, DependencyLog, DependencyOpExtension, OpKey } from "../loggers/dependencylog";

class InputDepency extends DependencyOpExtension<InputOperand> {
  constant(): boolean {
    return false;
  }
}

export class InputOperand extends VoidOperand<InputOperand> {
  private _hashCode = 0;
  private consumed = true;
  private curVal = 0;

  constructor(private channel: number, private inFn: (channel: number, peek: boolean) => number) {
    super();
    this.join(new InputDepency());
  }

  hashCode(): number {
    return this._hashCode;
  }

  clone() {
    return new InputOperand(this.channel, this.inFn);
  }

  peek(): number {
    if (this.consumed) {
      this._hashCode = this.curVal = this.inFn(this.channel, true);
      this.consumed = false;
      this.ext<InputDepency>(DependencyKey).invalidate();
    }
    return this.curVal;
  }

  get(): number {
    this.peek();
    this.inFn(this.channel, false);
    this.consumed = true;
    this.ext<InputDepency>(DependencyKey).invalidate();
    return this.curVal;
  }

  string(): string {
    return `IN${this.channel}`;
  }

  special() {
    return true;
  }
}
