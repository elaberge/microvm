import { OpKey as DependencyKey, DependencyLog, IDependencyOpExtension, DependencyOpExtension } from "../loggers/dependencylog";
import { IOperand } from "../operands/ioperand";
import { NumberOp } from "../operands/constant";
import { REIL } from "./reil";

export type DepLogFn = REIL.ILogFn<IDependencyOpExtension, DependencyLog>;
export type DepFilter = REIL.IFilter<IDependencyOpExtension>;

export function Filter(a: IOperand, b: IOperand, dst: IOperand): DepFilter {
  return {
    aF: DependencyOpExtension.get(a),
    bF: DependencyOpExtension.get(b),
    dstF: DependencyOpExtension.get(dst),
  };
}

export const PreSet:DepLogFn = {
  incPC: (logger, a, b, dst, aF, bF, dstF) => {
  },

  add: (logger, a, b, dst, aF, bF, dstF) => {
    if (aF.constant() && bF.constant()) {
      dstF.alias(logger, NumberOp(a.get() + b.get()));
    } else if (aF.constant()) {
      if (a.get() == 0)
        dstF.alias(logger, b);
      else
        dstF.link(`+ ${a.get()}`, logger, b);
    } else if (bF.constant()) {
      if (b.get() == 0)
        dstF.alias(logger, a);
      else
        dstF.link(`+ ${b.get()}`, logger, a);
    } else
      dstF.link("+", logger, a, b);
  },

  sub: (logger, a, b, dst, aF, bF, dstF) => {
    if (aF.constant() && bF.constant()) {
      dstF.alias(logger, NumberOp(a.get() - b.get()));
    } else if (aF.constant()) {
      if (a.get() == 0)
        dstF.link(`-`, logger, b);
      else
        dstF.link(`${a.get()} -`, logger, b);
    } else if (bF.constant()) {
      if (b.get() == 0)
        dstF.alias(logger, a);
      else
        dstF.link(`- ${b.get()}`, logger, a);
    } else
      dstF.link("-", logger, a, b);
  },

  mul: (logger, a, b, dst, aF, bF, dstF) => {
    if (aF.constant() && bF.constant()) {
      dstF.alias(logger, NumberOp(a.get() * b.get()));
    } else if (aF.constant()) {
      if (a.get() == 0)
        dstF.alias(logger, NumberOp(0));
      else if (a.get() == 1)
        dstF.alias(logger, b);
      else
        dstF.link(`* ${a.get()}`, logger, b);
    } else if (bF.constant()) {
      if (b.get() == 0)
        dstF.alias(logger, NumberOp(0));
      else if (b.get() == 1)
        dstF.alias(logger, a);
      else
        dstF.link(`* ${b.get()}`, logger, a);
    } else
      dstF.link("*", logger, a, b);
  },

  div: (logger, a, b, dst, aF, bF, dstF) => {
    if (aF.constant() && bF.constant()) {
      dstF.alias(logger, NumberOp(Math.trunc(a.get() / b.get())));
    } else if (aF.constant()) {
      dstF.link(`${a.get()}/`, logger, b);
    } else if (bF.constant()) {
      if (b.get() == 1)
        dstF.alias(logger, a);
      else
        dstF.link(`/${b.get()}`, logger, a);
    } else
      dstF.link("/", logger, a, b);
  },

  mod: (logger, a, b, dst, aF, bF, dstF) => {
    if (aF.constant() && bF.constant()) {
      dstF.alias(logger, NumberOp(a.get() % b.get()));
    } else if (aF.constant()) {
      dstF.link(`${a.get()} mod`, logger, b);
    } else if (bF.constant()) {
      dstF.link(`mod ${b.get()}`, logger, a);
    } else
      dstF.link("mod", logger, a, b);
  },

  bsh: (logger, a, b, dst, aF, bF, dstF) => {
    if (aF.constant() && bF.constant()) {
      if (b.get() > 0)
        dstF.alias(logger, NumberOp(a.get() >> b.get()));
      else
        dstF.alias(logger, NumberOp(a.get() << (-b.get())));
    } else if (aF.constant()) {
      dstF.link(`${a.get()} >>`, logger, b);
    } else if (bF.constant()) {
      if (b.get() == 0)
        dstF.alias(logger, a);
      else
        dstF.link(`>> ${b.get()}`, logger, a);
    } else
      dstF.link(">>", logger, a, b);
  },

  and: (logger, a, b, dst, aF, bF, dstF) => {
    if (aF.constant() && bF.constant()) {
      dstF.alias(logger, NumberOp(a.get() & b.get()));
    } else if (a == b)
      dstF.alias(logger, a);
    else if (aF.constant()) {
      if (a.get() == 0)
        dstF.alias(logger, NumberOp(0));
      else
        dstF.link(`& ${a.get()}`, logger, b);
    }
    else if (bF.constant()) {
      if (b.get() == 0)
        dstF.alias(logger, NumberOp(0));
      else
        dstF.link(`& ${b.get()}`, logger, a);
    } else
      dstF.link("&", logger, a, b);
  },

  or: (logger, a, b, dst, aF, bF, dstF) => {
    if (aF.constant() && bF.constant()) {
      dstF.alias(logger, NumberOp(a.get() | b.get()));
    } else if (a == b)
      dstF.alias(logger, a);
    else if (aF.constant()) {
      if (a.get() == 0)
        dstF.alias(logger, b);
      else
        dstF.link(`| ${a.get()}`, logger, b);
    } else if (bF.constant()) {
      if (b.get() == 0)
        dstF.alias(logger, a);
      else
        dstF.link(`| ${b.get()}`, logger, a);
    } else
      dstF.link("|", logger, a, b);
  },

  xor: (logger, a, b, dst, aF, bF, dstF) => {
    if (aF.constant() && bF.constant()) {
      dstF.alias(logger, NumberOp(a.get() ^ b.get()));
    } else if (a == b)
      dstF.alias(logger, NumberOp(0));
    else if (aF.constant()) {
      if (a.get() == 0)
        dstF.alias(logger, b);
      else
        dstF.link(`^ ${a.get()}`, logger, b);
    } else if (bF.constant()) {
      if (b.get() == 0)
        dstF.alias(logger, a);
      else
        dstF.link(`^ ${b.get()}`, logger, a);
    } else
      dstF.link("^", logger, a, b);
  },

  ldm: (logger, a, mem, dst, aF, memF, dstF) => {
    dstF.alias(logger, mem);
  },

  stm: (logger, a, dst, mem, aF, dstF, memF) => {
    memF.alias(logger, a);
  },

  str: (logger, a, b, dst, aF, bF, dstF) => {
    dstF.alias(logger, a);
  },

  bisz: (logger, a, b, dst, aF, bF, dstF) => {
    if (aF.constant() == false)
      dstF.link("=? 0", logger, a);
    else
      dstF.alias(logger, NumberOp(a.get() == 0 ? 1 : 0));
  },

  jcc_jump: (logger, a, dst, pc, aF, dstF, pcF) => {
    if (aF.constant() == false) {
      pcF.link("jcc (Y)", logger, pc, a);
      logger.branch(true);
    }
  },

  jcc_skip: (logger, a, dst, pc, aF, dstF, pcF) => {
    if (aF.constant() == false) {
      pcF.link("jcc (N)", logger, pc, a);
      logger.branch(false);
    }
  },

  undef: (logger, a, b, dst, aF, bF, dstF) => {
    dstF.link("undef", logger);
  },
};