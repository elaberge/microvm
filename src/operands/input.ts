import { VoidOperand } from "./ioperand";
import { OpKey as DependencyKey, DependencyLog, DependencyOpExtension } from "../loggers/dependencylog";

class InputDepency extends DependencyOpExtension<InputOperand> {
  constant(): boolean {
    return false;
  }
}

export class InputOperand extends VoidOperand<InputOperand> {
  private _hashCode = 0;

  constructor(private channel: number, private inFn: (channel: number) => number) {
    super();
    this.join(new InputDepency());
  }

  hashCode(): number {
    return this._hashCode;
  }

  clone() {
    return new InputOperand(this.channel, this.inFn);
  }

  get(): number {
    const getVal = this.inFn(this.channel);
    this._hashCode = getVal;
    return getVal;
  }

  string(): string {
    return `IN${this.channel}`;
  }
}
