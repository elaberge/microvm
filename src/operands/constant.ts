import { VoidOperand } from "./ioperand";
import { OpKey as DependencyKey, DependencyLog, DependencyOpExtension } from "../loggers/dependencylog";

class ConstantDependency extends DependencyOpExtension<Constant> {
  constant() {
    return true;
  }
}

export class Constant extends VoidOperand<Constant> {
  constructor(private val: number) {
    super();
    this.join(new ConstantDependency());
  }

  clone() {
    return new Constant(this.val);
  }

  get(): number {
    return this.val;
  }

  string(): string {
    return `%${this.get()}`;
  }
}

export function NumberOp(val: number): Constant {
  return new Constant(val);
}