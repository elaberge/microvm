import { Arch } from "../arch";
import { IInstruction } from "../iinstruction";
import { ILogger, LoggerExtension } from "./ilogger";
import { IOpExtension, IOperand } from "../operands/ioperand";
import { IDependencySerializer } from "./depserializers/idependencyserializer";

export const OpKey = "Dependency";

export interface IDependencyOpExtension extends IOpExtension {
  link(msg: string, logger: DependencyLog, ...operand: IOperand[]): void;
  alias(logger: DependencyLog, other: IOperand): void;
  constant(): boolean;
  setConstant(constant: boolean): void;
}

export class DependencyOpExtension<T extends IOperand> implements IDependencyOpExtension {
  key = OpKey;
  op: T;

  static get(op: IOperand) {
    if (op == undefined)
      return;
    return op.ext<IDependencyOpExtension>(OpKey);
  }

  link(msg: string, logger: DependencyLog, ...operand: IOperand[]): void {
    throw new Error("Method not implemented.");
  }

  alias(logger: DependencyLog, other: IOperand): void {
    throw new Error("Method not implemented.");
  }

  constant(): boolean {
    throw new Error("Method not implemented.");
  }

  setConstant(constant: boolean) {}
}

export interface IDepOperand {
  constant(): boolean;
  string(): string;
}

interface IDepSet {
  msg: string;
  deps: DepOperand[];
}

class DepSignature {
  static map = new Map<string, DepSignature>();
  static currentBranch = "";

  private items = new Map<string, DepSignature>();
  private hashes = new Map<string, number>();
  private branch: string;

  static find(msg: string, deps: DepOperand[]) {
    const signature = new DepSignature(msg, deps);
    const signatureKey = signature.toString();
    if (DepSignature.map.has(signatureKey) == false)
      DepSignature.map.set(signatureKey, signature);
    return DepSignature.map.get(signatureKey);
  }

  public static setBranch(name: string) {
    DepSignature.currentBranch = name;
  }

  private constructor(private msg: string, deps: DepOperand[]) {
    this.branch = DepSignature.currentBranch;
    /*deps.forEach((r) => {
      r.depEntry.signature.items.forEach((v, k) => {
        this.items.set(k, v);
      });
      r.depEntry.signature.hashes.forEach((v, k) => {
        this.hashes.set(k, v);
      });
    });*/
    deps.forEach((r) => {
      let rSign = r.depEntry.signature;
      if (rSign == undefined)
        rSign = DepSignature.find(r.depEntry.msg, r.depEntry.dependencies);
      this.items.set(r.name, rSign);
      this.hashes.set(r.name, r.op.hashCode());
    });
  }

  public toString() {
    const str: string[] = [this.branch, this.msg];
    const sorted = [...this.items.keys()].sort();
    sorted.forEach((k) => {
      str.push(`[${k}=${this.hashes.get(k)}]`);
    });
    return str.join(",");
  }
}

class DepEntry {
  static map = new Map<DepSignature, DepEntry>();

  static find(msg: string, deps: IOperand[]): DepEntry {
    const depOps: DepOperand[] = [];
    deps.forEach((d) => depOps.push(DepOperand.find(d)));
    const signature = DepSignature.find(msg, depOps);
    //return new DepEntry(msg, depOps, signature);
    if (DepEntry.map.has(signature) == false)
      DepEntry.map.set(signature, new DepEntry(msg, depOps, signature));

    return DepEntry.map.get(signature);
  }

  private constructor(
    public msg: string,
    public dependencies: DepOperand[],
    public signature: DepSignature,
  ) {}
}

class DepOperand implements IDepOperand, IOpExtension {
  static DepKey = "DepOperand";

  static find(op: IOperand) {
    let depOp = op.ext<DepOperand>(DepOperand.DepKey);
    if (depOp == undefined) {
      depOp = new DepOperand();
      op.join(depOp);
    }

    return depOp;
  }

  key = DepOperand.DepKey;

