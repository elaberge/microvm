import { IOperand, VoidOperand } from "./ioperand";
import { OpKey as DependencyKey, DependencyLog, DependencyOpExtension } from "../loggers/dependencylog";
import { NumberOp } from "./constant";

class RegisterDependency extends DependencyOpExtension<Register> {
  private _constant = true;

  link(msg: string, logger: DependencyLog, ...operand: IOperand[]) {
    this._constant = false;
    logger.link(msg, this.op, ...operand);
  }

  alias(logger: DependencyLog, other: IOperand): void {
    logger.alias(this.op, other);
  }

  constant() {
    return this._constant;
  }

  setConstant(constant: boolean) {
    this._constant = constant;
  }
}

export class Register extends VoidOperand<Register> {
  private _value = 0;

  constructor(private name: string) {
    super();
    this.join(new RegisterDependency());
  }

  clone() {
    const regClone = new Register(this.name);
    regClone._value = this._value;
    return regClone;
  }

  get(): number {
    return this._value;
  }

  set(val: number) {
    this._value = val;
  }

  string() {
    return this.name;
  }
}