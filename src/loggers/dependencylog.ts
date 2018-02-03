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
  invalidate(): void;
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

  invalidate() {
    this.op.delete(DepOperand.DepKey);
  }
}

export interface IDepOperand {
  string(): string;
  constant(): boolean;
  special(): boolean;
}

interface IDepEntry {
  message: string;
  dependencies: DepOperand[];
}

class DepMeta implements IDepOperand {
  private static dbgNextId = 0;
  private static constants = new Map<number, DepMeta>();
  static create(op: IOperand) {
    const dep = DependencyOpExtension.get(op);
    const val = op.peek();

    if (dep.constant()) {
      if (DepMeta.constants.has(val) == false) {
        const newMeta = new DepMeta(val, true);
        newMeta._name = op.string();
        DepMeta.constants.set(val, newMeta);
      }
      return DepMeta.constants.get(val);
    }

    const newMeta = new DepMeta(val, false, op.special());
    newMeta._name = op.string();
    return newMeta;
  }

  private depEntry:IDepEntry[] = [];
  private _name:string;

  string() {
    const id = [this._name];
    //if (this.constant())
      id.push(`=${this.value}`);
      //id.push(` [${this.dbgId}]`);
      /*if (this.constant)
        id.push(' K');*/
    //id.push(" ", this.depEntry.signature.toString());
    return id.join("");
  }

  get value() {
    return this._value;
  }

  constant() {
    return this._constant;
  }

  special() {
    return this._special;
  }

  dbgId: number;

  private constructor(private _value: number, private _constant: boolean, private _special: boolean = false) {
    this.dbgId = DepMeta.dbgNextId++;
  }

  addLink(msg: string, deps: DepOperand[]) {
    this.depEntry.push({
      message: msg,
      dependencies: deps,
    });
  }

  forEachSet(cb: (deps: DepOperand[], msg: string) => void) {
    this.depEntry.forEach((dep) => {
      cb(dep.dependencies, dep.message);
    });
  }
}

class DepOperand {
  static DepKey = "DepOperand";

  static find(op: IOperand) {
    let depOp = op.ext<DepOperand>(DepOperand.DepKey);
    if (depOp == undefined) {
      depOp = new DepOperand(DepMeta.create(op));
      op.join(depOp);
    }

    return depOp;
  }

  key = DepOperand.DepKey;

  private _op: IOperand;
  private dep: IDependencyOpExtension;

  private constructor(public meta: DepMeta) {
  }

  get op() { return this._op; }

  set op(v: IOperand) {
    this._op = v;
    this.dep = DependencyOpExtension.get(v);
  }

  aliasTo(target: IOperand):()=>void {
    return () => {
      const newDep = new DepOperand(this.meta);
      target.join(newDep);
    };
  }

  link(msg: string, ...deps: IOperand[]):()=>void {
    const depOps: DepOperand[] = [];
    deps.forEach((o) => {
      depOps.push(DepOperand.find(o));
    });

    return () => {
        const newDep = new DepOperand(DepMeta.create(this.op));
        newDep.meta.addLink(msg, depOps);
        this.op.join(newDep);
      };
  }

  forEachSet(cb: (deps: DepOperand[], msg: string, self: DepOperand) => void) {
    this.meta.forEachSet((deps, msg) => cb(deps, msg, this));
  }
}

class BranchCheckPoint {
  private static entries = new Map<string, BranchCheckPoint>();

  static apply(arch: Arch, taken: boolean, branchDep: IOperand) {
    const s = BranchCheckPoint.signature(arch, taken, branchDep);
    if (BranchCheckPoint.entries.has(s)) {
      return BranchCheckPoint.entries.get(s).apply(arch);
    }

    BranchCheckPoint.entries.set(s, new BranchCheckPoint(arch));
  }

  private static signature(arch: Arch, taken: boolean, branchDep: IOperand) {
    const status = arch.status();
    const items: string[] = [taken.toString()];
    status.forEach((v, k) => {
      items.push(`${k}=${v.peek()}`);
    });
    return items.join(";");
  }

  private metaMap = new Map<IOperand, DepMeta>();

  private constructor(arch: Arch) {
    arch.status().forEach((op) => {
      this.metaMap.set(op, DepOperand.find(op).meta);
    });
  }

  private apply(arch: Arch) {
    arch.status().forEach((op) => {
      DepOperand.find(op).meta = this.metaMap.get(op);
    });
  }
}

export class DependencyLog extends LoggerExtension {
  private postCmd:(()=>void)[] = [];

  constructor(private arch: Arch) {
    super(OpKey);
  }

  branch(taken: boolean, branchDep: IOperand): void {
    BranchCheckPoint.apply(this.arch, taken, branchDep);
  }

  beforeExecute(arch: Arch): void {
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
    depRoots.forEach((r) => serializer.addRoot(r.meta));
    const ssa = this.buildSSA(depRoots);
    ssa.forEach((dep) => {
      serializer.newEntry(dep.meta);
      dep.forEachSet((deps, msg) => {
        serializer.newSet(msg);
        deps.forEach((d) => serializer.addDep(d.meta));
        serializer.endSet();
      });
      serializer.endEntry();
    });
  }
}