  private _op: IOperand;
  public depEntry: DepEntry;
  private dep: IDependencyOpExtension;
  public name: string;
  private _constant: boolean;
  private _val: number = 0;

  get op() { return this._op; }

  set op(v: IOperand) {
    this._op = v;
    this.dep = DependencyOpExtension.get(v);
    this.name = v.string();
  }

  aliasTo(target: IOperand):()=>void {
    const newDep = new DepOperand();
    target.join(newDep);
    newDep.depEntry = this.depEntry;
    newDep.name = this.name;
    return () => {
      newDep.bake();
    };
  }

  link(msg: string, ...deps: IOperand[]):()=>void {
    const newDep = new DepOperand();
    newDep.updateDepEntry(msg, deps);
    this.op.join(newDep);
    return () => {
      newDep.bake();
    };
  }

  private constructor() {
    this.updateDepEntry("", []);
  }

  private updateDepEntry(msg: string, deps: IOperand[]) {
    this.depEntry = DepEntry.find(msg, deps);
  }

  private bake() {
    this._val = this.op.hashCode();
    this._constant = this.dep.constant();
  }

  constant() {
    return this._constant;
  }

  string() {
    const id = [this.name];
    //if (this.constant())
      id.push("=", this._val.toString());
    //id.push(" ", this.depEntry.signature.toString());
    return id.join("");
  }

  forEachSet(cb: (deps: DepOperand[], msg: string, self: DepOperand) => void) {
    if (this.depEntry.dependencies.length > 0)
      cb(this.depEntry.dependencies, this.depEntry.msg, this);
  }
}

export class DependencyLog extends LoggerExtension {
  private postCmd:(()=>void)[] = [];
  private statusDump:(string|number)[][] = [];

  constructor(arch: Arch) {
    super(OpKey);
  }

  branch(taken: boolean, branchDep: IOperand): void {
    const values:any[] = [];
    this.statusDump.forEach((entry) => {
      values.push(`${entry[0]}:${entry[1]}`);
    });

    DepSignature.setBranch(values.join(","));
  }

  beforeExecute(arch: Arch): void {
    this.statusDump.length = 0;

    const status = arch.status();
    const keys = [...status.keys()].sort();
    keys.forEach((k) => {
      const op = status.get(k);
      const val = op.hashCode();
      if (val != 0)
        this.statusDump.push([k, val]);
    });
  }

  afterExecute(arch: Arch, running: boolean): void {
    this.postCmd.forEach((f) => f());
    this.postCmd.length = 0;
  }

  link(msg: string, dst: IOperand, ...src: IOperand[]): void {
    this.postCmd.push(DepOperand.find(dst).link(msg, ...src));
  }

  alias(target: IOperand, other: IOperand): void {
    const targetDep = DependencyOpExtension.get(target);
    const otherDep = DependencyOpExtension.get(other);
    targetDep.setConstant(otherDep.constant());
    this.postCmd.push(DepOperand.find(other).aliasTo(target));
  }

  private buildSSA(depRoots: DepOperand[]) {
    const visited = new Set<DepOperand>();
    const toVisit: DepOperand[] = [...depRoots];
    while (toVisit.length > 0) {
      const curDep = toVisit.shift();
      if (visited.has(curDep)) {
        continue;
      }
      visited.add(curDep);
      curDep.forEachSet((deps) => {
        deps.forEach((d) => toVisit.push(d));
      });
    }

    return [...visited];
  }

  serialize(serializer: IDependencySerializer, ...roots: IOperand[]) {
    const depRoots: DepOperand[] = [];
    roots.forEach((r) => depRoots.push(DepOperand.find(r)));
    depRoots.forEach((r) => serializer.addRoot(r));
    const ssa = this.buildSSA(depRoots);
    ssa.forEach((dep) => {
      serializer.newEntry(dep);
      dep.forEachSet((deps, msg) => {
        serializer.newSet(msg);
        deps.forEach((d) => serializer.addDep(d));
        serializer.endSet();
      });
      serializer.endEntry();
    });
  }
}