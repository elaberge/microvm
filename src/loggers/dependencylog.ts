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
  dependencies: DepMeta[];
}

class DepMeta implements IDepOperand {
  private static nextId = 0;
  private static constants = new Map<number, DepMeta>();

  static reset() {
    DepMeta.nextId = 0;
    DepMeta.constants.clear();
  }

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

    const newMeta = new DepMeta(val, false, op.special(), op);
    newMeta._name = op.string();
    return newMeta;
  }

  private depEntry:IDepEntry[] = [];
  private _name:string;

  string() {
    const id = [this._name];
    id.push(`=${this.value}`);
    //id.push(` [${this.uniqueId}]`);
    //if (this.constant())
    //    id.push(' K');
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

  uniqueId: number;

  private constructor(private _value: number, private _constant: boolean, private _special: boolean = false, private op: IOperand = undefined) {
    this.uniqueId = DepMeta.nextId++;
  }

  addLink(msg: string, deps: DepMeta[]) {
    this.depEntry.push({
      message: msg,
      dependencies: deps,
    });
  }

  match(other: DepMeta, ...roots: IOperand[]): boolean {
    roots.push(other.op);

    if (this === other)
      return true;

    if (this.constant() != other.constant()) {
      //console.log(`Constancy mismatch ${this.string()} and ${other.string()}`);
      return false;
    }

    if (this.constant()) {
      if (this.value != other.value) {
        //console.log(`Constant mismatch ${this.value} (${this.string()}) and ${other.value} (${other.string()})`);
      }
      return this.value == other.value;
    }

    if (this.depEntry.length == 0 && other.depEntry.length == 0) {
      if (this.value != other.value) {
        //console.log(`Variable mismatch ${this.value} (${this.string()}) and ${other.value} (${other.string()})`);
      }
      return this.value == other.value;
    }

    if (this.op) {
      for (const r of roots) {
        if (this.op === r)
          return true;
      }
    }

    return this.matchDepEntries(other.depEntry, roots);
  }

  *sets(): IterableIterator<IDepEntry> {
    for (const dep of this.depEntry) {
      yield dep;
    }
  }

  private matchDepEntries(otherEntries: IDepEntry[], roots: IOperand[]) {
    if (this.depEntry.length != otherEntries.length)
      return false;

    let found = 0;
    for (const entry of this.depEntry) {
      for (const other of otherEntries) {
        if (DepMeta.matchDepEntry(entry, other, roots)) {
          found++;
          break;
        }
      }
    }

    return found == this.depEntry.length;
  }

  private static matchDepEntry(a: IDepEntry, b: IDepEntry, roots: IOperand[]) {
    if (a.dependencies.length != b.dependencies.length)
      return false;

    let found = 0;
    for (const first of a.dependencies) {
      for (const second of b.dependencies) {
        if (first.match(second, ...roots)) {
          found++;
          break;
        }
      }
    }
    return found = a.dependencies.length;
  }
}

interface ISetIterator extends IDepEntry {
  self: DepOperand;
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
    const depOps: DepMeta[] = [];
    for (const o of deps) {
      depOps.push(DepOperand.find(o).meta);
    }

    return () => {
        const newDep = new DepOperand(DepMeta.create(this.op));
        newDep.meta.addLink(msg, depOps);
        this.op.join(newDep);
      };
  }

  *sets(): IterableIterator<ISetIterator> {
    for (const dep of this.meta.sets()) {
      yield {
        message: dep.message,
        dependencies: dep.dependencies,
        self: this,
      };
    }
  }
}

class BranchCheckPoint {
  private static entries = new Map<number, BranchCheckPoint[]>();

  static reset() {
    BranchCheckPoint.entries.clear();
  }

  static apply(arch: Arch, taken: boolean, branchDep: IOperand, dirty: Set<IOperand>) {
    const pc = arch.getPCReg().peek();
    if (BranchCheckPoint.entries.has(pc) == false)
      BranchCheckPoint.entries.set(pc, []);

    const exactMatch = BranchCheckPoint.findExact(pc, arch);
    if (exactMatch) {
      //console.log('EXACT MATCH', BranchCheckPoint.debugSignature(arch, taken, dirty), 'WITH', exactMatch.debugSignature(dirty) )
      exactMatch.apply(arch);
      return;
    }

    /*
    const partialMatch = BranchCheckPoint.find(pc, arch, taken, branchDep, dirty);
    if (partialMatch) {
      console.log('PARTIAL MATCH', BranchCheckPoint.debugSignature(arch, taken, dirty), 'WITH', partialMatch.debugSignature(dirty))
      partialMatch.apply(arch);
    } else {
      console.log('NO MATCH', BranchCheckPoint.debugSignature(arch, taken, dirty))
    }
    */

    BranchCheckPoint.entries.get(pc).push(new BranchCheckPoint(arch));
  }

