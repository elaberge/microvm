import { Z80 as Z80Module } from "../archs/z80";
import { Programs } from "./programs";
import { Z80Programs } from "./z80programs";
import { IOperand } from "../operands/ioperand";
import { NumberOp } from "../operands/constant";

import Z80 = Z80Module.Op;
import Z80Arch = Z80Module.Z80Arch;
import Z80Linker = Z80Programs.Z80Linker;
export type IProgram = Programs.IProgram<Z80Arch>;

/*
  volatile char target;

  int main() {
    gprintf("Trivial");
    while (1) {
      target = 1;

      if (target != 0) {
        gotogxy(4, 4);
        gprintf("END");
        return 0;
      }
      wait_vbl_done();
    }
    return 0;
  }
*/

export const Trivial: IProgram = function () {
  let addr = 0;
  const TargetAddr = NumberOp(addr++);
  const TrivialStrAddr = NumberOp(addr++);
  const EndStrAddr = NumberOp(addr++);

  const memory = [0, 100 /*"Trivial"*/, 999 /*"END"*/];

  return {
    addr: {
      trivialStr: () => memory[TrivialStrAddr.get()],
      endStr: () => memory[EndStrAddr.get()],
    },

    memory: memory,

    program: (z: Z80Arch) => {
      const linker = new Z80Linker(z);

      const prog = [
        linker.label("_main"),
        // gprintf("Trivial")
        Z80.LD(z.HL, TrivialStrAddr),
        Z80.PUSH(z.HL),
        Z80.CALL(linker.link("_gprintf")),
        Z80.ADD(z.SP, NumberOp(1)),
        // while (1) {
        linker.label("00104$"),
        //   target = 1;
        Z80.LD(z.HL, TargetAddr),
        Z80.LD_To_HL(NumberOp(1)),
        //   if (target != 0) {
        Z80.LD_From_HL(z.A),
        Z80.OR(z.A, z.A),
        Z80.JP_Cond(z.Z, linker.link("00102$")),
        //     gotogxy(4, 4);
        Z80.LD(z.HL, NumberOp(0x0404)),
        Z80.PUSH(z.HL),
        Z80.CALL(linker.link("_gotoxy")),
        Z80.ADD(z.SP, NumberOp(1)),
        //     gprintf("END");
        Z80.LD(z.HL, EndStrAddr),
        Z80.PUSH(z.HL),
        Z80.CALL(linker.link("_gprintf")),
        Z80.ADD(z.SP, NumberOp(1)),
        //     return 0;
        //   }
        Z80.LD(z.DE, NumberOp(0)),
        Z80.JP(linker.link("00106$")),
        //   wait_vbl_done()
        linker.label("00102$"),
        Z80.CALL(linker.link("_wait_vbl_done")),
        // }
        Z80.JP(linker.link("00104$")),
        // return 0;
        linker.label("00106$"),
        Z80.RET(),
      ];

      return linker.compile(prog);
    },
  };
}();