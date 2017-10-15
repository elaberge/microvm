import { Arch, ArchConfig } from "../arch";
import { IOperand } from "../operands/ioperand";
import { NumberOp } from "../operands/constant";
import { IInstruction } from "../iinstruction";
import { Register } from "../operands/register";
import { REIL as REILArch } from "./reil";

import REIL = REILArch.Op;

export namespace Z80 {
  export class Z80Arch extends Arch {
    constructor(config: ArchConfig = {}) {
      config.registers = ["A", "B", "C", "DE", "HL", "SP", "Z", "TMP"];
      super(config);
    }

    get A() { return this.getReg("A"); }
    get B() { return this.getReg("B"); }
    get C() { return this.getReg("C"); }
    get DE() { return this.getReg("DE"); }
    get HL() { return this.getReg("HL"); }
    get SP() { return this.getReg("SP"); }
    get PC() { return this.getPCReg(); }
    get Z() { return this.getReg("Z"); }

    get TMP() { return this.getReg("TMP"); }
  }

  function ADD(dst: IOperand, src: IOperand) {
    return (arch: Z80Arch) => {
      return [
        REIL.ADD(dst, src, dst),
        REIL.BISZ(dst, undefined, arch.Z),
      ];
    };
  };

  function ADD_From_HL(dst: IOperand) {
    return (arch: Z80Arch) => {
      return [
        REIL.LDM(arch.HL, undefined, arch.TMP),
        REIL.ADD(dst, arch.TMP, dst),
        REIL.BISZ(dst, undefined, arch.Z),
      ];
    };
  };

  function SUB(dst: IOperand, src: IOperand) {
    return (arch: Z80Arch) => {
      return [
        REIL.SUB(dst, src, dst),
        REIL.BISZ(dst, undefined, arch.Z),
      ];
    };
  };

  function INC_HL() {
    return (arch: Z80Arch) => {
      return [
        REIL.LDM(arch.HL, undefined, arch.TMP),
        REIL.ADD(arch.TMP, NumberOp(1), arch.TMP),
        REIL.BISZ(arch.TMP, undefined, arch.Z),
        REIL.STM(arch.TMP, undefined, arch.HL),
      ];
    };
  };


  function OR(dst: IOperand, src: IOperand) {
    return (arch: Z80Arch) => {
      return [
        REIL.OR(dst, src, dst),
        REIL.BISZ(dst, undefined, arch.Z),
      ];
    };
  };

  function LD(dst: IOperand, src: IOperand) {
    return (arch: Z80Arch) => {
      return [
        REIL.STR(src, undefined, dst),
      ];
    };
  };

  function LDHL(a: IOperand, b: IOperand) {
    return (arch: Z80Arch) => {
      return [
        REIL.ADD(a, b, arch.TMP),
        REIL.STR(arch.TMP, undefined, arch.HL),
      ];
    };
  };

  function LD_To_HL(src: IOperand) {
    return (arch: Z80Arch) => {
      return [
        REIL.STM(src, undefined, arch.HL),
      ];
    };
  };

  function LD_From_HL(dst: IOperand) {
    return (arch: Z80Arch) => {
      return [
        REIL.LDM(arch.HL, undefined, dst),
      ];
    };
  };

  function PUSH(src: IOperand) {
    return (arch: Z80Arch) => {
      return [
        REIL.STM(src, undefined, arch.SP),
        REIL.SUB(arch.SP, NumberOp(1), arch.SP),
      ];
    };
  };

  function POP(dst: IOperand) {
    return (arch: Z80Arch) => {
      return [
        REIL.ADD(arch.SP, NumberOp(1), arch.SP),
        REIL.LDM(arch.SP, undefined, dst),
      ];
    };
  };

  function CALL(addr: IOperand) {
    return (arch: Z80Arch) => {
      return [
        REIL.ADD(arch.PC, NumberOp(4), arch.TMP),
        REIL.STM(arch.TMP, undefined, arch.SP),
        REIL.SUB(arch.SP, NumberOp(1), arch.SP),
        REIL.JCC(NumberOp(1), undefined, addr),
      ];
    };
  };

  function RET() {
    return (arch: Z80Arch) => {
      return [
        REIL.ADD(arch.SP, NumberOp(1), arch.SP),
        REIL.LDM(arch.SP, undefined, arch.TMP),
        REIL.JCC(NumberOp(1), undefined, arch.TMP),
      ];
    };
  }

  function JP_Cond(cond: IOperand, addr: IOperand) {
    return (arch: Z80Arch) => {
      return [
        REIL.JCC(cond, undefined, addr),
      ];
    };
  };

  function JP_NotCond(cond: IOperand, addr: IOperand) {
    return (arch: Z80Arch) => {
      return [
        REIL.BISZ(cond, undefined, arch.TMP),
        REIL.JCC(arch.TMP, undefined, addr),
      ];
    };
  };

  function JP(addr: IOperand) {
    return (arch: Z80Arch) => {
      return [
        REIL.JCC(NumberOp(1), undefined, addr),
      ];
    };
  };

  function BIT(val: number, src: IOperand) {
    return (arch: Z80Arch) => {
      return [
        REIL.BSH(src, NumberOp(val), arch.TMP),
        REIL.AND(arch.TMP, NumberOp(1), arch.TMP),
        REIL.BISZ(arch.TMP, undefined, arch.Z),
      ];
    };
  };

  function STOP() {
    return (arch: Z80Arch) => {
      return [
        REIL.UNKN(undefined, undefined, undefined),
      ];
    }
  }

  export const Op = {
    ADD: ADD,
    ADD_From_HL: ADD_From_HL,
    SUB: SUB,
    INC_HL: INC_HL,
    OR: OR,
    LD: LD,
    LDHL: LDHL,
    LD_To_HL: LD_To_HL,
    LD_From_HL: LD_From_HL,
    PUSH: PUSH,
    POP: POP,
    CALL: CALL,
    RET: RET,
    JP_Cond: JP_Cond,
    JP_NotCond: JP_NotCond,
    JP: JP,
    BIT: BIT,
    STOP: STOP,
  }
}