  private static debugSignature(arch: Arch, taken: boolean, dirty: Set<IOperand>): string {
    const vals: string[] = [];
    for (const [name, op] of arch.status()) {
      if (dirty.has(op) == false)
        continue;
      const meta = DepOperand.find(op).meta;
      //if (meta.value != 0)
        vals.push(`${name}=${meta.value}[${meta.uniqueId}]`);
    }
    return vals.join(';') + taken;
  }

  private debugSignature(dirty: Set<IOperand>): string {
    const vals: string[] = [];
    for (const [op, meta] of this.metaMap) {
      if (dirty.has(op))
        vals.push(`${op.string()}=${meta.value}[${meta.uniqueId}]`);
    }
    return vals.join(';');
  }

  private static find(pc: number, arch: Arch, taken: boolean, branchDep: IOperand, dirty: Set<IOperand>) {
    for (const entry of BranchCheckPoint.entries.get(pc)) {
      let found = true;
      for (const op of entry.filterRecent(dirty)) {
        const meta = DepOperand.find(op).meta;
        const branchMeta = entry.metaMap.get(op);
        if (!branchMeta)
          continue;
        if (meta.match(branchMeta) == false) {
          found = false;
          break;
        }
      }

      if (found)
        return entry;
    }
  }

  private filterRecent(dirty:Set<IOperand>) {
    let newest = -1;
    for (const [op, meta] of this.metaMap) {
      if (meta.uniqueId > newest)
        newest = meta.uniqueId;
    }

    const filtered: IOperand[] = [];
    function recurFilter(meta: DepMeta): boolean {
      if (meta.uniqueId <= newest)
        return true;
      for (const dep of meta.sets()) {
        for (const d of dep.dependencies) {
          if (recurFilter(d))
            return true;
        }
      }
      return false;
    }

    for (const op of dirty) {
      if (recurFilter(DepOperand.find(op).meta))
        filtered.push(op);
    }
    return filtered;
  }

  private static findExact(pc: number, arch: Arch) {
    const status = arch.status();

    for (const entry of BranchCheckPoint.entries.get(pc)) {
      let found = true;
      for (const [name, op] of status) {
        const meta = DepOperand.find(op).meta;
        const branchMeta = entry.metaMap.get(op);
        if (meta.match(branchMeta) == false) {
          found = false;
          break;
        }
      }

      if (found)
        return entry;
    }
  }

  private metaMap = new Map<IOperand, DepMeta>();

  private constructor(arch: Arch) {
    for (const [name, op] of arch.status()) {
      this.metaMap.set(op, DepOperand.find(op).meta);
    }
  }

  private apply(arch: Arch) {
    //const pc = arch.getPCReg();
    //DepOperand.find(pc).meta = this.metaMap.get(pc);
    for (const [name, op] of arch.status()) {
      DepOperand.find(op).meta = this.metaMap.get(op);
    };
  }
}

export class DependencyLog extends LoggerExtension {
  private postCmd:(()=>void)[] = [];
  private dirty = new Set<IOperand>();

  constructor(private arch: Arch) {
    super(OpKey);
    DepMeta.reset();
    BranchCheckPoint.reset();
  }

  branch(taken: boolean, branchDep: IOperand): void {
    BranchCheckPoint.apply(this.arch, taken, branchDep, this.dirty);
    this.dirty.clear();
  }

  beforeExecute(arch: Arch): void {
  }

  afterExecute(arch: Arch, running: boolean): void {
    for (const f of this.postCmd) {
      f();
    }
    this.postCmd.length = 0;
  }

  link(msg: string, dst: IOperand, ...src: IOperand[]): void {
    for (const s of src) {
      this.dirty.add(s);
    }
    this.postCmd.push(DepOperand.find(dst).link(msg, ...src));
  }

  alias(target: IOperand, other: IOperand): void {
    this.dirty.add(other);
    const targetDep = DependencyOpExtension.get(target);
    const otherDep = DependencyOpExtension.get(other);
    targetDep.setConstant(otherDep.constant());
    this.postCmd.push(DepOperand.find(other).aliasTo(target));
  }

  private buildSSA(depRoots: DepOperand[]) {
    const visited = new Set<DepMeta>();
    const toVisit: DepMeta[] = [];
    for (const d of depRoots) {
      toVisit.push(d.meta);
    }

    while (toVisit.length > 0) {
      const curDep = toVisit.shift();
      if (visited.has(curDep)) {
        continue;
      }
      visited.add(curDep);
      for (const deps of curDep.sets()) {
        for (const d of deps.dependencies) {
          toVisit.push(d);
        }
      }
    }

    return [...visited];
  }

  serialize(serializer: IDependencySerializer, ...roots: IOperand[]) {
    const depRoots: DepOperand[] = [];
    for (const r of roots) {
      depRoots.push(DepOperand.find(r));
    }
    for (const r of depRoots) {
      serializer.addRoot(r.meta);
    }
    const ssa = this.buildSSA(depRoots);
    for (const dep of ssa) {
      serializer.newEntry(dep);
      for (const deps of dep.sets()) {
        serializer.newSet(deps.message);
        for (const d of deps.dependencies) {
          serializer.addDep(d);
        }
        serializer.endSet();
      }
      serializer.endEntry();
    }
  }
}