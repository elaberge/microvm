import { VoidOperand } from "./ioperand";
import { OpKey as DependencyKey, DependencyLog, DependencyOpExtension, OpKey } from "../loggers/dependencylog";

class InputDepency extends DependencyOpExtension<InputOperand> {
  constant(): boolean {
    return false;
  }
}

export class InputOperand extends VoidOperand<InputOperand> {
  private _hashCode = 0;

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
    const peekVal = this.inFn(this.channel, true);
    this._hashCode = peekVal;
    return peekVal;
  }

  get(): number {
    const getVal = this.inFn(this.channel, false);
    this._hashCode = getVal;
    this.ext<InputDepency>(DependencyKey).invalidate();
    return getVal;
  }

  string(): string {
    return `IN${this.channel}`;
  }

  special() {
    return true;
  }
}
